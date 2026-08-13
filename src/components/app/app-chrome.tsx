import { Link } from "@tanstack/react-router";
import { Clapperboard, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/cn";

export function AppChrome({
  view,
  eyebrow,
  children,
  trailing,
}: {
  view: "production" | "tournament";
  eyebrow?: string;
  children?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const { isPending } = useCurrentUserState();

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <img src="/favicon.svg" alt="" className="size-9 rounded-md border border-border" />
            <div>
              <p className="font-display text-xl leading-none font-semibold tracking-wide uppercase">
                ROK Desk
              </p>
              <p className="text-xs text-muted">{eyebrow ?? (view === "production" ? "Production control" : "Tournament organizer")}</p>
            </div>
            <nav className="ml-1 flex rounded-lg border border-border bg-surface-2 p-0.5">
              <Link
                to="/"
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
          <div className="flex items-center gap-3">
            {trailing}
            {isPending ? (
              <div className="h-8 w-24 animate-pulse rounded-full bg-surface-2" />
            ) : (
              <>
                <SignedOut>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/login">Sign in</Link>
                  </Button>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </>
            )}
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}
