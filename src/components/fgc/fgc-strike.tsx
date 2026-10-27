import { useEffect, useRef, useState } from "react";
import { resolveStage } from "@/lib/fgc-assets";
import type { StationView } from "@/lib/fgc-station";
import { FgcGuideButton } from "@/components/fgc/fgc-guide";
import { blankPlayer, blankSet, libraryFor, playerLabel, type FgcRuleset, type FgcSet } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { startggAuthBody } from "@/lib/startgg-link";

type Snap = {
  game: number;
  step: number;
  player: number;
  rps: boolean;
  strikes: string[][];
  by: [string[], string[]];
  scores: [number, number];
  won: [string[], string[]];
  played: string[];
  games: { winner: number; stage: string }[];
  selected: string | null;
  gentleman: boolean;
  lastWinner: number;
};

function fresh(): Snap {
  return {
    game: 0,
    step: 0,
    player: 0,
    rps: false,
    strikes: [[]],
    by: [[], []],
    scores: [0, 0],
    won: [[], []],
    played: [],
    games: [],
    selected: null,
    gentleman: false,
    lastWinner: -1,
  };
}

function clone(snap: Snap): Snap {
  return {
    ...snap,
    strikes: snap.strikes.map((row) => [...row]),
    by: [[...snap.by[0]], [...snap.by[1]]],
    scores: [...snap.scores] as [number, number],
    won: [[...snap.won[0]], [...snap.won[1]]],
    played: [...snap.played],
    games: snap.games.map((game) => ({ ...game })),
  };
}

function banTarget(ruleset: FgcRuleset, bestOf: number, game: number, step: number) {
  if (game === 0) return ruleset.strikeOrder[step] ?? 0;
  if (ruleset.banMode === "byGames") {
    const row = ruleset.bansByGames.split(",").map((part) => part.split(":").map((item) => item.trim())).find(([games]) => Number(games) === bestOf);
    if (row) return Number(row[1]) || 0;
  }
  return ruleset.banCount || 0;
}

function readStation() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("station")?.trim() || "";
}

function stationSet(view: StationView | null): FgcSet | null {
  const set = view?.set;
  if (!set) return null;
  return {
    ...blankSet(),
    id: set.id,
    phase: set.phase,
    round: set.round,
    bestOf: set.bestOf || 3,
    p1: blankPlayer({ id: set.p1.id, tag: set.p1.name }),
    p2: blankPlayer({ id: set.p2.id, tag: set.p2.name }),
  };
}

export function FgcStrike() {
  const stationId = useState(readStation)[0];
  const hydrate = useFgcStore((s) => s.hydrate);
  const reload = useFgcStore((s) => s.reload);
  const fgc = useFgcStore((s) => s.fgc);
  const patchSet = useFgcStore((s) => s.patchSet);
  const [station, setStation] = useState<StationView | null>(null);
  const [stationError, setStationError] = useState("");
  const [history, setHistory] = useState<Snap[]>([fresh()]);
  const [cursor, setCursor] = useState(0);
  const [note, setNote] = useState("");
  const heldSet = useRef("");
  useEffect(() => {
    if (stationId) return;
    hydrate();
    const timer = window.setInterval(reload, 1000);
    return () => window.clearInterval(timer);
  }, [hydrate, reload, stationId]);
  useEffect(() => {
    if (!stationId) return;
    let stop = false;
    const pull = async () => {
      try {
        const res = await fetch("/api/startgg", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "station", stationId }),
        });
        const body = (await res.json()) as StationView & { error?: string };
        if (stop) return;
        if (!res.ok) {
          setStationError(body.error || "Could not load this station.");
          return;
        }
        setStationError("");
        setStation((current) => {
          if (!body.set && current?.set && heldSet.current === current.set.id) return { ...body, set: current.set };
          if (body.set && body.set.id !== heldSet.current) heldSet.current = "";
          return body;
        });
      } catch {
        if (!stop) setStationError("Could not load this station.");
      }
    };
    void pull();
    const timer = window.setInterval(() => void pull(), 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [stationId]);

  const ruleset = stationId ? station?.ruleset ?? null : fgc.rulesets.find((item) => item.id === fgc.activeRulesetId) ?? fgc.rulesets[0] ?? null;
  const set = stationId ? stationSet(station) : fgc.sets.find((item) => item.id === fgc.streamSetId) ?? null;
  const library = libraryFor(fgc);
  const names = [playerLabel(set?.p1 ?? null) || "Player 1", playerLabel(set?.p2 ?? null) || "Player 2"];
  const bestOf = set?.bestOf || 3;
  const needed = Math.ceil(bestOf / 2);
  const snap = history[cursor] ?? fresh();

  useEffect(() => {
    setHistory([fresh()]);
    setCursor(0);
    setNote("");
  }, [set?.id, ruleset?.id]);

  const commit = (next: Snap) => {
    const base = history.slice(0, cursor + 1);
    base.push(next);
    setHistory(base);
    setCursor(base.length - 1);
  };

  const struck = snap.strikes.flat();
  const dsr = ruleset?.dsr === "dsr" ? snap.played : ruleset?.dsr === "mdsr" && snap.lastWinner >= 0 ? snap.won[(snap.lastWinner + 1) % 2] ?? [] : [];
  const target = ruleset ? banTarget(ruleset, bestOf, snap.game, snap.step) : 0;
  const currentBans = snap.strikes[snap.step] ?? [];
  const won = snap.scores[0] >= needed || snap.scores[1] >= needed;
  const phase = won ? "done" : !snap.rps && snap.game === 0 ? "rps" : snap.selected ? "report" : snap.gentleman || (snap.game > 0 && (snap.step > 0 || target === 0)) ? "pick" : "ban";

  const art = (name: string) => {
    if (stationId) return station?.art[name] || "";
    const stage = library?.stages.find((item) => item.name.localeCompare(name, undefined, { sensitivity: "base" }) === 0);
    return stage && library ? resolveStage(fgc.assetBase, library.code, stage.code) : "";
  };
  const bannedBy = (name: string) => (snap.by[0].includes(name) ? names[0] : snap.by[1].includes(name) ? names[1] : "");

  const clickStage = (name: string) => {
    if (!ruleset || phase === "done" || phase === "rps" || phase === "report") return;
    if (phase === "pick") {
      if (!snap.gentleman && (dsr.includes(name) || struck.includes(name))) return;
      const next = clone(snap);
      next.selected = name;
      commit(next);
      return;
    }
    if (dsr.includes(name) || struck.some((stage) => stage === name && !currentBans.includes(stage))) return;
    const next = clone(snap);
    const row = next.strikes[next.step] ?? [];
    next.strikes[next.step] = row;
    if (row.includes(name)) {
      next.strikes[next.step] = row.filter((stage) => stage !== name);
      next.by[next.player] = next.by[next.player].filter((stage) => stage !== name);
    } else if (row.length < target) {
      row.push(name);
      next.by[next.player].push(name);
    }
    commit(next);
  };

  const confirmBans = () => {
    if (!ruleset || currentBans.length !== target) return;
    const next = clone(snap);
    next.step += 1;
    next.player = (next.player + 1) % 2;
    next.strikes.push([]);
    if (next.game === 0 && next.step >= ruleset.strikeOrder.length) {
      next.selected = ruleset.neutralStages.find((stage) => !next.strikes.flat().includes(stage)) ?? null;
    }
    commit(next);
  };

  const startWith = (player: number) => {
    const next = clone(snap);
    next.rps = true;
    next.player = player;
    next.lastWinner = player;
    commit(next);
  };

  const report = (winner: number) => {
    if (!set || !snap.selected) return;
    const next = clone(snap);
    next.scores[winner] += 1;
    next.won[winner].push(snap.selected);
    next.played.push(snap.selected);
    next.games.push({ winner, stage: snap.selected });
    next.lastWinner = winner;
    const finished = next.scores[winner] >= needed;
    if (!stationId) {
      patchSet(set.id, useFgcStore.getState().fgc.settings.strikeScores
        ? { score1: next.scores[0], score2: next.scores[1], stage: snap.selected, state: finished ? "done" : "live" }
        : { stage: snap.selected, state: finished ? "done" : "live" });
    }
    const games = next.games.map((game) => ({
      winnerId: game.winner === 0 ? set.p1?.id : set.p2?.id,
      stage: game.stage,
    }));
    if (finished) {
      next.selected = snap.selected;
      commit(next);
      const winnerId = winner === 0 ? set.p1?.id : set.p2?.id;
      if (stationId && winnerId) {
        heldSet.current = set.id;
        void fetch("/api/startgg", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "station-report",
            stationId,
            setId: set.id,
            winnerId,
            score1: next.scores[0],
            score2: next.scores[1],
            stage: snap.selected,
            games,
          }),
        }).then(async (res) => {
          const body = (await res.json()) as { error?: string };
          setNote(res.ok ? "Games, stages, and characters sent to start.gg." : body.error || "start.gg was not updated.");
        }).catch(() => setNote("start.gg was not updated."));
      } else if (winnerId) {
        void fetch("/api/startgg", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "report",
            setId: set.id,
            winnerId,
            score1: next.scores[0],
            score2: next.scores[1],
            stage: snap.selected,
            games,
            entrant1: set.p1?.id,
            entrant2: set.p2?.id,
            character1: set.p1?.character,
            character2: set.p2?.character,
            ...startggAuthBody(),
          }),
        }).then(async (res) => {
          const body = (await res.json()) as { error?: string };
          setNote(res.ok ? "Games, stages, and characters sent to start.gg." : body.error || "Score is on the scoreboard. start.gg was not updated.");
        }).catch(() => setNote("Score is on the scoreboard. start.gg was not updated."));
      }
      return;
    }
    next.game += 1;
    next.step = 0;
    next.player = winner;
    next.selected = null;
    next.gentleman = false;
    next.strikes = [[]];
    next.by = [[], []];
    const nextBans = ruleset ? banTarget(ruleset, bestOf, next.game, 0) : 0;
    if (nextBans === 0) next.step = 1;
    commit(next);
  };

  const restartGame = () => {
    const next = clone(snap);
    next.step = 0;
    next.strikes = [[]];
    next.by = [[], []];
    next.selected = null;
    next.gentleman = false;
    next.player = next.game === 0 ? (next.lastWinner < 0 ? 0 : next.lastWinner) : next.lastWinner;
    commit(next);
  };

  const restartAll = () => {
    if (set && !stationId && useFgcStore.getState().fgc.settings.strikeScores) patchSet(set.id, { score1: 0, score2: 0, stage: "", state: "pending" });
    heldSet.current = "";
    commit(fresh());
    setNote("");
  };

  const title = stationId
    ? [station?.station?.name, set?.phase, set?.round].filter(Boolean).join(" · ") || "Station"
    : [set?.phase, set?.round].filter(Boolean).join(" / ") || "No match on the scoreboard";
  const prompt = phase === "ban"
    ? `${names[snap.player]}, ban ${target} stage${target === 1 ? "" : "s"}`
    : phase === "pick"
      ? `${names[snap.player]}, pick the stage`
      : "";

  if (stationId && !set) {
    return (
      <div className="grid min-h-dvh place-items-center bg-black px-6 text-center text-white">
        <FgcGuideButton kind="strike" className="fixed top-3 right-3 text-white hover:bg-white/10" />
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Stage strike</p>
          <h1 className="mt-3 text-4xl font-semibold">{station?.station?.name || "Station"}</h1>
          <p className="mt-4 text-xl text-white/80">{stationError || "Waiting for a set on this station."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-black px-6 py-8 text-white">
      <FgcGuideButton kind="strike" className="fixed top-3 right-3 text-white hover:bg-white/10" />
      <header className="text-center">
        <h1 className="text-3xl font-semibold">{title} / Game {snap.game + 1}</h1>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{snap.scores[0]} - {snap.scores[1]}</p>
        {set ? <p className="mt-1 text-sm text-white/50">{names[0]} vs {names[1]} · Best of {bestOf}{ruleset ? ` · ${ruleset.name}` : ""}</p> : <p className="mt-2 text-sm text-rose-300">Pull a set onto the scoreboard first.</p>}
        {station?.fallback ? <p className="mt-2 text-sm text-amber-200">Using the event stage list. Save a ruleset in Production to use its bans and counterpicks.</p> : null}
        {prompt ? <p className="mt-4 text-2xl font-semibold text-rose-400">{prompt}</p> : null}
        {phase === "report" ? <p className="mt-4 text-2xl font-semibold">Report results</p> : null}
      </header>

      {phase === "done" ? (
        <div className="grid flex-1 place-items-center text-center">
          <div>
            <p className="text-5xl font-semibold uppercase">{names[snap.scores[0] >= needed ? 0 : 1]} wins</p>
            <p className="mx-auto mt-4 max-w-xl text-xl text-white/80">Awaiting next match. Contact production or the tournament organizer. Do not begin your match.</p>
            {note ? <p className="mt-3 text-sm text-white/50">{note}</p> : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex flex-wrap justify-center gap-3">
            {(snap.game === 0 ? ruleset?.neutralStages ?? [] : ruleset?.neutralStages ?? []).map((name) => (
              <StageCard key={name} name={name} image={art(name)} by={bannedBy(name)} banned={struck.includes(name) || dsr.includes(name)} selected={snap.selected === name} onClick={() => clickStage(name)} />
            ))}
          </div>
          {snap.game > 0 ? (
            <div className="flex flex-wrap justify-center gap-3">
              {(ruleset?.counterpickStages ?? []).map((name) => (
                <StageCard key={name} name={name} image={art(name)} by={bannedBy(name)} banned={struck.includes(name) || dsr.includes(name)} selected={snap.selected === name} onClick={() => clickStage(name)} />
              ))}
            </div>
          ) : null}
          {phase === "ban" && currentBans.length === target && target > 0 ? (
            <button type="button" className="mt-2 rounded-md border border-white/30 px-6 py-2 text-sm uppercase" onClick={confirmBans}>Confirm</button>
          ) : null}
          {phase === "report" ? (
            <div className="mt-6 flex w-full max-w-3xl justify-between gap-6">
              <button type="button" className="h-14 flex-1 rounded-full bg-rose-500 text-lg font-semibold uppercase" onClick={() => report(0)}>{names[0]} won</button>
              <button type="button" className="h-14 flex-1 rounded-full bg-sky-500 text-lg font-semibold uppercase" onClick={() => report(1)}>{names[1]} won</button>
            </div>
          ) : null}
        </div>
      )}

      <footer className="mx-auto flex flex-wrap justify-center gap-3">
        <FooterButton label="Undo" disabled={cursor === 0} onClick={() => setCursor((value) => Math.max(0, value - 1))} />
        <FooterButton label="Redo" disabled={cursor >= history.length - 1} onClick={() => setCursor((value) => Math.min(history.length - 1, value + 1))} />
        <FooterButton label="Restart game" disabled={phase === "rps"} onClick={restartGame} />
        <FooterButton label="Gentleman's pick" disabled={phase === "done" || phase === "rps"} onClick={() => { const next = clone(snap); next.gentleman = !next.gentleman; next.selected = null; commit(next); }} />
        <FooterButton label="Restart all" onClick={restartAll} />
      </footer>

      {phase === "rps" && set && ruleset ? (
        <div className="fixed inset-0 grid place-items-center bg-black/70 p-6">
          <div className="w-full max-w-md rounded-lg bg-neutral-800 p-6 text-center">
            <h2 className="text-left text-lg font-semibold">Stage strike</h2>
            <p className="mt-3 text-left text-sm text-white/80">Play rock-paper-scissors to decide who starts the stage strike, or use the randomize button.</p>
            <p className="mt-4 text-lg">Rock-paper-scissors</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button type="button" className="h-12 rounded-md bg-rose-500 font-semibold uppercase" onClick={() => startWith(0)}>{names[0]} won</button>
              <button type="button" className="h-12 rounded-md bg-sky-500 font-semibold uppercase" onClick={() => startWith(1)}>{names[1]} won</button>
            </div>
            <button type="button" className="mt-3 h-12 w-full rounded-md border border-emerald-500 font-semibold uppercase text-emerald-400" onClick={() => startWith(Math.random() < 0.5 ? 0 : 1)}>Randomize</button>
          </div>
        </div>
      ) : null}
      {!ruleset ? <p className="mt-4 text-center text-sm text-rose-300">{stationId ? "Save a ruleset in Production, or add stages on the event." : "Pick a ruleset in FGC Control first."}</p> : null}
    </div>
  );
}

function StageCard({ name, image, by, banned, selected, onClick }: { name: string; image: string; by: string; banned: boolean; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`w-36 overflow-hidden rounded-md border bg-neutral-950 text-left ${selected ? "border-emerald-400 shadow-[0_0_0_2px_#34d399]" : "border-white/70"}`}>
      <span className="relative block h-24 bg-neutral-900">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
        {by ? <span className="absolute top-1 left-1 rounded bg-black/75 px-1 text-[0.6rem] font-semibold uppercase">{by}</span> : null}
        {banned && !selected ? <span className="absolute inset-0 grid place-items-center text-3xl font-bold text-rose-500">✕</span> : null}
        {selected ? <span className="absolute inset-0 grid place-items-center"><span className="grid size-8 place-items-center rounded-full bg-emerald-500 text-lg">✓</span></span> : null}
      </span>
      <span className="block truncate px-2 py-1 text-center text-xs font-semibold uppercase">{name}</span>
    </button>
  );
}

function FooterButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="h-12 min-w-36 rounded-md border border-sky-900 px-4 text-sm font-semibold uppercase enabled:hover:bg-white/5 disabled:opacity-40">
      {label}
    </button>
  );
}
