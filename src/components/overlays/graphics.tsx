import { gameOf } from "@/lib/games";
import { streamChannelLabel } from "@/lib/stream-channel";
import {
  formatClock,
  remainingSeconds,
  monogram,
  resourceLimit,
  type DeskState,
  type SlateKind,
} from "@/lib/desk-types";
import { ResourcePips } from "@/components/overlays/pips";
import { OverlayEditProvider, Placed, useOverlayEdit } from "@/components/overlays/placed";
import type { OverlayEdit } from "@/components/overlays/placed";
import { ScorebugView } from "@/components/overlays/scorebug";
import { CommanderScorebug, CommanderVersus, useCommanderOverlay } from "@/components/overlays/commander";
import { RosterView } from "@/components/overlays/roster";
import { CardSpotlightView } from "@/components/overlays/card";
import { EventLogoMark, EventLogoView } from "@/components/overlays/event-logo";
import { SponsorsView } from "@/components/overlays/sponsors";
import { VgcVersusView } from "@/components/overlays/vgc-versus";
import { GameWinView, WinnerView } from "@/components/overlays/winner";

export { GameWinView, WinnerView } from "@/components/overlays/winner";

const SLATE_COPY: Record<Exclude<SlateKind, "hidden">, { kicker: string; title: string; image: string }> = {
  starting: { kicker: "Live shortly", title: "Starting Soon", image: "/slates/starting.jpg" },
  brb: { kicker: "Hold with us", title: "Be Right Back", image: "/slates/brb.jpg" },
  thanks: { kicker: "That's a wrap", title: "Thanks for Watching", image: "/slates/thanks.jpg" },
  tech: { kicker: "Stand by", title: "Technical Pause", image: "/slates/brb.jpg" },
};

function Shell({
  desk,
  edit,
  children,
}: {
  desk: DeskState;
  edit?: OverlayEdit | null;
  children: React.ReactNode;
}) {
  return (
    <OverlayEditProvider desk={desk} edit={edit}>
      <div data-game={desk.gameId} className="pointer-events-none absolute inset-0">
        {children}
      </div>
    </OverlayEditProvider>
  );
}

export function VersusView({ desk }: { desk: DeskState }) {
  if (useCommanderOverlay(desk)) {
    return <CommanderVersus desk={desk} />;
  }
  if (desk.gameId === "pokemon-vgc") {
    return <VgcVersusView desk={desk} />;
  }
  const game = gameOf(desk.gameId);
  return (
    <div data-game={desk.gameId} className="relative h-full w-full overflow-hidden bg-ov-bg">
      <img
        src="/slates/playmat.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-linear-to-b from-ov-bg via-ov-bg/80 to-ov-bg" />
      <div className="relative flex h-full flex-col justify-between px-16 py-12">
        <header className="flex items-end justify-between gap-8">
          <div className="flex min-w-0 items-end gap-5">
            <EventLogoMark desk={desk} size="lg" />
            <div className="min-w-0">
            <p className="font-mono text-ov-kicker tracking-[0.28em] text-game uppercase">
              {desk.sponsorLine}
            </p>
            <h1 className="font-display mt-1 text-5xl font-semibold tracking-tight text-ov-fg uppercase">
              {desk.eventName}
            </h1>
          </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-ov-kicker tracking-[0.22em] text-ov-muted uppercase">
              {game.name}
            </p>
            <p className="font-display text-2xl font-semibold text-ov-fg uppercase">
              {desk.roundName}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-10">
          <VersusPlayer desk={desk} side="p1" align="left" />
          <div className="flex flex-col items-center">
            <span className="font-display text-ov-hero leading-none font-semibold text-ov-fg/90">VS</span>
            <span className="font-mono mt-2 text-ov-kicker tracking-[0.24em] text-ov-muted uppercase">
              Best of {desk.bestOf} · {desk.formatName}
            </span>
          </div>
          <VersusPlayer desk={desk} side="p2" align="right" />
        </div>

        <footer className="flex items-center justify-between text-ov-muted">
          <p className="font-mono text-ov-kicker tracking-[0.2em] uppercase">
            {desk.eventPhase}
          </p>
          <p className="font-mono text-ov-kicker tracking-[0.2em] uppercase">
            {desk.casters[0].name} · {desk.casters[1].name}
          </p>
        </footer>
      </div>
    </div>
  );
}

function VersusPlayer({
  desk,
  side,
  align,
}: {
  desk: DeskState;
  side: "p1" | "p2";
  align: "left" | "right";
}) {
  const player = desk[side];
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className={`mb-5 flex ${align === "right" ? "justify-end" : ""}`}>
        <div className="grid size-28 place-items-center overflow-hidden rounded-xl border border-ov-fg/10 bg-ov-panel">
          {player.photoUrl ? (
            <img src={player.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="font-display text-4xl font-semibold text-ov-muted">
              {monogram(player.name)}
            </span>
          )}
        </div>
      </div>
      <p className="font-mono text-ov-kicker tracking-[0.22em] text-game uppercase">
        {player.country} {player.pronouns ? `· ${player.pronouns}` : ""}
      </p>
      <h2 className="font-display text-6xl leading-none font-semibold tracking-tight text-ov-fg uppercase">
        {player.name || "TBD"}
      </h2>
      <p className="mt-2 text-xl text-ov-muted">
        {player.archetype || player.extra || (player.tag ? `@${player.tag}` : "\u00a0")}
      </p>
    </div>
  );
}

export function SlateView({ desk }: { desk: DeskState }) {
  if (desk.slate === "hidden") return null;
  const copy = SLATE_COPY[desk.slate];
  const game = gameOf(desk.gameId);
  return (
    <div data-game={desk.gameId} className="relative h-full w-full overflow-hidden bg-ov-bg">
      <img src={copy.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-ov-bg/55" />
      <div className="relative flex h-full flex-col justify-between px-16 py-14">
        <p className="font-mono text-ov-kicker tracking-[0.3em] text-ov-fg/80 uppercase">
          {desk.sponsorLine}
        </p>
        <div>
          <EventLogoMark desk={desk} size="lg" className="mb-5" />
          <p className="font-mono text-sm tracking-[0.32em] text-game uppercase">{copy.kicker}</p>
          <h1 className="font-display mt-2 text-7xl font-semibold tracking-tight text-ov-fg uppercase">
            {copy.title}
          </h1>
          <p className="mt-4 text-2xl text-ov-fg/80">{desk.eventName}</p>
          <p className="mt-1 text-lg text-ov-muted">
            {game.name} · {desk.formatName} · {desk.eventPhase}
          </p>
          {desk.streamChannel.trim() ? (
            <p className="font-mono mt-3 text-sm tracking-[0.18em] text-ov-fg/70 uppercase">
              Live · {streamChannelLabel(desk.streamChannel)}
            </p>
          ) : null}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-ov-kicker tracking-[0.22em] text-ov-muted uppercase">On the desk</p>
            <p className="font-display text-2xl font-semibold text-ov-fg uppercase">
              {desk.casters[0].name}
              <span className="text-ov-muted"> · </span>
              {desk.casters[1].name}
            </p>
          </div>
          <p className="font-mono text-ov-kicker tracking-[0.2em] text-ov-muted uppercase">
            Next · {desk.roundName} · {desk.p1.name} vs {desk.p2.name}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CastersView({ desk, edit = null }: { desk: DeskState; edit?: OverlayEdit | null }) {
  return (
    <Shell desk={desk} edit={edit}>
      {desk.casters.map((caster, index) => (
        <Placed key={caster.name + caster.handle + index} id={index === 0 ? "caster1" : "caster2"}>
          <div
            className={`w-[400px] rounded-lg border border-ov-fg/10 bg-ov-bg/92 px-6 py-4 ${
              index === 1 ? "text-right" : ""
            }`}
          >
            <div className={`mb-2 h-0.5 w-12 bg-game ${index === 1 ? "ml-auto" : ""}`} />
            <p className="font-mono text-ov-kicker tracking-[0.22em] text-ov-muted uppercase">
              {caster.role || "Caster"}
            </p>
            <p className="font-display text-3xl font-semibold tracking-tight text-ov-fg uppercase">
              {caster.name}
            </p>
            {caster.handle ? (
              <p className="text-sm text-ov-muted">@{caster.handle}</p>
            ) : null}
          </div>
        </Placed>
      ))}
    </Shell>
  );
}

export function LowerThirdView({ desk, edit = null }: { desk: DeskState; edit?: OverlayEdit | null }) {
  return (
    <Shell desk={desk} edit={edit}>
      <LowerThirdBody desk={desk} />
    </Shell>
  );
}

function LowerThirdBody({ desk }: { desk: DeskState }) {
  const edit = useOverlayEdit();
  if (!desk.lowerThird.visible && !edit) return null;
  const lt = desk.lowerThird;
  let title = lt.title;
  let subtitle = lt.subtitle;
  if (lt.mode === "player") {
    const seat = lt.side === "p2" || lt.side === "p3" || lt.side === "p4" ? lt.side : "p1";
    const p = desk[seat];
    title = p.name;
    subtitle = p.archetype || p.extra || p.tag;
  } else if (lt.mode === "caster") {
    const c = lt.side === "c2" ? desk.casters[1] : desk.casters[0];
    title = c.name;
    subtitle = c.role || (c.handle ? `@${c.handle}` : "");
  }

  return (
    <Placed id="lowerThird">
      <div className={`w-[576px] overflow-hidden rounded-lg border border-ov-fg/10 bg-ov-bg/94 ${desk.lowerThird.visible ? "" : "opacity-60"}`}>
        <div className="h-1 bg-game" />
        <div className="px-6 py-4">
          <p className="font-mono text-ov-kicker tracking-[0.24em] text-ov-muted uppercase">
            {desk.eventName}
          </p>
          <p className="font-display text-4xl font-semibold tracking-tight text-ov-fg uppercase">
            {title}
          </p>
          {subtitle ? <p className="mt-0.5 text-lg text-ov-muted">{subtitle}</p> : null}
        </div>
      </div>
    </Placed>
  );
}

export function TimerView({
  desk,
  now = Date.now(),
  edit = null,
}: {
  desk: DeskState;
  now?: number;
  edit?: OverlayEdit | null;
}) {
  const left = remainingSeconds(desk, now);
  return (
    <Shell desk={desk} edit={edit}>
      <Placed id="timer">
        <div className="rounded-lg border border-ov-fg/10 bg-ov-bg/92 px-6 py-4 text-right w-[300px]">
          <p className="font-mono text-ov-kicker tracking-[0.22em] text-ov-muted uppercase">
            Round clock
          </p>
          <p className="font-display text-6xl leading-none font-semibold tabular-nums text-ov-fg">
            {formatClock(left)}
          </p>
        </div>
      </Placed>
    </Shell>
  );
}

export function ResourceView({ desk, edit = null }: { desk: DeskState; edit?: OverlayEdit | null }) {
  if (useCommanderOverlay(desk)) {
    return <CommanderScorebug desk={desk} edit={edit} />;
  }
  const game = gameOf(desk.gameId);
  const max = resourceLimit(desk);
  return (
    <Shell desk={desk} edit={edit}>
      {(["p1", "p2"] as const).map((side) => {
        const p = desk[side];
        return (
          <Placed key={side} id={side === "p1" ? "resourceP1" : "resourceP2"}>
            <div
              className={`w-[360px] rounded-lg border border-ov-fg/10 bg-ov-bg/92 px-6 py-4 ${
                side === "p2" ? "text-right" : ""
              }`}
            >
              <p className="font-mono text-ov-kicker tracking-[0.2em] text-ov-muted uppercase">
                {p.name} · {game.resource.shortLabel}
              </p>
              {game.resource.pips ? (
                <div className="mt-3">
                  <ResourcePips
                    value={p.resource}
                    max={max}
                    size="lg"
                    pipStyle={game.resource.pipStyle}
                    team={p.team}
                    down={p.down}
                  />
                </div>
              ) : (
                <p className="font-display text-6xl font-semibold tabular-nums text-ov-fg">
                  {p.resource}
                </p>
              )}
              {game.secondary ? (
                <p className="mt-1 font-mono text-sm text-ov-muted">
                  {game.secondary.label} {p.secondary}
                </p>
              ) : null}
            </div>
          </Placed>
        );
      })}
    </Shell>
  );
}

export function UpcomingView({ desk, edit = null }: { desk: DeskState; edit?: OverlayEdit | null }) {
  return (
    <Shell desk={desk} edit={edit}>
      <UpcomingBody desk={desk} />
    </Shell>
  );
}

function UpcomingBody({ desk }: { desk: DeskState }) {
  const edit = useOverlayEdit();
  const next = desk.queue.slice(0, 4);
  if (next.length === 0 && !edit) return null;
  return (
    <Placed id="upcoming">
      <div className="w-[520px] rounded-xl border border-ov-fg/10 bg-ov-bg/94 p-7">
        <p className="font-mono text-ov-kicker tracking-[0.24em] text-game uppercase">Up next</p>
        <h2 className="font-display mt-1 text-3xl font-semibold text-ov-fg uppercase">
          {desk.eventName}
        </h2>
        <ul className="mt-5 space-y-3">
          {(next.length ? next : [{ id: "empty", p1: "TBD", p2: "TBD", round: "Hold", note: "" }]).map(
            (match) => (
              <li key={match.id} className="border-t border-ov-fg/10 pt-3">
                <p className="font-mono text-ov-kicker tracking-[0.18em] text-ov-muted uppercase">
                  {match.round} {match.note ? `· ${match.note}` : ""}
                </p>
                <p className="font-display text-2xl font-semibold tracking-tight text-ov-fg uppercase">
                  {match.p1} <span className="text-ov-muted">vs</span> {match.p2}
                </p>
              </li>
            ),
          )}
        </ul>
      </div>
    </Placed>
  );
}

export function HudView({
  desk,
  now = Date.now(),
  edit = null,
}: {
  desk: DeskState;
  now?: number;
  edit?: OverlayEdit | null;
}) {
  const commander = useCommanderOverlay(desk);
  const rok = desk.scorebugStyle === "rok";
  const play =
    desk.scorebugStyle === "play" &&
    (desk.gameId === "pokemon-tcg" ||
      desk.gameId === "yugioh" ||
      desk.gameId === "pokemon-vgc" ||
      desk.gameId === "one-piece" ||
      desk.gameId === "lorcana");
  return (
    <div className="pointer-events-none absolute inset-0">
      <ScorebugView desk={desk} now={now} edit={edit} />
      {rok || play ? null : <TimerView desk={desk} now={now} edit={edit} />}
      {commander || rok || play ? null : <ResourceView desk={desk} edit={edit} />}
      {commander || rok || play ? null : <CastersView desk={desk} edit={edit} />}
      {play ? null : <LowerThirdView desk={desk} edit={edit} />}
      {rok || play ? null : <WinnerView desk={desk} edit={edit} />}
      {rok || play ? null : <GameWinView desk={desk} edit={edit} />}
      {rok || play ? null : <RosterView desk={desk} edit={edit} />}
      {rok || play ? null : <CardSpotlightView desk={desk} edit={edit} />}
      {play ? null : <SponsorsView desk={desk} now={now} edit={edit} compact />}
      {play ? null : <EventLogoView desk={desk} edit={edit} />}
    </div>
  );
}
