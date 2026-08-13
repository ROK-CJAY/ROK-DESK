import { useEffect, useState, type ReactNode } from "react";
import { ScaleFrame } from "@/components/overlays/scale-frame";
import { useLiveDesk } from "@/components/overlays/use-live-desk";
import type { DeskState } from "@/lib/desk-types";

export function OverlayPage({
  render,
}: {
  render: (desk: DeskState, now: number) => ReactNode;
}) {
  const desk = useLiveDesk();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  if (!desk) return null;

  return (
    <div className="h-screen w-screen bg-transparent">
      <ScaleFrame>{render(desk, now)}</ScaleFrame>
    </div>
  );
}
