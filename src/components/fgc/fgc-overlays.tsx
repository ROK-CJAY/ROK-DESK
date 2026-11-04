import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cleanSpeech } from "@/lib/fgc-settings";
import { FgcHud } from "@/components/overlays/fgc-hud";
import { playerLabel } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { useTitleImages } from "@/lib/fgc-assets";
import { FgcGraphic } from "@/components/fgc/fgc-graphics";
import { fontFamilyCss } from "@/lib/fgc-fonts";
import { activeTitle, gamesWon, liveSet, normalizeTitle, sponsorIndex, sponsorList, titleImage, titleStack, titleText, type FgcOverlayId, type FgcTitle, type FgcTitleElement } from "@/lib/fgc-titles";
import { SCOREBOARD_ROK_ID, scoreboardRokTitle } from "@/lib/fgc-scoreboard-rok";

function fontParts(fontSize: string | number) {
  if (typeof fontSize === "number") return { value: fontSize, unit: "px" };
  const match = String(fontSize).trim().match(/^(-?\d*\.?\d+)(.*)$/);
  if (!match) return { value: 16, unit: "px" };
  return { value: Number(match[1]), unit: match[2] || "px" };
}

export function FitText({ text, fontSize, prefixColor }: { text: string; fontSize: string | number; prefixColor?: string }) {
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
      {prefixColor ? <AccentText text={text} color={prefixColor} /> : text}
    </span>
  );
}

/** "ROK | Name" → ROK in the accent color, then the name (Scoreboard ROK cards). */
function AccentText({ text, color }: { text: string; color: string }) {
  const cut = text.indexOf(" | ");
  if (cut < 0) return <>{text}</>;
  return (
    <>
      <span style={{ color, marginRight: "0.3em" }}>{text.slice(0, cut)}</span>
      {text.slice(cut + 3)}
    </>
  );
}

/** Text shown by a title element, after the optional template / caps / hide rules. */
export function elementText(element: FgcTitleElement, value: string): string {
  let text = value;
  if (element.template && text) text = element.template.replace("{}", text.replace(/^@/, ""));
  if (element.caps) text = text.toUpperCase();
  return text;
}

/** Optional Scoreboard ROK styling. `unit` maps 1920-wide canvas px to CSS (px on air, cqw in the editor). */
export function elementExtraStyle(element: FgcTitleElement, unit: (px: number) => string): CSSProperties {
  return {
    ...(element.clip ? { clipPath: element.clip } : {}),
    ...(element.borderWidth ? { border: `${unit(element.borderWidth)} solid ${element.borderColor || "#ffffff"}`, boxSizing: "border-box" as const } : {}),
    ...(element.tracking ? { letterSpacing: unit(element.tracking) } : {}),
  };
}

/** Text box with optional padding and vertical centering, keeping FitText measuring the inner width. */
export function ElementWords({ element, text, fontSize, unit }: { element: FgcTitleElement; text: string; fontSize: string | number; unit: (px: number) => string }) {
  if (!element.padLeft && !element.padRight && element.valign !== "middle") {
    return <FitText text={text} fontSize={fontSize} prefixColor={element.prefixColor} />;
  }
  return (
    <div className="absolute top-0 bottom-0 flex items-center" style={{ left: unit(element.padLeft || 0), right: unit(element.padRight || 0) }}>
      <FitText text={text} fontSize={fontSize} prefixColor={element.prefixColor} />
    </div>
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

const px = (value: number) => `${value}px`;


/** Original Scoreboard ROK timings (public/overlays/gameplay/index.html). */
const SLIDE_EASE = "cubic-bezier(.2,1.1,.4,1)";

/**
 * One positioned layer element with its on-air effects. Effects only use transform/opacity/filter,
 * so moving or resizing the layer in the editor never changes how they play.
 *  - enter "slide": translateY(-70px) and opacity 0 to rest; transform .7s SLIDE_EASE, opacity .4s, 60ms after mount.
 *  - anim "pulse": on value change, brightness(1.6) scale(1.12) back to none over .6s ease-out.
 */
function FxBox({ element, value, unit, className, style, children }: { element: FgcTitleElement; value: string; unit: (px: number) => string; className: string; style: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);
  // First program pull lands right after mount; like the original (no pulse on first render), skip it.
  const mounted = useRef(0);
  useEffect(() => { mounted.current = performance.now(); }, []);
  const rest = element.opacity ?? 1;
  useEffect(() => {
    const node = ref.current;
    if (!node || element.enter !== "slide" || typeof node.animate !== "function") return;
    const lift = node.animate([{ transform: `translateY(${unit(-70)})` }, { transform: "none" }], { duration: 700, delay: 60, easing: SLIDE_EASE, fill: "backwards" });
    const show = node.animate([{ opacity: 0 }, { opacity: rest }], { duration: 400, delay: 60, easing: "ease", fill: "backwards" });
    return () => { lift.cancel(); show.cancel(); };
    // Entrance plays once when the layer goes on air.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.enter]);
  useEffect(() => {
    const node = ref.current;
    const before = last.current;
    last.current = value;
    if (!node || element.anim !== "pulse" || before === null || before === value || performance.now() - mounted.current < 1000 || typeof node.animate !== "function") return;
    node.animate([{ filter: "brightness(1.6)", transform: "scale(1.12)" }, { filter: "none", transform: "none" }], { duration: 600, easing: "ease-out" });
  }, [value, element.anim]);
  return <div ref={ref} className={className} style={style} data-fx={[element.enter, element.anim].filter(Boolean).join(" ") || undefined}>{children}</div>;
}

/** Row of diamonds, mirrored for P2 (fills from the score side outwards). */
export function GamePips({ element, won, total, unit }: { element: FgcTitleElement; won: number; total: number; unit: (px: number) => string }) {
  const size = element.h * 0.7;
  const fill = element.color && element.color !== "#ffffff" ? element.color : "#d32f2f";
  const right = element.pips === "p1";
  return (
    <div className="absolute inset-0 flex items-center" style={{ justifyContent: "flex-start", flexDirection: right ? "row-reverse" : "row", gap: unit(size * 0.75), padding: `0 ${unit(size * 0.25)}` }}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          data-pip={index < won ? "on" : "off"}
          style={{ width: unit(size), height: unit(size), flex: "none", transform: "rotate(45deg)", boxSizing: "border-box", background: index < won ? fill : "#1a1a1a", border: `${unit(2)} solid ${index < won ? fill : "rgba(255,255,255,0.55)"}`, transition: "background .3s" }}
        />
      ))}
    </div>
  );
}

/**
 * Rotating partners, as the original sponsor stage: every partner is stacked, the current one is
 * opacity 1 and the rest 0 with an .8s opacity transition, logo and text centred together (gap 10, padding 0 8).
 * Advances every FGC sponsorSeconds (min 2, default 8).
 */
export function PartnerSlides({ element, unit }: { element: FgcTitleElement; unit: (px: number) => string }) {
  const fgc = useFgcStore((s) => s.fgc);
  const list = sponsorList(fgc);
  const on = sponsorIndex(fgc);
  return (
    <div className="absolute inset-0">
      {list.map((sponsor, index) => (
        <div
          key={sponsor.id || index}
          className="absolute inset-0 flex items-center justify-center"
          style={{ gap: unit(10), padding: `0 ${unit(8)}`, opacity: index === on ? 1 : 0, transition: "opacity .8s" }}
        >
          {sponsor.logo ? <img src={sponsor.logo} alt="" style={{ maxHeight: unit(26), maxWidth: unit(110) }} /> : null}
          {sponsor.name ? (
            <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ maxWidth: unit(190), textTransform: element.caps ? "uppercase" : undefined }}>{sponsor.name}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function CustomLayout({ editing = false, titleId = "", fallback }: { editing?: boolean; titleId?: string; fallback?: () => FgcTitle }) {
  useTitleImages();
  const fgc = useLiveFgc();
  const set = liveSet(fgc);
  const saved = fallback ? fgc.titles.find((item) => item.id === titleId) : null;
  const title = fallback ? normalizeTitle(saved ?? fallback()) : activeTitle(fgc, titleId);
  const rotating = title.elements.some((element) => element.bind.startsWith("sponsor.") || element.anim === "partners");
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(timer);
  }, [rotating]);
  return (
    <div className="relative h-full w-full">
      {titleStack(title).map((element) => {
        const words = element.kind === "text" || element.kind === "ticker";
        const picture = element.kind === "image" || element.kind === "rect" || element.kind === "circle" || element.kind === "triangle";
        const pips = element.pips ? gamesWon(set, element.pips) : null;
        const value = pips ? `${pips.won}/${pips.total}` : picture ? titleImage(fgc, set, element) : elementText(element, titleText(fgc, set, element.bind, element.text));
        if (element.hideEmpty && !value) return null;
        return (
        <FxBox
          key={element.id}
          element={element}
          value={value}
          unit={px}
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
            ...elementExtraStyle(element, px),
          }}
        >
          <TitleMotion token={value} anim={element.anim || ""}>
            {picture ? (
              value ? <img src={value} alt="" className={`h-full w-full ${element.kind === "image" ? "object-cover" : "object-contain"}`} /> : null
            ) : element.kind === "ticker" ? (
              <span className="inline-block whitespace-nowrap" style={{ animation: "rok-ticker 14s linear infinite" }}>{titleText(fgc, set, element.bind, element.text)}</span>
            ) : pips ? (
              <GamePips element={element} won={pips.won} total={pips.total} unit={px} />
            ) : element.anim === "partners" ? (
              <PartnerSlides element={element} unit={px} />
            ) : words ? (
              <ElementWords element={element} text={value} fontSize={element.size} unit={px} />
            ) : null}
          </TitleMotion>
        </FxBox>
        );
      })}
    </div>
  );
}

export function FgcOverlay({ source, titleId = "" }: { source: string; titleId?: string }) {
  const id = (source || "hud") as FgcOverlayId;
  const graphic = FgcGraphic({ id });
  if (graphic) return graphic;
  if (id === "scoreboard-rok") return <CustomLayout titleId={SCOREBOARD_ROK_ID} fallback={scoreboardRokTitle} />;
  if (id === "casters") return <Casters />;
  if (id === "lower") return <Lower />;
  if (id === "winner") return <Winner />;
  if (id === "custom") return <CustomLayout titleId={titleId} />;
  return <FgcHud />;
}
