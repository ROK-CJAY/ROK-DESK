import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const LICENSE_HEADING = "License";

export function LicenseCopy({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p>
        ROK Desk is provided by ROK Esports for <strong>ROK Gaming Lounge</strong> and for{" "}
        <strong>personal, non-commercial</strong> use.
      </p>
      <p className="mt-2">
        You may run it on your own machine to organize or stream an event you are staffing. You may not sell ROK
        Desk, bundle it as a paid product, or use it as the licensed software of another business without written
        permission from ROK Esports.
      </p>
      <p className="mt-2">
        ROK Desk is provided <strong>as-is</strong>, in beta, with no warranty. ROK Esports is not liable for lost
        pairings, missed matches, or broadcast downtime.
      </p>
      <p className="mt-2">
        ROK Desk is not affiliated with Nintendo, The Pokémon Company, Wizards of the Coast, Ravensburger, or other
        game publishers.
      </p>
      <p className="mt-2">
        Event data stays on this PC. If a future build sends anonymous usage stats, that will be disclosed in-app.
      </p>
    </div>
  );
}

export function LicenseButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Scale className="size-3.5" />
          License
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-4">
        <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">{LICENSE_HEADING}</p>
        <LicenseCopy className="mt-2 text-xs leading-relaxed text-muted" />
      </PopoverContent>
    </Popover>
  );
}
