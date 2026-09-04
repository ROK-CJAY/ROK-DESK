import { useEffect, useRef, useState } from "react";
import { parseTomFiles, withVgcSampleTrainers, detectTomGameKind, splitTomReportsByDivision, titleForTomDivision } from "@/lib/tom-reports";
import { isTomTitle, isVgcTitle, playAgeDivisionOf, playDivisionsFor, TOM_TITLE_IDS, tomTitleOf, type TomTitleId } from "@/lib/games";
import { parseTomTdf, looksLikeTomTdf, resolveTomTdfGame } from "@/lib/tom-tdf";
import {
  canWatchTomFolder,
  clearDirectoryHandle,
  ensureDirectoryRead,
  loadDirectoryHandle,
  loadReportPick,
  pickTomReportsDirectory,
  queryDirectoryRead,
  readTomReportSet,
  saveReportPick,
  sameTomDirectory,
  tomWatchIntervalMs,
  type TomWatchSet,
} from "@/lib/tom-folder-watch";
import { useTournamentStore } from "@/lib/tournament-store";
import { deskForGame, viewTournament } from "@/lib/tournament-types";
import { TomReportsView } from "@/components/tournament/tom-reports-view";

function tomKindLabel(id: TomTitleId): string {
  const family = isVgcTitle(id) ? "VGC" : "PTCG";
  const division = playAgeDivisionOf(id);
  if (!division) return family;
  return `${family} ${division[0]!.toUpperCase()}${division.slice(1)}`;
}

function emptyTomWatch<T>(value: T): Record<TomTitleId, T> {
  return Object.fromEntries(TOM_TITLE_IDS.map((id) => [id, value])) as Record<TomTitleId, T>;
}

export function TomReportsPanel() {
  const t = useTournamentStore((s) => s.tournament);
  const applyTom = useTournamentStore((s) => s.applyTom);
  const applyTomTdf = useTournamentStore((s) => s.applyTomTdf);
  const patch = useTournamentStore((s) => s.patch);
  const setGame = useTournamentStore((s) => s.setGame);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [detail, setDetail] = useState("");
  const [drag, setDrag] = useState(false);
  const [tdfStatus, setTdfStatus] = useState("");
  const [tomGame, setTomGame] = useState<TomTitleId>(() => tomTitleOf(t.gameId));
  const [watchStatus, setWatchStatus] = useState<Record<TomTitleId, "off" | "on" | "need-gesture">>(() =>
    emptyTomWatch("off"),
  );
  const [folderNames, setFolderNames] = useState<Record<TomTitleId, string>>(() => emptyTomWatch(""));
  const [watchSets, setWatchSets] = useState<Record<TomTitleId, TomWatchSet[]>>(() =>
    Object.fromEntries(TOM_TITLE_IDS.map((id) => [id, [] as TomWatchSet[]])) as Record<TomTitleId, TomWatchSet[]>,
  );
  const [watchPick, setWatchPick] = useState<Record<TomTitleId, string | null>>(() => emptyTomWatch(null));
  const dirRefs = useRef<Partial<Record<TomTitleId, FileSystemDirectoryHandle>>>({});
  const tomGameRef = useRef(tomGame);
  tomGameRef.current = tomGame;

  useEffect(() => {
    if (!isTomTitle(t.gameId)) return;
    const next = t.gameId;
    setTomGame((prev) => (prev === next ? prev : next));
  }, [t.gameId]);

  const live = tomGame === t.gameId ? t : viewTournament(t, tomGame);
  const vgc = isVgcTitle(tomGame);
  const tomDivision = playAgeDivisionOf(tomGame) ?? "masters";
  const tomDivisions = playDivisionsFor(tomGame);
  const watchSupported = canWatchTomFolder();
  const watch = watchStatus[tomGame];
  const folderName = folderNames[tomGame];
  const sets = watchSets[tomGame] ?? [];
  const selectedDir = watchPick[tomGame];

  const selectWatchSet = (dir: string | null) => {
    setWatchPick((prev) => ({ ...prev, [tomGame]: dir }));
    void saveReportPick(dir, tomGame);
  };

  const patchTom = (partial: Partial<typeof t>) => {
    if (t.gameId === tomGame) {
      patch(partial);
      return;
    }
    const desk = { ...deskForGame(t, tomGame), ...partial };
    patch({ desks: { ...t.desks, [tomGame]: desk } });
  };

  const useTitle = (id: typeof tomGame) => {
    setTomGame(id);
    if (t.gameId !== id) setGame(id);
  };

  const ingest = (files: { name: string; html: string }[], viaWatch = false, game = tomGameRef.current) => {
    try {
      const reports = parseTomFiles(files);
      const html = files.map((f) => f.html).join("\n");
      const kind = detectTomGameKind(`${reports.eventName}\n${html}`);
      if (kind === "go") {
        setStatus("err");
        setDetail("Those TOM reports are Pokémon GO. Desk only imports Trading Card Game (PTCG) and Video Game (VGC).");
        return;
      }
      const slices = splitTomReportsByDivision(reports);
      const applied: string[] = [];
      for (const slice of slices) {
        if (!slice.reports.players.length && !slice.reports.pairings.length) continue;
        const target = titleForTomDivision(slice.division, game, kind);
        applyTom(isVgcTitle(target) ? withVgcSampleTrainers(slice.reports) : slice.reports, target);
        applied.push(
          `${tomKindLabel(target)} ${slice.reports.players.length} player${slice.reports.players.length === 1 ? "" : "s"}${
            slice.swissHost !== slice.division ? ` (Swiss with ${slice.swissHost})` : ""
          }`,
        );
      }
      if (applied.length === 1) {
        const only = titleForTomDivision(slices[0]!.division, game, kind);
        const crossFamily = only.includes("vgc") !== game.includes("vgc");
        if (!crossFamily && only !== tomGameRef.current) setTomGame(only);
      }
      const tables = reports.pairings.length;
      setStatus("ok");
      setDetail(
        [
          viaWatch ? "Watch" : null,
          kind === "vg" ? "Video Game" : kind === "tcg" ? "Trading Card Game" : null,
          reports.eventName || null,
          reports.roundLabel || null,
          applied.join(" · ") || `${reports.players.length} players`,
          tables ? `${tables} tables` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Imported",
      );
    } catch (err) {
      setStatus("err");
      setDetail(err instanceof Error ? err.message : "Could not read those reports.");
    }
  };

  const fromList = async (list: FileList | File[]) => {
    const files = [...list];
    const tdfs = files.filter((f) => looksLikeTomTdf(f.name, "") || /\.tdf$/i.test(f.name));
    const htmls = files.filter((f) => /\.html?$|\.htm$/i.test(f.name) || f.type.includes("html"));
    if (!tdfs.length && !htmls.length) {
      setStatus("err");
      setDetail("Drop a TOM .tdf or roster / pairings / standings HTML.");
      return;
    }
    try {
      if (tdfs[0]) {
        const parsed = parseTomTdf(await tdfs[0].text());
        const fallback = resolveTomTdfGame(parsed, tomGame);
        const kind: "tcg" | "vg" | "go" | "unknown" = isVgcTitle(parsed.gameId) ? "vg" : "tcg";
        const slices = splitTomReportsByDivision({
          eventName: parsed.name,
          roundLabel: "",
          currentRound: 0,
          totalRounds: 0,
          players: parsed.players,
          pairings: [],
        });
        const applied: string[] = [];
        for (const slice of slices) {
          const gameId = titleForTomDivision(slice.division, fallback, kind);
          applyTomTdf({ ...parsed, players: slice.reports.players, gameId });
          applied.push(`${tomKindLabel(gameId)} ${slice.reports.players.length}`);
        }
        if (slices.length === 1) setTomGame(titleForTomDivision(slices[0]!.division, fallback, kind));
        setStatus("ok");
        setDetail(`${parsed.name} · ${applied.join(" · ")} from ${tdfs[0].name}`);
      }
      if (htmls.length) {
        const rows = await Promise.all(htmls.map(async (file) => ({ name: file.name, html: await file.text() })));
        ingest(rows);
      }
    } catch (err) {
      setStatus("err");
      setDetail(err instanceof Error ? err.message : "Could not read those files.");
    }
  };

  const startWatch = async (handle: FileSystemDirectoryHandle, game = tomGame) => {
    dirRefs.current[game] = handle;
    setFolderNames((prev) => ({ ...prev, [game]: handle.name }));
    setWatchStatus((prev) => ({ ...prev, [game]: "on" }));
  };

  const pickWatchFolder = async () => {
    try {
      const dir = await pickTomReportsDirectory(tomGame);
      const ok = await ensureDirectoryRead(dir);
      if (!ok) {
        setStatus("err");
        setDetail("Need permission to read that folder.");
        return;
      }
      await startWatch(dir, tomGame);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("err");
      setDetail(err instanceof Error ? err.message : "Could not open that folder.");
    }
  };

  const resumeWatch = async () => {
    const dir = dirRefs.current[tomGame];
    if (!dir) return;
    const ok = await ensureDirectoryRead(dir);
    if (!ok) {
      setStatus("err");
      setDetail("Need permission to read that folder.");
      return;
    }
    await startWatch(dir, tomGame);
  };

  const stopWatch = () => {
    setWatchStatus((prev) => ({ ...prev, [tomGame]: "off" }));
    delete dirRefs.current[tomGame];
    setFolderNames((prev) => ({ ...prev, [tomGame]: "" }));
    void clearDirectoryHandle(tomGame);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!canWatchTomFolder()) return;
      for (const game of TOM_TITLE_IDS) {
        const handle = await loadDirectoryHandle(game);
        if (!handle || cancelled) continue;
        dirRefs.current[game] = handle;
        setFolderNames((prev) => ({ ...prev, [game]: handle.name }));
        const savedPick = await loadReportPick(game);
        if (cancelled) return;
        setWatchPick((prev) => ({ ...prev, [game]: savedPick }));
        const perm = await queryDirectoryRead(handle);
        if (cancelled) return;
        setWatchStatus((prev) => ({ ...prev, [game]: perm === "granted" ? "on" : "need-gesture" }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const active = TOM_TITLE_IDS.filter((game) => watchStatus[game] === "on");
    if (!active.length) return;
    let alive = true;
    const last: Partial<Record<TomTitleId, string>> = {};
    const pending: Partial<Record<TomTitleId, string>> = {};
    const tick = async () => {
      const seen: FileSystemDirectoryHandle[] = [];
      for (const game of active) {
        const dir = dirRefs.current[game];
        if (!dir || !alive) continue;
        let skip = false;
        for (const prev of seen) {
          if (await sameTomDirectory(prev, dir)) {
            skip = true;
            break;
          }
        }
        if (skip) continue;
        seen.push(dir);
        const selected = tomGameRef.current;
        const selectedDir = dirRefs.current[selected];
        const fallback = (await sameTomDirectory(selectedDir, dir)) ? selected : game;
        try {
          const deskName = deskForGame(useTournamentStore.getState().tournament, fallback).name;
          const preferKind = isVgcTitle(fallback) ? "vg" : "tcg";
          const { files, fingerprint: fp, sets: found } = await readTomReportSet(dir, {
            preferDir: watchPick[fallback] ?? watchPick[game],
            preferName: deskName,
            preferKind,
          });
          if (!alive) return;
          setWatchSets((prev) => {
            const next = { ...prev, [game]: found };
            if (fallback !== game) next[fallback] = found;
            return next;
          });
          if (!fp) {
            const other = found.find((s) => s.gameKind === "vg" || s.gameKind === "tcg");
            if (other && other.gameKind !== preferKind) {
              setStatus("ok");
              setDetail(
                `${other.eventName || "That TOM event"} is ${other.gameKind === "vg" ? "Video Game" : "Trading Card Game"}. ${isVgcTitle(fallback) ? "VGC" : "PTCG"} only pulls ${preferKind === "vg" ? "VG" : "TCG"} reports — switch the TOM card or open that Game Type in TOM.`,
              );
            }
            continue;
          }
          if (!last[game]) {
            pending[game] = fp;
          } else if (fp !== pending[game]) {
            pending[game] = fp;
            continue;
          }
          if (fp === last[game]) continue;
          if (!files.length) continue;
          ingest(
            files.map((f) => ({ name: f.name, html: f.html })),
            true,
            fallback,
          );
          last[game] = fp;
          pending[game] = fp;
        } catch (err) {
          if (!alive) return;
          setStatus("err");
          setDetail(err instanceof Error ? err.message : "Could not read the TOM folder.");
        }
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), tomWatchIntervalMs());
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [watchStatus, watchPick]);

  if (!isTomTitle(t.gameId)) return null;

  return (
    <TomReportsView
      live={live}
      tomGame={tomGame}
      vgc={vgc}
      tomDivision={tomDivision}
      tomDivisions={tomDivisions}
      watchSupported={watchSupported}
      watch={watch}
      folderName={folderName}
      watchSets={sets}
      watchDir={selectedDir}
      onWatchDir={selectWatchSet}
      status={status}
      detail={detail}
      tdfStatus={tdfStatus}
      setTdfStatus={setTdfStatus}
      setStatus={setStatus}
      setDetail={setDetail}
      drag={drag}
      setDrag={setDrag}
      inputRef={inputRef}
      patchTom={patchTom}
      useTitle={useTitle}
      ingest={ingest}
      fromList={fromList}
      pickWatchFolder={pickWatchFolder}
      resumeWatch={resumeWatch}
      stopWatch={stopWatch}
      tomKindLabel={tomKindLabel}
    />
  );
}
