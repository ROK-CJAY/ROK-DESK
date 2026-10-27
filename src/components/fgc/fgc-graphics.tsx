import { useEffect, type ReactNode } from "react";
import { stageIconUrl } from "@/lib/fgc-assets";
import { libraryFor, playerLabel, type FgcPlayer, type FgcSet, type FgcState } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { FgcHud } from "@/components/overlays/fgc-hud";
import { liveSet, type FgcOverlayId } from "@/lib/fgc-titles";

function useLiveFgc() {
  const hydrate = useFgcStore((s) => s.hydrate);
  const reload = useFgcStore((s) => s.reload);
  const fgc = useFgcStore((s) => s.fgc);
  useEffect(() => {
    hydrate();
    const timer = window.setInterval(reload, 1000);
    return () => window.clearInterval(timer);
  }, [hydrate, reload]);
  return fgc;
}

function Plate({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md bg-black/80 text-white shadow-lg ${className}`}>{children}</div>;
}

function characterIcon(fgc: FgcState, name: string) {
  if (!name) return "";
  return libraryFor(fgc)?.characters.find((item) => item.name === name)?.icon || "";
}

function playersIn(sets: FgcSet[]): FgcPlayer[] {
  const seen = new Set<string>();
  const players: FgcPlayer[] = [];
  for (const set of sets) {
    for (const player of [set.p1, set.p2, set.p1b, set.p2b]) {
      if (!player?.tag || seen.has(player.id)) continue;
      seen.add(player.id);
      players.push(player);
    }
  }
  return players;
}

function records(sets: FgcSet[]) {
  const rows = new Map<string, { player: FgcPlayer; wins: number; losses: number }>();
  for (const set of sets) {
    const sides = [
      [set.p1, set.score1, set.score2],
      [set.p2, set.score2, set.score1],
    ] as const;
    for (const [player, score, other] of sides) {
      if (!player?.tag) continue;
      const row = rows.get(player.id) ?? { player, wins: 0, losses: 0 };
      if (score > other) row.wins += 1;
      else if (other > score) row.losses += 1;
      rows.set(player.id, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.player.tag.localeCompare(b.player.tag));
}

function finished(sets: FgcSet[]) {
  return sets.filter((set) => set.state === "done" || set.score1 !== set.score2);
}

function versusMode(id: string, game: string) {
  if (id === "versus-tekken") return "tekken";
  if (id === "versus-pokken") return "pokken";
  const name = game.toLowerCase();
  if (name.includes("tekken")) return "tekken";
  if (name.includes("pokken") || name.includes("pokkén")) return "pokken";
  return "smash";
}

function PlayerSide({ fgc, player, align }: { fgc: FgcState; player: FgcPlayer | null; align: "left" | "right" }) {
  const icon = characterIcon(fgc, player?.character || "");
  const right = align === "right";
  return (
    <div className={right ? "text-right" : "text-left"}>
      {icon ? <img src={icon} alt="" className={`mb-4 h-40 w-40 object-contain ${right ? "ml-auto" : ""}`} /> : null}
      <p className="font-mono text-lg tracking-wide text-white/70 uppercase">{[player?.flag, player?.prefix].filter(Boolean).join(" ")}</p>
      <p className="font-display text-6xl leading-none font-semibold uppercase">{playerLabel(player)}</p>
      <p className="mt-3 font-mono text-xl tracking-wide text-white/80 uppercase">{player?.character || "Player"}</p>
    </div>
  );
}

function Versus({ id }: { id: string }) {
  const fgc = useLiveFgc();
  const set = liveSet(fgc);
  const mode = versusMode(id, fgc.event?.game || "");
  const meta = [fgc.event?.name, set?.round, set?.bestOf ? `Bo${set.bestOf}` : ""].filter(Boolean).join(" · ");
  if (mode === "tekken") {
    return (
      <div className="relative grid h-full grid-cols-2">
        <div className="flex items-end bg-black/55 p-12"><PlayerSide fgc={fgc} player={set?.p1 ?? null} align="left" /></div>
        <div className="flex items-end justify-end bg-red-950/40 p-12"><PlayerSide fgc={fgc} player={set?.p2 ?? null} align="right" /></div>
        <p className="absolute top-10 left-1/2 -translate-x-1/2 font-mono text-sm tracking-[0.28em] text-white/80 uppercase">{meta || "Tekken"}</p>
      </div>
    );
  }
  if (mode === "pokken") {
    return (
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center px-16">
        <PlayerSide fgc={fgc} player={set?.p1 ?? null} align="left" />
        <p className="font-display px-8 text-7xl font-semibold">VS</p>
        <PlayerSide fgc={fgc} player={set?.p2 ?? null} align="right" />
      </div>
    );
  }
  return (
    <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-8 px-16">
      <PlayerSide fgc={fgc} player={set?.p1 ?? null} align="left" />
      <div className="text-center">
        <p className="font-mono text-sm tracking-[0.28em] text-white/70 uppercase">{meta || "Versus"}</p>
        <p className="font-display mt-3 text-8xl font-semibold">VS</p>
      </div>
      <PlayerSide fgc={fgc} player={set?.p2 ?? null} align="right" />
    </div>
  );
}

function Scoreboard({ style }: { style: "simple" | "topleft" | "4by3" }) {
  const fgc = useLiveFgc();
  const set = liveSet(fgc);
  const row = (player: FgcPlayer | null, score: number) => (
    <div className="flex items-center justify-between gap-6">
      <span className="truncate font-display text-3xl font-semibold uppercase">{playerLabel(player)}</span>
      <span className="font-display text-4xl font-semibold tabular-nums">{score}</span>
    </div>
  );
  const body = (
    <Plate className="grid gap-2 px-5 py-3">
      <p className="font-mono text-[0.65rem] tracking-[0.2em] text-white/60 uppercase">{[set?.phase, set?.round, set?.stage].filter(Boolean).join(" · ") || fgc.event?.game || "Scoreboard"}</p>
      {row(set?.p1 ?? null, set?.score1 ?? 0)}
      {row(set?.p2 ?? null, set?.score2 ?? 0)}
    </Plate>
  );
  if (style === "topleft") return <div className="p-8">{body}</div>;
  if (style === "4by3") return <div className="flex h-full items-end justify-center pb-8"><div className="w-[75%]">{body}</div></div>;
  return <div className="flex h-full items-end px-8 pb-6">{body}</div>;
}

function columnsFor(sets: FgcSet[], losers: boolean | null) {
  const filtered = sets.filter((set) => {
    const text = `${set.phase} ${set.round}`.toLowerCase();
    const isLosers = text.includes("loser");
    if (losers === null) return true;
    return losers ? isLosers : !isLosers;
  });
  const groups = new Map<string, FgcSet[]>();
  for (const set of filtered) {
    const key = set.round || set.phase || "Sets";
    groups.set(key, [...(groups.get(key) ?? []), set]);
  }
  return [...groups.entries()];
}

function Bracket({ ultimate }: { ultimate: boolean }) {
  const fgc = useLiveFgc();
  const bands = ultimate
    ? [{ name: "Winners", columns: columnsFor(fgc.sets, false) }, { name: "Losers", columns: columnsFor(fgc.sets, true) }]
    : [{ name: "", columns: columnsFor(fgc.sets, null) }];
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-6">
      <p className="font-display text-3xl font-semibold uppercase">{fgc.event?.name || "Bracket"}</p>
      {bands.map((band) => (
        <div key={band.name || "all"} className="min-h-0 flex-1">
          {band.name ? <p className="mb-2 font-mono text-xs tracking-[0.2em] text-white/60 uppercase">{band.name}</p> : null}
          <div className="flex h-full gap-3 overflow-hidden">
            {band.columns.slice(0, 8).map(([name, rows]) => (
              <div key={name} className="w-56 shrink-0">
                <p className="mb-2 font-mono text-[0.65rem] tracking-wide text-white/50 uppercase">{name}</p>
                <div className="grid gap-2">
                  {rows.slice(0, 8).map((set) => (
                    <Plate key={set.id} className="px-2 py-1.5 text-sm">
                      <p className="truncate uppercase">{playerLabel(set.p1)} <span className="text-white/40">{set.score1}</span></p>
                      <p className="truncate uppercase">{playerLabel(set.p2)} <span className="text-white/40">{set.score2}</span></p>
                    </Plate>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TopList({ count }: { count: number }) {
  const fgc = useLiveFgc();
  const rows = records(fgc.sets).slice(0, count);
  return (
    <div className="grid h-full content-start gap-3 p-8">
      <p className="font-display text-4xl font-semibold uppercase">{count === 8 ? "Top 8" : "Standings"} · {fgc.event?.name || fgc.event?.game || ""}</p>
      <div className={count === 8 ? "grid grid-cols-4 gap-3" : "grid grid-cols-2 gap-2"}>
        {rows.map((row, index) => (
          <Plate key={row.player.id} className="flex items-center gap-3 px-4 py-3">
            <span className="font-display text-3xl font-semibold text-white/50">{index + 1}</span>
            {characterIcon(fgc, row.player.character) ? <img src={characterIcon(fgc, row.player.character)} alt="" className="h-12 w-12 object-contain" /> : null}
            <span className="min-w-0">
              <span className="block truncate font-display text-2xl font-semibold uppercase">{[row.player.flag, playerLabel(row.player)].filter(Boolean).join(" ")}</span>
              <span className="font-mono text-xs text-white/60">{row.wins}-{row.losses} {row.player.character}</span>
            </span>
          </Plate>
        ))}
      </div>
    </div>
  );
}

function SetList({ count, title }: { count: number; title: string }) {
  const fgc = useLiveFgc();
  const rows = finished(fgc.sets).slice(-count).reverse();
  return (
    <div className="grid content-start gap-2 p-8">
      <p className="font-display text-4xl font-semibold uppercase">{title}</p>
      {rows.map((set) => (
        <Plate key={set.id} className="flex items-center justify-between px-4 py-2">
          <span className="font-mono text-xs tracking-wide text-white/50 uppercase">{[set.phase, set.round].filter(Boolean).join(" · ")}</span>
          <span className="font-display text-2xl font-semibold uppercase">{playerLabel(set.p1)} {set.score1} – {set.score2} {playerLabel(set.p2)}</span>
        </Plate>
      ))}
    </div>
  );
}

function People() {
  const fgc = useLiveFgc();
  const players = playersIn(fgc.sets);
  return (
    <div className="p-8">
      <p className="font-display text-4xl font-semibold uppercase">Players · {players.length}</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {players.slice(0, 32).map((player) => (
          <Plate key={player.id} className="truncate px-3 py-2 font-display text-xl font-semibold uppercase">{[player.flag, playerLabel(player)].filter(Boolean).join(" ")}</Plate>
        ))}
      </div>
    </div>
  );
}

function Gallery() {
  const fgc = useLiveFgc();
  const characters = libraryFor(fgc)?.characters ?? [];
  return (
    <div className="p-6">
      <p className="font-display text-3xl font-semibold uppercase">{fgc.event?.game || "Characters"}</p>
      <div className="mt-3 grid grid-cols-10 gap-2">
        {characters.slice(0, 50).map((character) => (
          <div key={character.code || character.name} className="text-center">
            {character.icon ? <img src={character.icon} alt="" className="mx-auto h-16 w-16 object-contain" /> : <div className="mx-auto h-16 w-16 bg-white/10" />}
            <p className="truncate text-[0.65rem] uppercase">{character.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CharacterLine() {
  const fgc = useLiveFgc();
  const set = liveSet(fgc);
  const names = [set?.p1?.character, set?.p1?.character2, set?.p2?.character, set?.p2?.character2].filter(Boolean) as string[];
  return (
    <div className="flex h-full items-end justify-center gap-8 pb-8">
      {names.map((name) => (
        <div key={name} className="text-center">
          {characterIcon(fgc, name) ? <img src={characterIcon(fgc, name)} alt="" className="h-36 w-36 object-contain" /> : null}
          <p className="mt-2 font-display text-2xl font-semibold uppercase">{name}</p>
        </div>
      ))}
    </div>
  );
}

function StageStrike() {
  const fgc = useLiveFgc();
  const set = liveSet(fgc);
  const ruleset = fgc.rulesets.find((item) => item.id === fgc.activeRulesetId) ?? fgc.rulesets[0];
  const library = libraryFor(fgc);
  const icon = (name: string) => {
    const stage = library?.stages.find((item) => item.name === name);
    return stage ? stageIconUrl("", library?.code || "", stage.code) : "";
  };
  const pile = (title: string, names: string[]) => (
    <div>
      <p className="mb-2 font-mono text-xs tracking-[0.18em] text-white/60 uppercase">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {names.map((name) => (
          <Plate key={name} className={`px-2 py-2 text-center ${set?.stage === name ? "outline outline-2 outline-red-500" : ""}`}>
            {icon(name) ? <img src={icon(name)} alt="" className="mx-auto h-16 w-full object-contain" /> : null}
            <p className="mt-1 text-sm uppercase">{name}</p>
          </Plate>
        ))}
      </div>
    </div>
  );
  return (
    <div className="grid gap-6 p-8">
      <p className="font-display text-4xl font-semibold uppercase">{ruleset?.name || "Stage strike"}</p>
      {pile("Neutral", ruleset?.neutralStages ?? [])}
      {pile("Counterpick", ruleset?.counterpickStages ?? [])}
    </div>
  );
}

function Queue() {
  const fgc = useLiveFgc();
  const rows = fgc.sets
    .filter((set) => set.queued)
    .sort((a, b) => (a.streamName || "").localeCompare(b.streamName || "") || (a.queueOrder || 0) - (b.queueOrder || 0));
  const shown = rows.length ? rows : fgc.sets.filter((set) => set.state !== "done").slice(0, 8);
  return (
    <div className="grid content-start gap-2 p-8">
      <p className="font-display text-4xl font-semibold uppercase">Stream queue</p>
      {shown.map((set, index) => (
        <Plate key={set.id} className="flex items-center gap-4 px-4 py-2">
          <span className="font-display text-2xl text-white/40">{index + 1}</span>
          <span className="font-display text-2xl font-semibold uppercase">{playerLabel(set.p1)} vs {playerLabel(set.p2)}</span>
          <span className="ml-auto font-mono text-xs text-white/50 uppercase">{[set.phase, set.round].filter(Boolean).join(" · ")}</span>
        </Plate>
      ))}
    </div>
  );
}

function RulesetCard() {
  const fgc = useLiveFgc();
  const ruleset = fgc.rulesets.find((item) => item.id === fgc.activeRulesetId) ?? fgc.rulesets[0];
  return (
    <div className="grid content-start gap-3 p-10">
      <p className="font-display text-5xl font-semibold uppercase">{ruleset?.name || "No ruleset"}</p>
      <p className="font-mono text-sm tracking-[0.16em] text-white/70 uppercase">
        {[ruleset?.game, ruleset?.dsr?.toUpperCase(), ruleset ? `${ruleset.banCount} bans` : ""].filter(Boolean).join(" · ")}
      </p>
      <p className="text-xl">Neutral: {ruleset?.neutralStages.join(", ") || "None"}</p>
      <p className="text-xl">Counterpick: {ruleset?.counterpickStages.join(", ") || "None"}</p>
    </div>
  );
}

function World() {
  const fgc = useLiveFgc();
  const groups = new Map<string, FgcPlayer[]>();
  for (const player of playersIn(fgc.sets)) {
    const key = player.country || "Unknown";
    groups.set(key, [...(groups.get(key) ?? []), player]);
  }
  return (
    <div className="grid content-start gap-4 p-8">
      <p className="font-display text-4xl font-semibold uppercase">Where they're from</p>
      <div className="grid grid-cols-4 gap-3">
        {[...groups.entries()].slice(0, 12).map(([country, players]) => (
          <Plate key={country} className="px-3 py-2">
            <p className="font-display text-xl font-semibold uppercase">{[players[0]?.flag, country].filter(Boolean).join(" ")}</p>
            <p className="text-sm text-white/70">{players.length} {players.length === 1 ? "player" : "players"}</p>
          </Plate>
        ))}
      </div>
    </div>
  );
}

function History() {
  const fgc = useLiveFgc();
  const phases = new Map<string, number>();
  for (const set of fgc.sets) phases.set(set.phase || "Sets", (phases.get(set.phase || "Sets") ?? 0) + 1);
  return (
    <div className="grid content-start gap-3 p-10">
      <p className="font-display text-5xl font-semibold uppercase">{fgc.event?.tournamentName || "Tournament"}</p>
      <p className="text-2xl text-white/80">{fgc.event?.name}</p>
      <p className="font-mono text-sm tracking-[0.16em] text-white/60 uppercase">{[fgc.event?.game, fgc.event?.startAt?.slice(0, 10), fgc.event?.entrants ? `${fgc.event.entrants} entrants` : ""].filter(Boolean).join(" · ")}</p>
      <div className="mt-4 grid gap-2">
        {[...phases.entries()].map(([name, count]) => (
          <Plate key={name} className="flex justify-between px-4 py-2 text-xl uppercase"><span>{name}</span><span>{count} sets</span></Plate>
        ))}
      </div>
    </div>
  );
}

function UltimateBoard() {
  const fgc = useLiveFgc();
  const set = liveSet(fgc);
  const logo = fgc.event?.icon || "/brand/rok-mark.png";
  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <div className="absolute top-3 right-5 left-5 grid grid-cols-[auto_minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-start gap-3">
        <div className="grid gap-1">
          <div className="bg-black px-3 py-1 font-display text-xl leading-none font-semibold uppercase">{set?.round || "Round"}</div>
          {set?.phase ? <div className="bg-black px-3 py-1 text-[11px] tracking-[0.16em] uppercase">{set.phase}</div> : null}
        </div>
        <UltimateSide fgc={fgc} player={set?.p1 ?? null} score={set?.score1 ?? 0} losers={!!set?.losers1} side="left" />
        <img src={logo} alt="" className="mt-6 h-14 w-full object-contain" />
        <UltimateSide fgc={fgc} player={set?.p2 ?? null} score={set?.score2 ?? 0} losers={!!set?.losers2} side="right" />
      </div>
      <div className="absolute bottom-5 left-5 h-40 w-72 border-[3px] border-[#e10600] bg-transparent" />
      <div className="absolute right-5 bottom-5 h-40 w-72 border-[3px] border-[#2f6bff] bg-transparent" />
      <UltimateFeet fgc={fgc} player={set?.p1 ?? null} side="left" />
      <UltimateFeet fgc={fgc} player={set?.p2 ?? null} side="right" />
      <img src={fgc.event?.icon || "/overlays/rok-wordmark.png"} alt="" className="absolute bottom-6 left-1/2 h-24 max-w-xs -translate-x-1/2 object-contain" />
    </div>
  );
}

function UltimateSide({ fgc, player, score, losers, side }: { fgc: FgcState; player: FgcPlayer | null; score: number; losers: boolean; side: "left" | "right" }) {
  const icon = characterIcon(fgc, player?.character || "");
  const chips = [
    player?.flag,
    player?.region,
    player?.pronouns,
    player?.twitter ? `X ${player.twitter.replace(/^@/, "")}` : "",
    player?.seed ? `Seed ${player.seed}` : "",
  ].filter(Boolean) as string[];
  const ordered = side === "right" ? [...chips].reverse() : chips;
  const tone = side === "left" ? "bg-[#e10600]" : "bg-[#2f6bff]";
  return (
    <div className={`grid gap-1 ${side === "left" ? "justify-items-end" : "justify-items-start"}`}>
      <div className="flex flex-wrap gap-1">
        {ordered.map((chip) => <span key={chip} className={`${tone} px-2 py-0.5 text-[13px] font-semibold tracking-wide uppercase`}>{chip}</span>)}
      </div>
      <div className={`flex h-12 w-full max-w-[34rem] items-stretch bg-black ${side === "right" ? "flex-row-reverse" : ""}`}>
        {icon ? <img src={icon} alt="" className="h-12 w-12 object-cover" /> : <span className="w-2" />}
        <span className="flex flex-1 items-center justify-center px-3 font-display text-2xl font-semibold uppercase">{playerLabel(player)}{losers ? " (L)" : ""}</span>
        <span className={`flex w-12 items-center justify-center font-display text-3xl font-semibold ${tone}`}>{score}</span>
      </div>
    </div>
  );
}

function UltimateFeet({ fgc, player, side }: { fgc: FgcState; player: FgcPlayer | null; side: "left" | "right" }) {
  const icon = characterIcon(fgc, player?.character || "");
  return (
    <div className={`absolute bottom-6 flex items-end gap-2 ${side === "left" ? "left-[19.5rem]" : "right-[19.5rem] flex-row-reverse"}`}>
      {icon ? <img src={icon} alt="" className="h-20 w-20 object-contain" /> : null}
      <div className="bg-black px-3 py-1 font-display text-lg font-semibold uppercase">{playerLabel(player)}</div>
    </div>
  );
}

function SmashHud() {
  const fgc = useLiveFgc();
  if (!/smash/i.test(fgc.event?.game || "")) return <FgcHud />;
  return <UltimateBoard />;
}

export function FgcGraphic({ id }: { id: FgcOverlayId }) {
  if (id === "hud") return <SmashHud />;
  if (id === "scoreboard-ultimate") return <UltimateBoard />;
  if (id === "versus" || id === "versus-tekken" || id === "versus-pokken") return <Versus id={id} />;
  if (id === "scoreboard-simple") return <Scoreboard style="simple" />;
  if (id === "scoreboard-topleft") return <Scoreboard style="topleft" />;
  if (id === "scoreboard-4by3") return <Scoreboard style="4by3" />;
  if (id === "bracket") return <Bracket ultimate={false} />;
  if (id === "bracket-ultimate") return <Bracket ultimate />;
  if (id === "top-8") return <TopList count={8} />;
  if (id === "top-n") return <TopList count={16} />;
  if (id === "last-sets") return <SetList count={5} title="Last sets" />;
  if (id === "recent-sets") return <SetList count={12} title="Recent sets" />;
  if (id === "player-list") return <People />;
  if (id === "character-gallery") return <Gallery />;
  if (id === "character-line") return <CharacterLine />;
  if (id === "stage-strike") return <StageStrike />;
  if (id === "stream-queue") return <Queue />;
  if (id === "ruleset") return <RulesetCard />;
  if (id === "world") return <World />;
  if (id === "tournament-history") return <History />;
  return null;
}
