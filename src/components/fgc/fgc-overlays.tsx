import { useEffect, type ReactNode } from "react";
import { FgcHud } from "@/components/overlays/fgc-hud";
import { playerLabel } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { useTitleImages } from "@/lib/fgc-assets";
import { FgcGraphic } from "@/components/fgc/fgc-graphics";
import { activeTitle, liveSet, titleImage, titleStack, titleText, type FgcOverlayId } from "@/lib/fgc-titles";

function useLiveFgc() {
  const hydrate = useFgcStore((s) => s.hydrate);
  const reload = useFgcStore((s) => s.reload);
  const fgc = useFgcStore((s) => s.fgc);
  useEffect(() => {
    hydrate();
    const timer = window.setInterval(reload, 1000);
    return () => window.clearInterval(timer);
  }, [hydrate, reload]);
  return fgc;
}

function Plate({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md bg-black/80 px-6 py-4 text-white shadow-lg ${className}`}>{children}</div>;
}

function Casters() {
  const fgc = useLiveFgc();
  const shown = fgc.casters.filter((caster) => caster.name.trim());
  return (
    <div className="flex h-full items-end justify-center gap-4 px-10 pb-10">
      {shown.map((caster, index) => (
        <Plate key={caster.id} className="min-w-64">
          <p className="font-mono text-[0.65rem] tracking-[0.2em] text-white/60 uppercase">Commentator {index + 1}</p>
          <p className="font-display mt-1 text-3xl font-semibold uppercase">{[caster.prefix, caster.name].filter(Boolean).join(" | ")}</p>
          <p className="mt-1 text-sm text-white/70">{[caster.pronouns, caster.twitter ? `@${caster.twitter}` : ""].filter(Boolean).join(" · ")}</p>
        </Plate>
      ))}
    </div>
  );
}

function Lower() {
  const fgc = useLiveFgc();
  const set = liveSet(fgc);
  return (
    <div className="flex h-full items-end px-10 pb-8">
      <Plate className="flex w-full items-center justify-between gap-6">
        <p className="font-display text-3xl font-semibold uppercase">{fgc.event?.name || fgc.event?.game || "FGC"}</p>
        <p className="font-display text-3xl font-semibold uppercase">{playerLabel(set?.p1 ?? null)} <span className="text-white/50">vs</span> {playerLabel(set?.p2 ?? null)}</p>
        <p className="font-mono text-sm tracking-[0.18em] text-white/70 uppercase">{[set?.phase, set?.round].filter(Boolean).join(" · ")}</p>
      </Plate>
    </div>
  );
}

function Winner() {
  const fgc = useLiveFgc();
  const set = liveSet(fgc);
  const ahead = !set || set.score1 === set.score2 ? null : set.score1 > set.score2 ? set.p1 : set.p2;
  return (
    <div className="grid h-full place-items-center">
      <Plate className="text-center">
        <p className="font-mono text-sm tracking-[0.28em] text-white/70 uppercase">Winner</p>
        <p className="font-display mt-2 text-7xl font-semibold uppercase">{ahead ? playerLabel(ahead) : "No winner yet"}</p>
      </Plate>
    </div>
  );
}

export function CustomLayout({ editing = false, titleId = "" }: { editing?: boolean; titleId?: string }) {
  useTitleImages();
  const fgc = useLiveFgc();
  const set = liveSet(fgc);
  const title = activeTitle(fgc, titleId);
  return (
    <div className="relative h-full w-full">
      {titleStack(title).map((element) => (
        <div
          key={element.id}
          className="absolute overflow-hidden"
          style={{
            left: element.x,
            top: element.y,
            width: element.w,
            height: element.h,
            color: element.color,
            background: element.kind === "image" ? "transparent" : element.bg,
            fontSize: element.size,
            textAlign: element.align,
            lineHeight: 1.1,
            fontWeight: 650,
            opacity: element.opacity,
            outline: editing ? "1px dashed rgba(255,255,255,0.35)" : undefined,
          }}
        >
          {element.kind === "image" ? (
            titleImage(fgc, set, element) ? <img src={titleImage(fgc, set, element)} alt="" className="h-full w-full object-contain" /> : null
          ) : element.kind === "text" ? (
            <span className="block h-full uppercase">{titleText(fgc, set, element.bind, element.text)}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function FgcOverlay({ source, titleId = "" }: { source: string; titleId?: string }) {
  const id = (source || "hud") as FgcOverlayId;
  const graphic = FgcGraphic({ id });
  if (graphic) return graphic;
  if (id === "casters") return <Casters />;
  if (id === "lower") return <Lower />;
  if (id === "winner") return <Winner />;
  if (id === "custom") return <CustomLayout titleId={titleId} />;
  return <FgcHud />;
}
