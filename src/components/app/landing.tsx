import { Link } from "@tanstack/react-router";
import { Clapperboard, ClipboardList, Clock, MessageSquarePlus, MonitorPlay, Tablet, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAME_LIST } from "@/lib/games";
import { APP_VERSION_LABEL } from "@/lib/version";

const STEPS = [
  {
    n: "01",
    title: "Set up the event",
    body: "Open Tournament Organizer. Name the show, pick the game and format, then add players — or send people to walk-up sign-up.",
  },
  {
    n: "02",
    title: "Start pairings",
    body: "Choose single elim, double elim, or Swiss. Start the bracket. Staff, player IDs, and team sheets live here for the archive.",
  },
  {
    n: "03",
    title: "Send a match to stream",
    body: "From a ready pairing, send the match to Production. That desk drives the scorebug, clock, casters, and look.",
  },
  {
    n: "04",
    title: "Key the overlays",
    body: "In OBS or vMix, add 1920×1080 browser sources from the overlay list. Use the per-game URL so two titles on one host stay separate.",
  },
  {
    n: "05",
    title: "Floor devices",
    body: "Open the judge tablet on a floor iPad — it follows the featured match. Commander and Lorcana also have a player tablet for the table. The floor clock is a full-page timer for the rest of the room.",
  },
];

export function Landing() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/brand/rok-mark.png" alt="" className="size-9 object-contain" />
            <div>
              <p className="font-display text-xl leading-none font-semibold tracking-wide uppercase">
                ROK Desk
                <span className="ml-2 align-middle font-mono text-[0.62rem] font-medium tracking-[0.14em] text-muted normal-case">
                  {APP_VERSION_LABEL}
                </span>
              </p>
              <p className="text-xs text-muted">Broadcast production desk</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="https://forms.gle/Re5mt8RXU7qNEN8W9" target="_blank" rel="noreferrer">
                <MessageSquarePlus className="size-3.5" />
                Feedback
              </a>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">ROK Esports</p>
        <h1 className="font-display mt-2 max-w-3xl text-4xl font-semibold tracking-tight uppercase sm:text-5xl">
          One desk for the floor and the stream
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          ROK Desk runs the tournament and the broadcast from the same event. Pairings,
          walk-up sign-up, judge tablets, and 1920×1080 overlays for Pokémon VGC, PTCG,
          One Piece, Yu-Gi-Oh!, Magic, Lorcana, Star Wars Unlimited, and Riftbound.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            to="/tournament"
            className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
          >
            <Trophy className="size-5 text-muted group-hover:text-fg" />
            <p className="font-display mt-4 text-2xl font-semibold uppercase">Tournament Organizer</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Roster, bracket or Swiss, staff, player IDs, floor clock, export. Start the event here.
            </p>
            <p className="mt-4 text-sm font-medium">Open organizer →</p>
          </Link>
          <Link
            to="/production"
            className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
          >
            <Clapperboard className="size-5 text-muted group-hover:text-fg" />
            <p className="font-display mt-4 text-2xl font-semibold uppercase">Production Control</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Featured match, scorebug, stream clock, casters, look, and overlay preview.
            </p>
            <p className="mt-4 text-sm font-medium">Open production →</p>
          </Link>
        </div>

        <section className="mt-12">
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Get started</p>
          <h2 className="font-display mt-1 text-2xl font-semibold uppercase">How a show runs</h2>
          <ol className="mt-5 grid gap-3">
            {STEPS.map((step) => (
              <li key={step.n} className="grid gap-1 rounded-xl border border-border bg-surface px-4 py-3 sm:grid-cols-[3.5rem_1fr] sm:items-baseline">
                <span className="font-mono text-[0.7rem] tracking-[0.16em] text-subtle">{step.n}</span>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Also on this desk</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link to="/tablet" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <Tablet className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Judge tablet</p>
                <p className="mt-1 text-sm text-muted">
                  Per-game floor pad. Open from Production or Tournament so it stays on that event.
                </p>
              </div>
            </Link>
            <Link
              to="/tablet"
              search={{ role: "player" }}
              className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40"
            >
              <Tablet className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Player tablet</p>
                <p className="mt-1 text-sm text-muted">
                  Commander table pad, or Lorcana lore / games / clock — open from Production for the live title.
                </p>
              </div>
            </Link>
            <Link to="/overlay" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <MonitorPlay className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Browser sources</p>
                <p className="mt-1 text-sm text-muted">OBS / vMix overlay list. Prefer /{"{game}"}/overlay/…</p>
              </div>
            </Link>
            <Link to="/signup" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Walk-up sign-up</p>
                <p className="mt-1 text-sm text-muted">Kiosk for the active game. Per-game links live on Tournament.</p>
              </div>
            </Link>
            <a href="/ptcg/overlay/floor-clock" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Floor clock</p>
                <p className="mt-1 text-sm text-muted">Full-page room timer. Open from Tournament for the right game.</p>
              </div>
            </a>
          </div>
        </section>

        <section className="mt-12 border-t border-border pt-8">
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Titles</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {GAME_LIST.map((game) => (
              <li
                key={game.id}
                className="rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-[0.68rem] tracking-wide text-muted uppercase"
              >
                {game.short}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-subtle">
            One host is one event. Overlay paths are game-scoped so PTCG and VGC bugs do not mix.
            This build is {APP_VERSION_LABEL}.
          </p>
        </section>
      </main>
    </div>
  );
}
