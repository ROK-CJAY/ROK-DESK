import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readTournamentFile } from "@/lib/tournament-import";
import { useTournamentStore } from "@/lib/tournament-store";
import { gameOf } from "@/lib/games";

export function ImportTournamentButton({
  variant = "outline",
  full = false,
}: {
  variant?: "outline" | "secondary" | "default";
  full?: boolean;
}) {
  const t = useTournamentStore((s) => s.tournament);
  const importArchive = useTournamentStore((s) => s.importArchive);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [detail, setDetail] = useState("");

  const run = async (file: File) => {
    setStatus("busy");
    setDetail("");
    try {
      const incoming = await readTournamentFile(file);
      const hasField = t.entrants.length > 0 || t.matches.length > 0 || Boolean(t.name.trim());
      if (hasField) {
        const from = incoming.name.trim() || gameOf(incoming.gameId).short;
        const ok = window.confirm(
          `Replace the current ${gameOf(t.gameId).short} event with “${from}”? Other titles stay as they are.`,
        );
        if (!ok) {
          setStatus("idle");
          return;
        }
      }
      importArchive(incoming);
      setStatus("ok");
      setDetail(`${gameOf(incoming.gameId).short}${incoming.name ? ` · ${incoming.name}` : ""}`);
    } catch (err) {
      setStatus("err");
      setDetail(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={full ? "grid gap-1.5" : undefined}>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void run(file);
        }}
      />
      <Button
        variant={variant}
        size="sm"
        className={full ? "w-full" : undefined}
        disabled={status === "busy"}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-3.5" />
        {status === "busy" ? "Reading…" : status === "ok" ? "Imported" : "Import JSON"}
      </Button>
      {full ? (
        <p className="text-[0.65rem] leading-relaxed text-subtle">
          Open a <span className="text-muted">tournament.json</span> from an export zip, or a saved ROK Desk state.
          {status === "ok" && detail ? ` Loaded ${detail}.` : ""}
        </p>
      ) : null}
      {status === "err" ? <p className="text-[0.65rem] text-live">{detail}</p> : null}
    </div>
  );
}
