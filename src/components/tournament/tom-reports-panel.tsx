import { useEffect, useRef, useState } from "react";
import { parseTomFiles, withVgcSampleTrainers } from "@/lib/tom-reports";
import { isTomTitle, isVgcTitle, playAgeDivisionOf, playDivisionsFor, TOM_TITLE_IDS, tomTitleOf, type TomTitleId } from "@/lib/games";
import { parseTomTdf, looksLikeTomTdf, resolveTomTdfGame } from "@/lib/tom-tdf";
import {
  canWatchTomFolder,
  clearDirectoryHandle,
  ensureDirectoryRead,
  fingerprintTomReports,
  loadDirectoryHandle,
  pickTomReportSet,
  pickTomReportsDirectory,
  queryDirectoryRead,
  readTomReportSet,
  listTomHtmlFiles,
  tomWatchIntervalMs,
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
      applyTom(isVgcTitle(game) ? withVgcSampleTrainers(reports) : reports, game);
      const tables = reports.pairings.length;
      const players = reports.players.length;
      setStatus("ok");
      setDetail(
        [
          viaWatch ? "Watch" : null,
          tomKindLabel(game),
          reports.roundLabel || null,
          players ? `${players} players` : null,
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
        const gameId = resolveTomTdfGame(parsed, tomGame);
        applyTomTdf({ ...parsed, gameId });
        setTomGame(gameId);
        setStatus("ok");
        setDetail(`${tomKindLabel(gameId)} · ${parsed.players.length} players from ${tdfs[0].name}`);
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
      for (const game of active) {
        const dir = dirRefs.current[game];
        if (!dir || !alive) continue;
        try {
          const listed = await listTomHtmlFiles(dir);
          const picked = pickTomReportSet(listed);
          const fp = fingerprintTomReports(picked);
          if (!fp) continue;
          if (!last[game]) {
            pending[game] = fp;
          } else if (fp !== pending[game]) {
            pending[game] = fp;
            continue;
          }
          if (fp === last[game]) continue;
          const { files } = await readTomReportSet(dir);
          if (!alive || !files.length) continue;
          ingest(
            files.map((f) => ({ name: f.name, html: f.html })),
            true,
            game,
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
  }, [watchStatus]);

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
