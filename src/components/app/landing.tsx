import { Link } from "@tanstack/react-router";
import {
  Clapperboard,
  ClipboardList,
  Clock,
  Globe,
  Mic,
  MonitorPlay,
  Tablet,
  Trophy,
} from "lucide-react";
import { FloorLinks } from "@/components/app/floor-links";
import { SupportButtons, DONATE_URL } from "@/components/app/support-links";
import { GAME_LIST } from "@/lib/games";
import { APP_VERSION_LABEL } from "@/lib/version";

const STEPS = [
  {
    n: "01",
    title: "Set up the event",
    body: "Open Tournament Organizer. Name the show, pick the game and format, then add players — or send people to walk-up sign-up (commander search, Limitless notes, VGC team sheet).",
  },
  {
    n: "02",
    title: "Start pairings",
    body: "Choose single elim, double elim, or Swiss. Start the bracket. Staff, player IDs, photos, and team sheets live here for the archive.",
  },
  {
    n: "03",
    title: "Send a match to a table",
    body: "From a ready pairing, send it to Stream Match, Floor 1, or Floor 2. Each table has its own overlays, tablets, and clock so the featured game and the rest of the room can run at different times.",
  },
  {
    n: "04",
    title: "Key the overlays",
    body: "In OBS or vMix, add 1920×1080 browser sources from the overlay list. Prefer /{game}/overlay/… so two titles on one host stay separate. PTCG Play Layout and ROK Layout are both on the source list.",
  },
  {
    n: "05",
    title: "Floor and comms",
    body: "Judge tablet on a floor iPad. Commander and Lorcana also have a player pad. Casters get a read-only commentary tablet — teams, path, H2H, notes. Stream clock at the featured table; floor clock for the room.",
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
              <div className="flex items-baseline gap-2">
                <p className="font-display text-xl leading-none font-semibold tracking-wide uppercase">
                  ROK Desk
                </p>
                <span className="font-mono text-[0.62rem] font-medium tracking-[0.12em] text-muted">
                  {APP_VERSION_LABEL}
                </span>
              </div>
              <p className="text-xs text-muted">Broadcast production desk</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            <SupportButtons />
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
          walk-up sign-up, judge / player / commentary tablets, and 1920×1080 overlays for
          Pokémon VGC, PTCG, One Piece, Yu-Gi-Oh!, Magic, Lorcana, Star Wars Unlimited, and Riftbound.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            to="/tournament"
            className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
          >
            <Trophy className="size-5 text-muted group-hover:text-fg" />
            <p className="font-display mt-4 text-2xl font-semibold uppercase">Tournament Organizer</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Roster, bracket or Swiss, staff, player IDs, notes, floor clock, export. Start the event here.
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
              Stream / Floor tables, scorebug, commentary tablet, look, and overlay preview.
            </p>
            <p className="mt-4 text-sm font-medium">Open production →</p>
          </Link>
        </div>

        <FloorLinks />

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
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/tablet" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <Tablet className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Judge tablet</p>
                <p className="mt-1 text-sm text-muted">
                  Per-game floor pad. Open from Production on Stream, Floor 1, or Floor 2.
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
                  Commander life pad, or Lorcana lore / games / clock for the table.
                </p>
              </div>
            </Link>
            <Link
              to="/tablet"
              search={{ role: "caster" }}
              className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40"
            >
              <Mic className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Commentary tablet</p>
                <p className="mt-1 text-sm text-muted">
                  Read-only caster desk — teams, path, H2H, notes, staff, up next.
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
            <a href="/ptcg/overlay/stream-clock" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Stream clock</p>
                <p className="mt-1 text-sm text-muted">Full-page timer for a monitor at the streamed table. Open from Production.</p>
              </div>
            </a>
            <Link to="/browser" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <Globe className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Browser</p>
                <p className="mt-1 text-sm text-muted">In-app Chromium for pairings, downloads, and card databases.</p>
              </div>
            </Link>
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
            Free and in beta. One host is one event. Overlay paths are game-scoped so PTCG and VGC
            bugs do not mix. This build is {APP_VERSION_LABEL}. If it saves you a night,{" "}
            <a href={DONATE_URL} target="_blank" rel="noreferrer" className="underline hover:text-muted">
              donate
            </a>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
