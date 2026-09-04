import { Download, FolderOpen, Pause, Trash2, Upload } from "lucide-react";
import { Field, NativeSelect } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sampleTomFiles, hasTomSample } from "@/lib/tom-reports";
import { isVgcTitle, ptcgGameIdFor, vgcGameIdFor, type TomTitleId } from "@/lib/games";
import { downloadTomTdf } from "@/lib/tom-tdf";
import { useTournamentStore } from "@/lib/tournament-store";
import { viewTournament, type TournamentState } from "@/lib/tournament-types";
import { tomWatchSetTitle, type TomWatchSet } from "@/lib/tom-folder-watch";
import { cn } from "@/lib/cn";

export function TomReportsView({
  live,
  tomGame,
  vgc,
  tomDivision,
  tomDivisions,
  watchSupported,
  watch,
  folderName,
  watchSets,
  watchDir,
  onWatchDir,
  status,
  detail,
  tdfStatus,
  setTdfStatus,
  setStatus,
  setDetail,
  drag,
  setDrag,
  inputRef,
  patchTom,
  useTitle,
  ingest,
  fromList,
  pickWatchFolder,
  resumeWatch,
  stopWatch,
  tomKindLabel,
}: {
  live: TournamentState;
  tomGame: TomTitleId;
  vgc: boolean;
  tomDivision: "masters" | "seniors" | "juniors";
  tomDivisions: { id: string; gameId: string; label: string }[];
  watchSupported: boolean;
  watch: "off" | "on" | "need-gesture";
  folderName: string;
  watchSets: TomWatchSet[];
  watchDir: string | null;
  onWatchDir: (dir: string | null) => void;
  status: "idle" | "ok" | "err";
  detail: string;
  tdfStatus: string;
  setTdfStatus: (v: string) => void;
  setStatus: (v: "idle" | "ok" | "err") => void;
  setDetail: (v: string) => void;
  drag: boolean;
  setDrag: (v: boolean) => void;
  inputRef: { current: HTMLInputElement | null };
  patchTom: (partial: Partial<TournamentState>) => void;
  useTitle: (id: TomTitleId) => void;
  ingest: (files: { name: string; html: string }[]) => void;
  fromList: (list: FileList | File[]) => void;
  pickWatchFolder: () => void;
  resumeWatch: () => void;
  stopWatch: () => void;
  tomKindLabel: (id: TomTitleId) => string;
}) {
  const t = useTournamentStore((s) => s.tournament);
  const setGame = useTournamentStore((s) => s.setGame);
  const clearTom = useTournamentStore((s) => s.clearTom);

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
      const kind = isVgcTitle(tomGame) ? "VIDEO_GAME" : "TRADING_CARD_GAME";
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
        Play! Pokémon — PTCG and VGC each run Masters, Seniors, and Juniors as their own event. Each keeps organizer, roster, tables, and watch folder. Sign up here, export a <span className="text-fg">.tdf</span> TOM can open, then drop HTML reports back in for stream. Desk does not write results into TOM.
      </p>
      <div className="mt-3 grid gap-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="sm"
            variant={isVgcTitle(tomGame) ? "outline" : "default"}
            className={cn(!isVgcTitle(tomGame) && "pointer-events-none")}
            onClick={() => useTitle(ptcgGameIdFor(tomDivision) as TomTitleId)}
          >
            PTCG
          </Button>
          <Button
            size="sm"
            variant={isVgcTitle(tomGame) ? "default" : "outline"}
            className={cn(isVgcTitle(tomGame) && "pointer-events-none")}
            onClick={() => useTitle(vgcGameIdFor(tomDivision) as TomTitleId)}
          >
            VGC
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {tomDivisions.map((d) => (
            <Button
              key={d.id}
              size="sm"
              variant={tomGame === d.gameId ? "default" : "outline"}
              className={cn("px-2", tomGame === d.gameId && "pointer-events-none")}
              onClick={() => useTitle(d.gameId as TomTitleId)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-5">
        <div>
          <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Export for TOM</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Field label="Organizer name">
              <Input value={live.tomOrganizerName} onChange={(e) => patchTom({ tomOrganizerName: e.target.value })} placeholder="As in Play! Pokémon" />
            </Field>
            <Field label="Organizer Player ID">
              <Input value={live.tomOrganizerPopId} onChange={(e) => patchTom({ tomOrganizerPopId: e.target.value })} placeholder="popid" inputMode="numeric" />
            </Field>
            <Field label="City">
              <Input value={live.tomCity} onChange={(e) => patchTom({ tomCity: e.target.value })} placeholder="miami" />
            </Field>
            <Field label="State">
              <Input value={live.tomState} onChange={(e) => patchTom({ tomState: e.target.value })} placeholder="fl" />
            </Field>
            <Field label="Country">
              <Input value={live.tomCountry} onChange={(e) => patchTom({ tomCountry: e.target.value })} placeholder="United States" />
            </Field>
            <Field label="Start date">
              <Input value={live.tomStartDate} onChange={(e) => patchTom({ tomStartDate: e.target.value })} placeholder="MM/DD/YYYY" />
            </Field>
          </div>
          <Button size="sm" className="mt-2" onClick={exportTdf} disabled={!live.entrants.length}>
            <Download className="size-3.5" />
            Export {tomKindLabel(tomGame)} TDF
          </Button>
          <p className="mt-2 text-[0.65rem] text-subtle">
            {withId} of {live.entrants.filter((e) => !e.dropped).length} {tomKindLabel(tomGame)} players have a Player ID.
            {vgc ? " In-game trainer name goes in the TDF when set on the team sheet." : ""}{" "}
            <a href="/api/tournament/tdf" className="underline underline-offset-2">Direct download</a>
          </p>
          {tdfStatus ? <p className="mt-1 text-[0.7rem] text-muted">{tdfStatus}</p> : null}
        </div>
        <div>
          <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Import reports</p>
          <div
            className={`mt-2 rounded-lg border border-dashed px-3 py-5 text-center text-xs ${drag ? "border-live bg-live/10 text-fg" : "border-border bg-surface-2 text-muted"}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); void fromList(e.dataTransfer.files); }}
          >
            Drop a <span className="text-fg">.tdf</span>, <span className="text-fg">roster.html</span>,{" "}
            <span className="text-fg">pairings.html</span>, or <span className="text-fg">standings.html</span>
          </div>
          <input ref={inputRef} type="file" accept=".html,.htm,.tdf,text/html,application/xml,text/xml" multiple className="sr-only" onChange={(e) => { if (e.target.files?.length) void fromList(e.target.files); e.target.value = ""; }} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              <Upload className="size-3.5" />
              Choose files
            </Button>
            <Button size="sm" variant="outline" onClick={() => ingest(sampleTomFiles())}>
              Load {tomKindLabel(tomGame)} sample
            </Button>
            {watchSupported ? (
              watch === "on" ? (
                <Button size="sm" variant="outline" onClick={stopWatch}><Pause className="size-3.5" />Stop watching {folderName || "folder"}</Button>
              ) : watch === "need-gesture" ? (
                <Button size="sm" variant="secondary" onClick={() => void resumeWatch()}><FolderOpen className="size-3.5" />Resume watch {folderName || "folder"}</Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => void pickWatchFolder()}><FolderOpen className="size-3.5" />Watch TOM reports folder</Button>
              )
            ) : null}
          </div>
          {watchSupported ? (
            <div className="mt-2 grid gap-2">
              {watch === "on" ? (
                <Field label="Tournament in that folder">
                  {watchSets.length ? (
                    <NativeSelect
                      value={watchDir == null ? "__auto__" : watchDir === "" ? "__root__" : watchDir}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__auto__") onWatchDir(null);
                        else if (v === "__root__") onWatchDir("");
                        else onWatchDir(v);
                      }}
                    >
                      <option value="__auto__">Newest reports (auto)</option>
                      {watchSets.map((set) => (
                        <option key={set.dir || "__root__"} value={set.dir === "" ? "__root__" : set.dir}>
                          {tomWatchSetTitle(set)}
                          {set.label && set.eventName ? `  ·  ${set.label}` : ""}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted">
                      No pairings.html / standings.html / roster.html in this folder yet.
                    </p>
                  )}
                </Field>
              ) : null}
              {watch === "on" && watchSets[0] ? (
                <p className="text-xs text-fg">
                  Pulling {tomWatchSetTitle(watchSets.find((s) => s.dir === (watchDir ?? s.dir)) ?? watchSets[0])}
                  {watchDir == null ? " (auto)" : ""}
                </p>
              ) : null}
              <p className="text-[0.65rem] text-subtle">
                {watch === "on"
                  ? watchSets.length
                    ? `Watching ${folderName} for ${tomKindLabel(tomGame)}. TOM only writes pairings for the event that is open — in TOM, open that tournament, then File → Reports → Pairings / Standings. If this folder has more than one report set, pick it above. VG cup reports land on VGC; TCG reports land on PTCG. Seniors / Juniors follow the event name.`
                    : `Watching ${folderName} for ${tomKindLabel(tomGame)}. No pairings.html / standings.html / roster.html yet. Open the tournament in TOM and generate those reports.`
                  : `Pick a ${tomKindLabel(tomGame)} TOM_DATA or data/reports folder. Each PTCG division and VGC watch stays separate. TOM writes reports for the event that is open in TOM.`}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[0.65rem] text-subtle">Folder watch needs Chrome, Edge, or ROK Desk desktop. Drop files here otherwise.</p>
          )}
          {sampleLoaded || tomTables ? (
            <Button size="sm" variant="outline" className="mt-2" onClick={clearImported}>
              <Trash2 className="size-3.5" />
              {sampleLoaded ? `Clear ${tomKindLabel(tomGame)} sample` : "Clear TOM tables"}
            </Button>
          ) : null}
          {status === "ok" ? <p className="mt-2 text-[0.7rem] text-ok">{detail}</p> : null}
          {status === "err" ? <p className="mt-2 text-[0.7rem] text-live">{detail}</p> : null}
          {live.matches.some((m) => m.id.startsWith("tom-")) ? (
            <p className="mt-2 text-[0.65rem] text-subtle">Pairings came from TOM. Report slips in TOM. Use Send on a table to put it on stream.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
