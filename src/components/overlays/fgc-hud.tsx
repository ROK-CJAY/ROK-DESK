import { useEffect } from "react";
import { playerLabel, streamSetOf } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";

function Side({
  name,
  meta,
  align,
}: {
  name: string;
  meta: string;
  align: "left" | "right";
}) {
  const right = align === "right";
  return (
    <div className={right ? "text-right" : "text-left"}>
      <p className="font-display text-6xl leading-none font-semibold tracking-tight text-white uppercase">{name}</p>
      <p className="mt-3 font-mono text-sm tracking-[0.18em] text-white/70 uppercase">{meta || "\u00a0"}</p>
    </div>
  );
}

export function FgcHud() {
  const hydrate = useFgcStore((s) => s.hydrate);
  const reload = useFgcStore((s) => s.reload);
  const fgc = useFgcStore((s) => s.fgc);
  useEffect(() => {
    hydrate();
    const timer = window.setInterval(reload, 1000);
    return () => window.clearInterval(timer);
  }, [hydrate, reload]);

  const set = streamSetOf(fgc);
  const event = fgc.event;
  const p1 = set?.p1 ?? null;
  const p2 = set?.p2 ?? null;
  const meta = (player: typeof p1) =>
    [player?.country, player?.twitter ? `@${player.twitter}` : "", player?.seed ? `Seed ${player.seed}` : ""]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent text-white">
      <div className="absolute right-10 bottom-8 left-10 flex items-end justify-between gap-8">
        <Side name={playerLabel(p1)} meta={meta(p1)} align="left" />
        <div className="mb-1 shrink-0 text-center">
          <p className="font-mono text-xs tracking-[0.28em] text-white/70 uppercase">
            {event?.game || "FGC"} · {set?.round || event?.name || "No set"}
          </p>
          <p className="font-display mt-1 text-5xl leading-none font-semibold tabular-nums">
            {set ? `${set.score1} – ${set.score2}` : "VS"}
          </p>
        </div>
        <Side name={playerLabel(p2)} meta={meta(p2)} align="right" />
      </div>
    </div>
  );
}
