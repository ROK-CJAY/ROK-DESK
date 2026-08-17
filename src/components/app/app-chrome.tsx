import { Link } from "@tanstack/react-router";
import { Clapperboard, House, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { APP_VERSION_LABEL } from "@/lib/version";

export function AppChrome({
  view,
  eyebrow,
  children,
  trailing,
}: {
  view: "production" | "tournament" | "home";
  eyebrow?: string;
  children?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img src="/favicon.svg" alt="" className="size-9 rounded-md border border-border" />
              <div>
                <p className="font-display text-xl leading-none font-semibold tracking-wide uppercase">
                  ROK Desk
                  <span className="ml-2 align-middle font-mono text-[0.62rem] font-medium tracking-[0.14em] text-muted normal-case">
                    {APP_VERSION_LABEL}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {eyebrow ??
                    (view === "production"
                      ? "Production control"
                      : view === "tournament"
                        ? "Tournament organizer"
                        : "Home")}
                </p>
              </div>
            </Link>
            <nav className="ml-1 flex rounded-lg border border-border bg-surface-2 p-0.5">
              <Link
                to="/"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium tracking-wide",
                  view === "home" ? "bg-surface text-fg" : "text-muted hover:text-fg",
                )}
              >
                <House className="size-3.5" />
                Home
              </Link>
              <Link
                to="/production"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium tracking-wide",
                  view === "production" ? "bg-surface text-fg" : "text-muted hover:text-fg",
                )}
              >
                <Clapperboard className="size-3.5" />
                Production
              </Link>
              <Link
                to="/tournament"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium tracking-wide",
                  view === "tournament" ? "bg-surface text-fg" : "text-muted hover:text-fg",
                )}
              >
                <Trophy className="size-3.5" />
                Tournament
              </Link>
            </nav>
            {view === "production" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2.5 py-1 text-[0.65rem] font-medium tracking-[0.16em] text-live uppercase">
                <span className="live-dot size-1.5 rounded-full bg-live" />
                Live
              </span>
            ) : null}
          </div>
          {trailing ? <div className="flex items-center gap-3">{trailing}</div> : null}
        </div>
        {children}
      </div>
    </header>
  );
}
