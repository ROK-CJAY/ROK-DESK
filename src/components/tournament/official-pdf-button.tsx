import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfficialPdfButton({
  kind,
  id,
  all,
  label = "Official PDF",
  icon,
}: {
  kind: "deck" | "team";
  id?: string;
  all?: boolean;
  label?: string;
  icon?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const qs = new URLSearchParams({ kind });
  if (all) qs.set("all", "1");
  if (id) qs.set("id", id);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tournament/official-pdf?${qs}`);
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("pdf")) {
        let message = "Could not fill that PDF.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          message = res.ok ? "Could not fill that PDF." : `Could not fill that PDF (${res.status}).`;
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        const a = document.createElement("a");
        a.href = url;
        a.download = kind === "deck" ? "play-pokemon-deck-list.pdf" : "play-pokemon-team-list.pdf";
        a.rel = "noreferrer";
        a.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not fill that PDF.");
    } finally {
      setBusy(false);
    }
  };

  if (icon) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => void open()}
        disabled={busy}
        aria-label={label}
        title={label}
      >
        <FileText className="size-3.5" />
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" onClick={() => void open()} disabled={busy}>
      <FileText className="size-3.5" />
      {busy ? "Filling…" : label}
    </Button>
  );
}
