import { Link } from "@tanstack/react-router";
import { Clapperboard, House, Trophy } from "lucide-react";
import { SupportButtons } from "@/components/app/support-links";
import { cn } from "@/lib/cn";
import { APP_VERSION_LABEL } from "@/lib/version";
import { useDeskStore } from "@/lib/desk-store";
import { streamChannelLabel, streamChannelUrl } from "@/lib/stream-channel";

export function AppChrome({
  view,
  eyebrow,
  children,
  trailing,
}: {
  view: "production" | "tournament" | "home" | "browser";
  eyebrow?: string;
  children?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
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
                <p className="text-xs text-muted">
                  {eyebrow ??
                    (view === "production"
                      ? "Production control"
                      : view === "tournament"
                        ? "Tournament organizer"
                        : view === "browser"
                          ? "Browser"
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
            {view === "production" ? <LiveBadge /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {trailing}
            <SupportButtons />
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}

function LiveBadge() {
  const channel = useDeskStore((s) => s.desk.streamChannel);
  const label = streamChannelLabel(channel);
  const href = streamChannelUrl(channel);
  const inner = (
    <>
      <span className="live-dot size-1.5 rounded-full bg-live" />
      {label ? `Live · ${label}` : "Live"}
    </>
  );
  const className =
    "inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2.5 py-1 text-[0.65rem] font-medium tracking-[0.16em] text-live uppercase";
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} title={href}>
        {inner}
      </a>
    );
  }
  return <span className={className}>{inner}</span>;
}
