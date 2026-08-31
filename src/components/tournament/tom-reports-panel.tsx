import { useEffect, useRef, useState } from "react";
import { Download, FolderOpen, Pause, Trash2, Upload } from "lucide-react";
import { Field } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseTomFiles, sampleTomFiles, hasTomSample, withVgcSampleTrainers } from "@/lib/tom-reports";
import { downloadTomTdf, looksLikeTomTdf, parseTomTdf } from "@/lib/tom-tdf";
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
import { cn } from "@/lib/cn";
import type { GameId } from "@/lib/games";

const TOM_GAMES: { id: Extract<GameId, "pokemon-tcg" | "pokemon-vgc">; label: string; note: string }[] = [
  { id: "pokemon-tcg", label: "PTCG", note: "Trading Card Game" },
  { id: "pokemon-vgc", label: "VGC", note: "Video Game" },
];

export function TomReportsPanel() {
  const t = useTournamentStore((s) => s.tournament);
  const applyTom = useTournamentStore((s) => s.applyTom);
  const applyTomTdf = useTournamentStore((s) => s.applyTomTdf);
  const clearTom = useTournamentStore((s) => s.clearTom);
  const patch = useTournamentStore((s) => s.patch);
  const setGame = useTournamentStore((s) => s.setGame);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [detail, setDetail] = useState("");
  const [drag, setDrag] = useState(false);
  const [tdfStatus, setTdfStatus] = useState("");
  const [tomGame, setTomGame] = useState<Extract<GameId, "pokemon-tcg" | "pokemon-vgc">>(
    t.gameId === "pokemon-vgc" ? "pokemon-vgc" : "pokemon-tcg",
  );
  const [watchStatus, setWatchStatus] = useState<Record<"pokemon-tcg" | "pokemon-vgc", "off" | "on" | "need-gesture">>({
    "pokemon-tcg": "off",
    "pokemon-vgc": "off",
  });
  const [folderNames, setFolderNames] = useState<Record<"pokemon-tcg" | "pokemon-vgc", string>>({
    "pokemon-tcg": "",
    "pokemon-vgc": "",
  });
  const dirRefs = useRef<Partial<Record<"pokemon-tcg" | "pokemon-vgc", FileSystemDirectoryHandle>>>({});
  const tomGameRef = useRef(tomGame);
  tomGameRef.current = tomGame;

  const live = tomGame === t.gameId ? t : viewTournament(t, tomGame);
  const vgc = tomGame === "pokemon-vgc";
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
      applyTom(game === "pokemon-vgc" ? withVgcSampleTrainers(reports) : reports, game);
      const tables = reports.pairings.length;
      const players = reports.players.length;
      setStatus("ok");
      setDetail(
        [
          viaWatch ? "Watch" : null,
          game === "pokemon-vgc" ? "VGC" : "PTCG",
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
        applyTomTdf(parsed);
        setTomGame(parsed.gameId);
        setStatus("ok");
        setDetail(
          `${parsed.gameId === "pokemon-vgc" ? "VGC" : "PTCG"} · ${parsed.players.length} players from ${tdfs[0].name}`,
        );
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
      for (const game of ["pokemon-tcg", "pokemon-vgc"] as const) {
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
    const active = (["pokemon-tcg", "pokemon-vgc"] as const).filter((game) => watchStatus[game] === "on");
    if (!active.length) return;
    let alive = true;
    const last: Partial<Record<"pokemon-tcg" | "pokemon-vgc", string>> = {};
    const pending: Partial<Record<"pokemon-tcg" | "pokemon-vgc", string>> = {};
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

  const exportTdf = () => {
    try {
      if (t.gameId !== tomGame) setGame(tomGame);
      const source = useTournamentStore.getState().tournament;
      const result = downloadTomTdf(source.gameId === tomGame ? source : viewTournament(source, tomGame));
      if (!result.included) {
        setTdfStatus("Every player needs a Play! Pokémon Player ID before TOM will take them.");
        return;
      }
      const skip = result.skipped.length ? ` Skipped ${result.skipped.length} without a Player ID.` : "";
      const kind = tomGame === "pokemon-vgc" ? "VIDEO_GAME" : "TRADING_CARD_GAME";
      setTdfStatus(`Saved ${result.filename} (${kind}) · ${result.included} players.${skip} Open it in TOM (File → Open).`);
    } catch {
      setTdfStatus("Could not download. Try the TDF link in the note below.");
    }
  };

  const withId = live.entrants.filter((e) => !e.dropped && /\d{5,}/.test(e.playerId)).length;
  const sampleLoaded = hasTomSample(live);
  const tomTables = live.matches.some((m) => m.id.startsWith("tom-"));

  const clearImported = () => {
    if (t.gameId !== tomGame) setGame(tomGame);
    if (sampleLoaded) {
      clearTom("sample");
      setStatus("idle");
      setDetail("");
      return;
    }
    if (!window.confirm("Remove TOM tables from this title? Players stay unless you empty the roster.")) return;
    clearTom("tables");
    setStatus("idle");
    setDetail("");
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">TOM</p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Play! Pokémon only — PTCG and VGC each keep their own organizer, roster, tables, and watch folder. Sign up here, export a <span className="text-fg">.tdf</span> TOM can open, then drop HTML reports back in for stream. Desk does not write results into TOM.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {TOM_GAMES.map((g) => (
          <Button
            key={g.id}
            size="sm"
            variant={tomGame === g.id ? "default" : "outline"}
            className={cn(tomGame === g.id && "pointer-events-none")}
            onClick={() => useTitle(g.id)}
          >
            {g.label}
            <span className="font-sans font-normal text-[0.65rem] text-subtle"> {g.note}</span>
          </Button>
        ))}
      </div>

      <p className="font-mono mt-4 text-[0.62rem] tracking-[0.16em] text-muted uppercase">Export for TOM</p>
      <div className="mt-2 grid gap-2">
        <Field label="Organizer name">
          <Input
            value={live.tomOrganizerName}
            onChange={(e) => patchTom({ tomOrganizerName: e.target.value })}
            placeholder="As in Play! Pokémon"
          />
        </Field>
        <Field label="Organizer Player ID">
          <Input
            value={live.tomOrganizerPopId}
            onChange={(e) => patchTom({ tomOrganizerPopId: e.target.value })}
            placeholder="popid"
            inputMode="numeric"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="City">
            <Input value={live.tomCity} onChange={(e) => patchTom({ tomCity: e.target.value })} placeholder="miami" />
          </Field>
          <Field label="State">
            <Input value={live.tomState} onChange={(e) => patchTom({ tomState: e.target.value })} placeholder="fl" />
          </Field>
        </div>
        <Field label="Country">
          <Input
            value={live.tomCountry}
            onChange={(e) => patchTom({ tomCountry: e.target.value })}
            placeholder="United States"
          />
        </Field>
        <Field label="Start date">
          <Input
            value={live.tomStartDate}
            onChange={(e) => patchTom({ tomStartDate: e.target.value })}
            placeholder="MM/DD/YYYY"
          />
        </Field>
        <Button size="sm" onClick={exportTdf} disabled={!live.entrants.length}>
          <Download className="size-3.5" />
          Export {vgc ? "VGC" : "PTCG"} TDF
        </Button>
        <p className="text-[0.65rem] text-subtle">
          {withId} of {live.entrants.filter((e) => !e.dropped).length} {vgc ? "VGC" : "PTCG"} players have a Player ID.
          {vgc ? " In-game trainer name goes in the TDF when set on the team sheet." : ""}
          {" "}
          <a href="/api/tournament/tdf" className="underline underline-offset-2">
            Direct download
          </a>
        </p>
        {tdfStatus ? <p className="mt-0 text-[0.7rem] text-muted">{tdfStatus}</p> : null}
      </div>

      <p className="font-mono mt-4 text-[0.62rem] tracking-[0.16em] text-muted uppercase">Import reports</p>
      <div
        className={`mt-2 rounded-lg border border-dashed px-3 py-3 text-center text-xs ${drag ? "border-live bg-live/10 text-fg" : "border-border bg-surface-2 text-muted"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void fromList(e.dataTransfer.files);
        }}
      >
        Drop a <span className="text-fg">.tdf</span>, <span className="text-fg">roster.html</span>,{" "}
        <span className="text-fg">pairings.html</span>, or <span className="text-fg">standings.html</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,.tdf,text/html,application/xml,text/xml"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) void fromList(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
          <Upload className="size-3.5" />
          Choose files
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => ingest(sampleTomFiles())}
        >
          Load {vgc ? "VGC" : "PTCG"} sample
        </Button>
      </div>
      {watchSupported ? (
        <div className="mt-2 grid gap-2">
          {watch === "on" ? (
            <Button size="sm" variant="outline" onClick={stopWatch}>
              <Pause className="size-3.5" />
              Stop watching {folderName || "folder"}
            </Button>
          ) : watch === "need-gesture" ? (
            <Button size="sm" variant="secondary" onClick={() => void resumeWatch()}>
              <FolderOpen className="size-3.5" />
              Resume watch {folderName || "folder"}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => void pickWatchFolder()}>
              <FolderOpen className="size-3.5" />
              Watch TOM reports folder
            </Button>
          )}
          <p className="text-[0.65rem] text-subtle">
            {watch === "on"
              ? `Watching ${folderName} for ${vgc ? "VGC" : "PTCG"}. TOM writes pairings.html — Desk imports onto this title only.`
              : `Pick a ${vgc ? "VGC" : "PTCG"} TOM_DATA or data/reports folder. PTCG and VGC watches stay separate.`}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[0.65rem] text-subtle">
          Folder watch needs Chrome, Edge, or ROK Desk desktop. Drop files here otherwise.
        </p>
      )}
      {sampleLoaded || tomTables ? (
        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={clearImported}>
          <Trash2 className="size-3.5" />
          {sampleLoaded ? `Clear ${vgc ? "VGC" : "PTCG"} sample` : "Clear TOM tables"}
        </Button>
      ) : null}
      {status === "ok" ? <p className="mt-2 text-[0.7rem] text-ok">{detail}</p> : null}
      {status === "err" ? <p className="mt-2 text-[0.7rem] text-live">{detail}</p> : null}
      {live.matches.some((m) => m.id.startsWith("tom-")) ? (
        <p className="mt-2 text-[0.65rem] text-subtle">
          Pairings came from TOM. Report slips in TOM. Use Send on a table to put it on stream.
        </p>
      ) : null}
    </section>
  );
}
