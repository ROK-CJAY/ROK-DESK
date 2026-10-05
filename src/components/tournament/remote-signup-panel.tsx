import { useEffect, useState } from "react";
import { Copy, Download, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { makeSignupCode, normalizeSignupCode, PUBLIC_SIGNUP_ORIGIN, signupLink } from "@/lib/remote-signup-code";
import { playAgeDivisionOf, type GameId } from "@/lib/games";
import { useTournamentStore } from "@/lib/tournament-store";
import type { Entrant } from "@/lib/tournament-types";

const HOST_KEY = "rok.signup.host";
const SECRET_KEY = "rok.signup.secret";
const CODE_KEY = "rok.signup.code";

export function RemoteSignupPanel({
  gameId,
  title,
  formatName,
  requireDecklist,
  bestOf,
  bracketType,
}: {
  gameId: GameId;
  title: string;
  formatName: string;
  requireDecklist: boolean;
  bestOf: number;
  bracketType: string;
}) {
  const addEntrant = useTournamentStore((s) => s.addEntrant);
  const entrants = useTournamentStore((s) => s.tournament.entrants);
  const [host, setHost] = useState(PUBLIC_SIGNUP_ORIGIN);
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"open" | "pull" | "close" | null>(null);

  useEffect(() => {
    setHost(localStorage.getItem(HOST_KEY) || PUBLIC_SIGNUP_ORIGIN);
    setSecret(localStorage.getItem(SECRET_KEY) || "");
    setCode(localStorage.getItem(CODE_KEY) || makeSignupCode());
  }, []);

  const link = code.trim().length >= 4 ? signupLink(host, code) : "";

  const save = (next: { host?: string; secret?: string; code?: string }) => {
    if (next.host !== undefined) {
      setHost(next.host);
      localStorage.setItem(HOST_KEY, next.host.trim());
    }
    if (next.secret !== undefined) {
      setSecret(next.secret);
      localStorage.setItem(SECRET_KEY, next.secret);
    }
    if (next.code !== undefined) {
      const cleaned = normalizeSignupCode(next.code);
      setCode(cleaned);
      localStorage.setItem(CODE_KEY, cleaned);
    }
  };

  const open = async () => {
    const cleaned = normalizeSignupCode(code);
    if (cleaned.length < 4) {
      setError("Code needs at least 4 characters.");
      return;
    }
    if (!secret.trim()) {
      setError("Paste the same pull secret you set on Vercel.");
      return;
    }
    setBusy("open");
    setError("");
    setNote("");
    try {
      const res = await fetch(`${host.trim().replace(/\/+$/, "")}/api/remote-signup`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-rok-signup-secret": secret.trim() },
        body: JSON.stringify({
          action: "open",
          code: cleaned,
          gameId,
          title,
          formatName,
          requireDecklist,
          bestOf,
          bracketType,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not open sign-up.");
      save({ code: cleaned });
      setNote("Sign-up is open. Send the link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the public host.");
    } finally {
      setBusy(null);
    }
  };

  const close = async () => {
    const cleaned = normalizeSignupCode(code);
    if (!secret.trim() || cleaned.length < 4) {
      setError("Host, secret, and code are required to close.");
      return;
    }
    setBusy("close");
    setError("");
    setNote("");
    try {
      const res = await fetch(`${host.trim().replace(/\/+$/, "")}/api/remote-signup`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-rok-signup-secret": secret.trim() },
        body: JSON.stringify({ action: "close", code: cleaned }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not close sign-up.");
      setNote("Sign-up is closed. You can still pull players who already registered.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the public host.");
    } finally {
      setBusy(null);
    }
  };

  const pull = async () => {
    const cleaned = normalizeSignupCode(code);
    if (!secret.trim() || cleaned.length < 4) {
      setError("Host, secret, and code are required to pull.");
      return;
    }
    setBusy("pull");
    setError("");
    setNote("");
    try {
      const res = await fetch(
        `${host.trim().replace(/\/+$/, "")}/api/remote-signup?code=${encodeURIComponent(cleaned)}`,
        { headers: { "x-rok-signup-secret": secret.trim() }, cache: "no-store" },
      );
      const data = (await res.json()) as {
        error?: string;
        entrants?: Array<Partial<Entrant> & { id: string }>;
      };
      if (!res.ok) throw new Error(data.error || "Could not pull sign-ups.");
      const have = new Set(entrants.map((row) => row.judgeNote));
      let added = 0;
      for (const row of data.entrants ?? []) {
        const mark = `remote:${row.id}`;
        if (have.has(mark)) continue;
        addEntrant({
          name: row.name,
          tag: row.tag,
          pronouns: row.pronouns,
          country: row.country,
          deck: row.deck,
          extra: row.extra,
          playerId: row.playerId,
          trainerName: row.trainerName,
          switchProfile: row.switchProfile,
          ageDivision: playAgeDivisionOf(gameId) || row.ageDivision || "",
          birthDate: row.birthDate,
          team: row.team,
          ink1: row.ink1,
          ink2: row.ink2,
          note: row.note,
          photoUrl: row.photoUrl,
          decklist: row.decklist,
          judgeNote: mark,
        });
        have.add(mark);
        added += 1;
      }
      const skipped = (data.entrants?.length ?? 0) - added;
      setNote(added ? `Added ${added}.${skipped ? ` ${skipped} already on the roster.` : ""}` : "No new players.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pull sign-ups.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-border bg-surface-2 p-3">
      <p className="font-mono text-[0.62rem] tracking-[0.16em] text-muted uppercase">Public sign-up</p>
      <p className="text-xs text-muted">
        Opens a form on the public site for this title. Players never see the desk. Pull them in when you are at the lounge.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={host} onChange={(e) => save({ host: e.target.value })} placeholder="https://rok-desk.vercel.app" />
        <Input
          value={secret}
          onChange={(e) => save({ secret: e.target.value })}
          placeholder="Pull secret"
          type="password"
          autoComplete="off"
        />
        <Input value={code} onChange={(e) => save({ code: e.target.value })} placeholder="Event code" className="font-mono tracking-widest" />
        <Button type="button" variant="outline" onClick={() => save({ code: makeSignupCode() })}>
          New code
        </Button>
      </div>
      {link ? <p className="truncate font-mono text-xs text-fg">{link}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void open()} disabled={busy !== null}>
          <Link2 className="size-3.5" />
          {busy === "open" ? "Opening…" : "Open sign-up"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!link}
          onClick={() => void navigator.clipboard.writeText(link)}
        >
          <Copy className="size-3.5" />
          Copy link
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void close()} disabled={busy !== null}>
          Close sign-up
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void pull()} disabled={busy !== null}>
          <Download className="size-3.5" />
          {busy === "pull" ? "Pulling…" : "Pull entrants"}
        </Button>
      </div>
      {note ? <p className="text-xs text-ok">{note}</p> : null}
      {error ? <p className="text-xs text-live">{error}</p> : null}
    </div>
  );
}
