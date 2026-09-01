import { Link } from "@tanstack/react-router";
import {
  Clapperboard,
  ClipboardList,
  Clock,
  FileText,
  FolderOpen,
  Globe,
  Mic,
  MonitorPlay,
  Palette,
  Tablet,
  Trophy,
} from "lucide-react";
import { FloorLinks } from "@/components/app/floor-links";
import { SupportButtons, DONATE_URL } from "@/components/app/support-links";
import { TITLE_STRIP } from "@/lib/games";
import { APP_VERSION_LABEL } from "@/lib/version";

const STEPS = [
  {
    n: "01",
    title: "Set up the event",
    body: "Open Tournament Organizer. Name the show, pick the game and format (PTCG and VGC: Masters, Seniors, or Juniors — three events per title on one host), then add players — or send people to walk-up sign-up (commander search, PTCG Limitless/PTCGL deck paste, VGC team sheet). Play! Pokémon: export a TDF into TOM, then drop or watch pairings back in. Print in-app lists or Official PDF from the roster.",
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
    body: "In OBS or vMix, add 1920×1080 browser sources from the overlay list. Prefer /{game}/overlay/… so two titles on one host stay separate. VGC, PTCG, YGO, OP, and Lorcana Play Layout, VGC Versus, plus ROK Layout on the other titles. Look (name, chrome, gold, rails) is per title.",
  },
  {
    n: "05",
    title: "Floor and comms",
    body: "Judge tablet on a floor iPad. Commander and YGO have a player pad. Lorcana has Player Tablet (lore) and Player Tablet Extended (self-run names, inks, lore). Casters get a read-only commentary tablet. Stream clock at the featured table; floor clock for the room.",
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
          Play! Pokémon TOM companion, official deck / team PDFs, walk-up sign-up, judge / player / commentary tablets, and 1920×1080 overlays for
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
              Roster, bracket or Swiss, staff, player IDs, notes, floor clock, export. PTCG and VGC TOM: TDF out, pairings in. Print lists or Official PDF. Start the event here.
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
              Stream / Floor tables, scorebug, Play Layouts, Versus, commentary tablet, look per title, and overlay preview.
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
                  Commander life, YGO LP, or Lorcana lore / games / clock for the table.
                </p>
              </div>
            </Link>
            <Link
              to="/tablet"
              search={{ role: "extended" }}
              className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40"
            >
              <Tablet className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Player tablet extended</p>
                <p className="mt-1 text-sm text-muted">
                  Lorcana self-run pad: names, inks, lore, games, clock. For tables without a stream op.
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
                <p className="mt-1 text-sm text-muted">OBS / vMix overlay list. Play Layout, Versus, ROK Layout, HUD. Prefer /{"{game}"}/overlay/…</p>
              </div>
            </Link>
            <Link to="/production" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <Palette className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Look</p>
                <p className="mt-1 text-sm text-muted">
                  Name, chrome, gold, rails, fonts, and win bugs. Each title keeps its own palette.
                </p>
              </div>
            </Link>
            <Link to="/tournament" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <FolderOpen className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">TOM companion</p>
                <p className="mt-1 text-sm text-muted">
                  PTCG and VGC stay separate. Export TDF, drop reports, or watch TOM_DATA so pairings import when TOM writes them.
                </p>
              </div>
            </Link>
            <Link to="/tournament" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <FileText className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Official PDF</p>
                <p className="mt-1 text-sm text-muted">
                  Fill the published Play! Pokémon TCG deck list and VGC team list from sign-up. Desk print sheets stay next to it.
                </p>
              </div>
            </Link>
            <a href="/ptcg/signup" className="flex gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent/40">
              <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted" />
              <div>
                <p className="font-medium">Walk-up sign-up</p>
                <p className="mt-1 text-sm text-muted">
                  Three PTCG kiosks and three VGC kiosks — Masters, Seniors, Juniors. Open the matching sign-up from Tournament.
                </p>
              </div>
            </a>
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
            {TITLE_STRIP.map((title) => (
              <li
                key={title.id}
                className="rounded-md border border-border bg-surface-2 px-2.5 py-1 font-mono text-[0.68rem] tracking-wide text-muted uppercase"
              >
                {title.label}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-subtle">
            Free and in beta. One host runs PTCG and VGC Masters, Seniors, and Juniors at once — each has its own roster, kiosk, tables, and overlays. Overlay paths are game-scoped so titles
            do not mix. Play Layouts, Versus, look, TOM watches, and Official PDF fills are per title. This build is {APP_VERSION_LABEL}. If it saves you a night,{" "}
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
