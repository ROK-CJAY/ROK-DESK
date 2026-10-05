import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SignupKiosk } from "@/components/signup/signup-kiosk";
import { isGameId, type GameId } from "@/lib/games";
import { normalizeSignupCode } from "@/lib/remote-signup-code";

export const Route = createFileRoute("/join/$code")({
  ssr: false,
  component: JoinCode,
});

type RemoteCard = {
  code: string;
  gameId: GameId;
  name: string;
  formatName: string;
  requireDecklist: boolean;
  closed: boolean;
  count: number;
  bestOf: 1 | 3 | 5 | 7;
  bracketType: "single" | "double" | "swiss";
};

function JoinCode() {
  const { code: raw } = Route.useParams();
  const code = normalizeSignupCode(raw);
  const [event, setEvent] = useState<RemoteCard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    setError("");
    setEvent(null);
    void fetch(`/api/remote-signup?code=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as { error?: string; event?: Record<string, unknown> };
        if (!res.ok || !data.event) throw new Error(data.error || "That sign-up code is not open.");
        const gameRaw = data.event.gameId;
        if (typeof gameRaw !== "string" || !isGameId(gameRaw)) throw new Error("That event is not available.");
        const best = data.event.bestOf;
        const bracket = data.event.bracketType;
        if (cancel) return;
        setEvent({
          code,
          gameId: gameRaw,
          name: String(data.event.name ?? "ROK event"),
          formatName: String(data.event.formatName ?? ""),
          requireDecklist: Boolean(data.event.requireDecklist),
          closed: data.event.open === false,
          count: Number(data.event.count ?? 0),
          bestOf: best === 1 || best === 5 || best === 7 ? best : 3,
          bracketType: bracket === "double" || bracket === "swiss" ? bracket : "single",
        });
      })
      .catch((err: unknown) => {
        if (!cancel) setError(err instanceof Error ? err.message : "Could not open sign-up.");
      });
    return () => {
      cancel = true;
    };
  }, [code]);

  if (error) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4 text-center text-fg">
        <div>
          <p className="font-display text-3xl font-semibold uppercase">Sign-up unavailable</p>
          <p className="mt-2 text-muted">{error}</p>
        </div>
      </main>
    );
  }
  if (!event) {
    return <main className="grid min-h-dvh place-items-center bg-bg text-muted">Opening sign-up…</main>;
  }
  return <SignupKiosk remote={event} />;
}
