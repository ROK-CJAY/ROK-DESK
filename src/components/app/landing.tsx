import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clapperboard, FolderOpen, Gamepad2, Trophy } from "lucide-react";
import { FloorLinks } from "@/components/app/floor-links";
import { TabletQr } from "@/components/app/tablet-qr";
import { SupportButtons, DONATE_URL } from "@/components/app/support-links";
import { TITLE_STRIP } from "@/lib/games";
import { APP_VERSION_LABEL } from "@/lib/version";
import { UpdateBadge } from "@/components/app/update-badge";
import { LicenseCopy, LICENSE_HEADING } from "@/components/app/license-notice";
import { rokDesktop } from "@/lib/rok-desktop";

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
                <UpdateBadge />
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
        <p className="mt-4 max-w-xl text-base text-muted">
          Run the event in Tournament. Run the broadcast in Production. Tablets and overlays follow the game you pick.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            to="/tournament"
            className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
          >
            <Trophy className="size-5 text-muted group-hover:text-fg" />
            <p className="font-display mt-4 text-2xl font-semibold uppercase">Tournament Organizer</p>
            <p className="mt-2 text-sm text-muted">Roster, pairings, sign-up, and the floor clock.</p>
            <p className="mt-4 text-sm font-medium">Open organizer →</p>
          </Link>
          <Link
            to="/production"
            className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
          >
            <Clapperboard className="size-5 text-muted group-hover:text-fg" />
            <p className="font-display mt-4 text-2xl font-semibold uppercase">Production Control</p>
            <p className="mt-2 text-sm text-muted">Scorebug, overlays, and the tablets for the live table.</p>
            <p className="mt-4 text-sm font-medium">Open production →</p>
          </Link>
          <Link
            to="/fgc"
            className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
          >
            <Gamepad2 className="size-5 text-muted group-hover:text-fg" />
            <p className="font-display mt-4 text-2xl font-semibold uppercase">FGC Control</p>
            <p className="mt-2 text-sm text-muted">Import a start.gg event, pick the set on stream, and drive the FGC overlay.</p>
            <p className="mt-4 text-sm font-medium">Open FGC →</p>
          </Link>
        </div>

        <FloorLinks />
        <TabletQr />

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
          <p className="mt-4 text-xs text-subtle">
            This build is {APP_VERSION_LABEL}.{" "}
            <a href={DONATE_URL} target="_blank" rel="noreferrer" className="underline hover:text-muted">
              Donate
            </a>
          </p>
          <DeskDataNote />
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">{LICENSE_HEADING}</p>
          <LicenseCopy className="mt-3 max-w-2xl text-xs leading-relaxed text-subtle" />
        </div>
      </footer>
    </div>
  );
}

function DeskDataNote() {
  const desktop = typeof window !== "undefined" ? rokDesktop() : null;
  const [folder, setFolder] = useState("");
  useEffect(() => {
    void desktop?.deskDataPath?.().then(setFolder);
  }, [desktop]);
  if (!desktop?.openDeskData) return null;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-subtle">
      <FolderOpen className="size-3.5" />
      Event data stays in {folder || "AppData / ROK Desk"} if you uninstall.
      <button type="button" className="underline hover:text-muted" onClick={() => void desktop.openDeskData()}>
        Open folder
      </button>
    </p>
  );
}