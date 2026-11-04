import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cleanSpeech } from "@/lib/fgc-settings";
import { FgcHud } from "@/components/overlays/fgc-hud";
import { playerLabel } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { useTitleImages } from "@/lib/fgc-assets";
import { FgcGraphic } from "@/components/fgc/fgc-graphics";
import { FgcScoreboardRok } from "@/components/fgc/fgc-scoreboard-rok";
import { fontFamilyCss } from "@/lib/fgc-fonts";
import { activeTitle, liveSet, titleImage, titleStack, titleText, type FgcOverlayId } from "@/lib/fgc-titles";

function fontParts(fontSize: string | number) {
  if (typeof fontSize === "number") return { value: fontSize, unit: "px" };
  const match = String(fontSize).trim().match(/^(-?\d*\.?\d+)(.*)$/);
  if (!match) return { value: 16, unit: "px" };
  return { value: Number(match[1]), unit: match[2] || "px" };
}

export function FitText({ text, fontSize }: { text: string; fontSize: string | number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const base = fontParts(fontSize);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      const maxW = box.clientWidth;
      const maxH = box.clientHeight;
      if (maxW < 2 || maxH < 2) return;
      el.style.fontSize = `${base.value}${base.unit}`;
      const computed = getComputedStyle(el);
      const px = parseFloat(computed.fontSize);
      if (!px) return;
      const probe = document.createElement("span");
      probe.textContent = text || " ";
      probe.style.position = "fixed";
      probe.style.left = "-9999px";
      probe.style.top = "0";
      probe.style.visibility = "hidden";
      probe.style.whiteSpace = "nowrap";
      probe.style.fontFamily = computed.fontFamily;
      probe.style.fontWeight = computed.fontWeight;
      probe.style.fontStyle = computed.fontStyle;
      probe.style.letterSpacing = computed.letterSpacing;
      probe.style.lineHeight = "1";
      probe.style.fontSize = `${px}px`;
      document.body.appendChild(probe);
      const naturalW = probe.offsetWidth;
      const naturalH = probe.offsetHeight;
      probe.remove();
      const next = Math.max(0.12, Math.min(1, (maxW - 2) / Math.max(naturalW, 1), (maxH - 2) / Math.max(naturalH, 1)));
      const rounded = Math.round(next * 1000) / 1000;
      setScale((current) => (Math.abs(current - rounded) < 0.002 ? current : rounded));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [text, base.value, base.unit]);

  return (
    <span ref={ref} className="block w-full min-w-0 overflow-hidden whitespace-nowrap" style={{ fontSize: `${base.value * scale}${base.unit}`, lineHeight: 1 }}>
      {text}
    </span>
  );
}

function useLiveFgc() {
  const pullProgram = useFgcStore((s) => s.pullProgram);
  const fgc = useFgcStore((s) => s.fgc);
  useEffect(() => {
    void pullProgram();
    const timer = window.setInterval(() => void pullProgram(), 1000);
    return () => window.clearInterval(timer);
  }, [pullProgram]);
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
          <p className="font-display mt-1 text-3xl font-semibold uppercase">{cleanSpeech([caster.prefix, caster.name].filter(Boolean).join(" | "), fgc.settings.profanity)}</p>
          <p className="mt-1 text-sm text-white/70">{cleanSpeech([caster.pronouns, caster.twitter ? `@${caster.twitter}` : ""].filter(Boolean).join(" · "), fgc.settings.profanity)}</p>
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
        <p className="font-display text-3xl font-semibold uppercase">{cleanSpeech(playerLabel(set?.p1 ?? null), fgc.settings.profanity)} <span className="text-white/50">vs</span> {cleanSpeech(playerLabel(set?.p2 ?? null), fgc.settings.profanity)}</p>
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
        <p className="font-display mt-2 text-7xl font-semibold uppercase">{ahead ? cleanSpeech(playerLabel(ahead), fgc.settings.profanity) : "No winner yet"}</p>
      </Plate>
    </div>
  );
}

function TitleMotion({ token, anim, children }: { token: string; anim: string; children: ReactNode }) {
  const incoming = useRef(children);
  incoming.current = children;
  const shown = useRef({ token, node: children });
  const [display, setDisplay] = useState(children);
  const [phase, setPhase] = useState("");
  useEffect(() => {
    if (anim !== "fade" || token === shown.current.token) {
      shown.current = { token, node: incoming.current };
      setDisplay(incoming.current);
      return;
    }
    setDisplay(shown.current.node);
    setPhase("out");
    const timer = window.setTimeout(() => {
      shown.current = { token, node: incoming.current };
      setDisplay(incoming.current);
      setPhase("in");
    }, 220);
    return () => window.clearTimeout(timer);
  }, [anim, token]);
  if (anim !== "fade") return <div className="flex h-full w-full min-w-0 items-center overflow-hidden">{children}</div>;
  return (
    <div className="flex h-full w-full min-w-0 items-center overflow-hidden" style={{ animation: phase === "out" ? "rok-title-out 220ms ease forwards" : phase === "in" ? "rok-title-in 280ms ease" : undefined }}>
      {display}
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
      {titleStack(title).map((element) => {
        const words = element.kind === "text" || element.kind === "ticker";
        const picture = element.kind === "image" || element.kind === "rect" || element.kind === "circle" || element.kind === "triangle";
        const value = picture ? titleImage(fgc, set, element) : titleText(fgc, set, element.bind, element.text);
        return (
        <div
          key={element.id}
          className="absolute overflow-hidden"
          style={{
            left: element.x,
            top: element.y,
            width: element.w,
            height: element.h,
            color: element.color,
            background: picture && value ? "transparent" : element.bg,
            fontSize: element.size,
            fontFamily: fontFamilyCss(element.font),
            fontWeight: element.weight || (element.font ? 400 : 650),
            fontStyle: element.fontStyle === "italic" ? "italic" : "normal",
            textAlign: element.align,
            lineHeight: 1.05,
            opacity: element.opacity,
            borderRadius: element.kind === "circle" ? "50%" : undefined,
            clipPath: element.kind === "triangle" ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
            mixBlendMode: (element.blend || undefined) as CSSProperties["mixBlendMode"],
            outline: editing ? "1px dashed rgba(255,255,255,0.35)" : undefined,
          }}
        >
          <TitleMotion token={value} anim={element.anim || ""}>
            {picture ? (
              value ? <img src={value} alt="" className={`h-full w-full ${element.kind === "image" ? "object-cover" : "object-contain"}`} /> : null
            ) : element.kind === "ticker" ? (
              <span className="inline-block whitespace-nowrap" style={{ animation: "rok-ticker 14s linear infinite" }}>{titleText(fgc, set, element.bind, element.text)}</span>
            ) : words ? (
              <FitText text={titleText(fgc, set, element.bind, element.text)} fontSize={element.size} />
            ) : null}
          </TitleMotion>
        </div>
        );
      })}
    </div>
  );
}

export function FgcOverlay({ source, titleId = "" }: { source: string; titleId?: string }) {
  const id = (source || "hud") as FgcOverlayId;
  const graphic = FgcGraphic({ id });
  if (graphic) return graphic;
  if (id === "scoreboard-rok") return <FgcScoreboardRok />;
  if (id === "casters") return <Casters />;
  if (id === "lower") return <Lower />;
  if (id === "winner") return <Winner />;
  if (id === "custom") return <CustomLayout titleId={titleId} />;
  return <FgcHud />;
}
