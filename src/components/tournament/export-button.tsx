import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportTournamentFiles } from "@/lib/tournament-export";
import { useDeskStore } from "@/lib/desk-store";
import { useTournamentStore } from "@/lib/tournament-store";
import { isVgcTitle } from "@/lib/games";
import { tournamentLooksLikeTest } from "@/lib/test-fixtures";

export function ExportTournamentButton({
  variant = "outline",
  full = false,
}: {
  variant?: "outline" | "secondary" | "default";
  full?: boolean;
}) {
  const t = useTournamentStore((s) => s.tournament);
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const demo = tournamentLooksLikeTest(t);

  const run = async () => {
    setStatus("busy");
    try {
      await exportTournamentFiles(t, useDeskStore.getState().desk);
      setStatus("ok");
    } catch {
      try {
        window.location.assign("/api/tournament/export");
        setStatus("ok");
      } catch {
        setStatus("err");
      }
    }
  };

  return (
    <div className={full ? "grid gap-1.5" : undefined}>
      <Button
        variant={variant}
        size="sm"
        className={full ? "w-full" : undefined}
        disabled={status === "busy"}
        onClick={() => void run()}
      >
        <Download className="size-3.5" />
        {status === "busy" ? "Preparing…" : status === "ok" ? "Downloaded zip" : "Export tournament"}
      </Button>
      {full ? (
        <p className="text-[0.65rem] leading-relaxed text-subtle">
          One zip: JSON (includes a restorable state) plus CSVs (event, players, matches, standings, judge notes
          {t.staff?.length ? ", staff" : ""}
          {isVgcTitle(t.gameId) ? ", VGC teams" : ""}
          ). Completing the event also downloads this pack.
          {demo ? " Test mode — this is the demo field." : " Includes player IDs; keep it with event staff."}
        </p>
      ) : null}
      {status === "err" ? (
        <p className="text-[0.65rem] text-live">
          Download blocked. Open{" "}
          <a href="/api/tournament/export" className="underline underline-offset-2">
            this export link
          </a>{" "}
          instead.
        </p>
      ) : null}
    </div>
  );
}
