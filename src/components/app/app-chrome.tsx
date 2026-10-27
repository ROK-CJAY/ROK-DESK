import { Link } from "@tanstack/react-router";
import { Gamepad2, Layers } from "lucide-react";
import { SupportButtons } from "@/components/app/support-links";
import { UpdateBadge } from "@/components/app/update-badge";
import { cn } from "@/lib/cn";
import { useDeskStore } from "@/lib/desk-store";
import { streamChannelLine, streamChannelUrl, streamChannelsOf } from "@/lib/stream-channel";

export function AppChrome({
  view,
  eyebrow,
  children,
  trailing,
}: {
  view: "production" | "tournament" | "home" | "browser" | "fgc" | "tcg";
  eyebrow?: string;
  children?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const tcg = view === "production" || view === "tournament" || view === "tcg";
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
                  <UpdateBadge />
                </div>
                <p className="text-xs text-muted">
                  {eyebrow ??
                    (view === "production"
                      ? "Production control"
                      : view === "tournament"
                        ? "Tournament organizer"
                        : view === "tcg"
                          ? "TCG control"
                          : view === "fgc"
                            ? "FGC control"
                            : view === "browser"
                              ? "Browser"
                              : "Home")}
                </p>
              </div>
            </Link>
            <nav className="ml-1 flex rounded-lg border border-border bg-surface-2 p-0.5">
              <Link
                to="/tcg"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium tracking-wide",
                  tcg ? "bg-surface text-fg" : "text-muted hover:text-fg",
                )}
              >
                <Layers className="size-3.5" />
                TCG Control
              </Link>
              <Link
                to="/fgc"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium tracking-wide",
                  view === "fgc" ? "bg-surface text-fg" : "text-muted hover:text-fg",
                )}
              >
                <Gamepad2 className="size-3.5" />
                FGC Control
              </Link>
            </nav>
            {view === "production" ? <LiveBadge /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {trailing}
            <SupportButtons />
          </div>
        </div>
        {tcg ? <TcgSectionNav current={view === "production" ? "production" : view === "tournament" ? "tournament" : null} /> : null}
        {children}
      </div>
    </header>
  );
}

function TcgSectionNav({ current }: { current: "tournament" | "production" | null }) {
  const item = (id: "tournament" | "production", label: string) => (
    <Link
      to={id === "tournament" ? "/tournament" : "/production"}
      className={cn("rounded-md px-3 py-1.5 text-xs font-medium", current === id ? "bg-surface text-fg" : "text-muted hover:text-fg")}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex w-fit rounded-lg border border-border bg-surface-2 p-0.5">
      {item("tournament", "Tournament")}
      {item("production", "Production")}
    </nav>
  );
}

function LiveBadge() {
  const channel = useDeskStore((s) => s.desk.streamChannel);
  const platform = useDeskStore((s) => s.desk.streamPlatform);
  const channels = useDeskStore((s) => s.desk.streamChannels);
  const rows = streamChannelsOf({ streamChannel: channel, streamPlatform: platform, streamChannels: channels }).filter((row) => row.handle.trim());
  const label = rows.map(streamChannelLine).join("  ·  ");
  const href = rows[0] ? streamChannelUrl(rows[0].handle, rows[0].platform) : null;
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