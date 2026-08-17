import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportTournamentFiles } from "@/lib/tournament-export";
import { useTournamentStore } from "@/lib/tournament-store";

export function ExportTournamentButton({
  variant = "outline",
  full = false,
}: {
  variant?: "outline" | "secondary" | "default";
  full?: boolean;
}) {
  const t = useTournamentStore((s) => s.tournament);
  return (
    <Button
      variant={variant}
      size="sm"
      className={full ? "w-full" : undefined}
      onClick={() => exportTournamentFiles(t)}
    >
      <Download className="size-3.5" />
      Export tournament
    </Button>
  );
}
