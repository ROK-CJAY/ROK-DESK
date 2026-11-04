import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cleanSpeech } from "@/lib/fgc-settings";
import { FgcHud } from "@/components/overlays/fgc-hud";
import { ScaleFrame } from "@/components/overlays/scale-frame";
import { countryFlagUrl, playerLabel, stateFlagUrl, type FgcPlayer } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";
import { useTitleImages } from "@/lib/fgc-assets";
import { FgcGraphic } from "@/components/fgc/fgc-graphics";
import { fontFamilyCss } from "@/lib/fgc-fonts";
import { activeTitle, gamesWon, liveSet, normalizeTitle, sponsorIndex, sponsorList, sponsorSeconds, titleImage, titleStack, titleText, type FgcOverlayId, type FgcTitle, type FgcTitleElement } from "@/lib/fgc-titles";
import { SCOREBOARD_ROK_ID, scoreboardRokTitle } from "@/lib/fgc-scoreboard-rok";
import { VERSUS_ROK_ID, versusRokTitle } from "@/lib/fgc-versus-rok";
import { SCOREBOARD_SSI_ID, VERSUS_SSI_ID, scoreboardSsiTitle, versusSsiTitle } from "@/lib/fgc-ssi";
import { COMMENTATORS_ROK_ID, commentatorsRokTitle } from "@/lib/fgc-commentators-rok";

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
      // Measure the real span at base size (same font, tracking and caps as on air), not a detached probe.
      const naturalW = el.scrollWidth;
      const naturalH = px;
      const next = Math.max(0.12, Math.min(1, (maxW - 2) / Math.max(naturalW, 1), (maxH - 2) / Math.max(naturalH, 1)));
      let rounded = Math.round(next * 1000) / 1000;
      el.style.fontSize = `${base.value * rounded}${base.unit}`;
      // Fixed letter-spacing does not shrink with the font, so tighten until the full string fits.
      for (let i = 0; i < 20 && rounded > 0.12 && el.scrollWidth > el.clientWidth; i++) {
        rounded = Math.max(0.12, Math.round(rounded * 970) / 1000);
        el.style.fontSize = `${base.value * rounded}${base.unit}`;
      }
      setScale((current) => (Math.abs(current - rounded) < 0.002 ? current : rounded));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    // Web fonts (Anton/Oswald) swap in after first paint and change the width: measure again once they load.
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    let alive = true;
    void fonts?.ready.then(() => { if (alive) fit(); });
    fonts?.addEventListener?.("loadingdone", fit);
    return () => { alive = false; observer.disconnect(); fonts?.removeEventListener?.("loadingdone", fit); };
  }, [text, base.value, base.unit]);

  return (
    <span ref={ref} className="block w-full min-w-0 overflow-hidden whitespace-nowrap" style={{ fontSize: `${base.value * scale}${base.unit}`, lineHeight: 1, paddingBottom: "0.14em", marginBottom: "-0.14em" }}>
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
    ...(element.shadow ? { textShadow: element.shadow } : {}),
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

/** When the layout went on air (performance.now()), so every element's frame-exact motion shares one clock. */
const OnAirClock = createContext(0);

const FPS = 60;
const TAN22 = Math.tan((22 * Math.PI) / 180);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);
const easeCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeBack = (t: number, s = 1.8) => { const u = t - 1; return 1 + (s + 1) * u ** 3 + s * u ** 2; };

/** Sampled keyframes for frames a..b (one per frame), so the curve matches build.py exactly. */
function sampled(a: number, b: number, at: (t: number) => Keyframe) {
  const n = Math.max(1, Math.round(b - a));
  return { frames: Array.from({ length: n + 1 }, (_, i) => ({ ...at(i / n), offset: i / n })), timing: { delay: (a / FPS) * 1000, duration: ((b - a) / FPS) * 1000, fill: "backwards" as const, easing: "linear" } };
}

/** Plays element.motion (see FgcTitleElement.motion) on the outer (wipe) and inner (fade/shift/pop) boxes. */
function useMotion(element: FgcTitleElement, outer: React.RefObject<HTMLDivElement | null>, inner: React.RefObject<HTMLDivElement | null>, glint: React.RefObject<HTMLDivElement | null>) {
  const epoch = useContext(OnAirClock);
  const rest = element.opacity ?? 1;
  useLayoutEffect(() => {
    const m = element.motion;
    if (!m || typeof inner.current?.animate !== "function") return;
    const out: Animation[] = [];
    const play = (node: HTMLElement | null, spec: ReturnType<typeof sampled>) => {
      if (!node) return;
      const anim = node.animate(spec.frames, spec.timing);
      if (epoch && document.timeline) anim.startTime = epoch;
      out.push(anim);
    };
    if (m.wipe) {
      const [a, b, from, to, cy] = m.wipe;
      // Visible where x < lead - (y - cy) * tan22, in the element's own px.
      const top = element.y - cy;
      const bottom = element.y + element.h - cy;
      play(outer.current, sampled(a, b, (t) => {
        const lead = from + (to - from) * easeQuart(t) - element.x;
        return { clipPath: `polygon(-4000px 0px, ${lead - top * TAN22}px 0px, ${lead - bottom * TAN22}px ${element.h}px, -4000px ${element.h}px)` };
      }));
    }
    if (m.fade) play(inner.current, sampled(m.fade[0], m.fade[1], (t) => ({ opacity: rest * t })));
    if (m.shift) { const [a, b, dx] = m.shift; play(inner.current, sampled(a, b, (t) => ({ transform: `translateX(${-dx * (1 - easeOut(t))}px)` }))); }
    if (m.pop) play(inner.current, sampled(m.pop[0], m.pop[1], (t) => ({ transform: `scale(${0.75 + 0.25 * easeBack(clamp01(t))})` })));
    if (m.sweep && glint.current) {
      const [a, b, from, to, cy, width] = m.sweep;
      glint.current.style.transformOrigin = `0 ${cy - element.y}px`;
      play(glint.current, sampled(a, b, (t) => ({ transform: `translateX(${from + (to - from) * easeCubic(t) - element.x}px) skewX(-22deg)`, opacity: t <= 0 || t >= 1 ? 0 : 1 })));
      glint.current.style.width = `${width * 6}px`;
    }
    return () => out.forEach((anim) => anim.cancel());
    // Motion plays once when the layer goes on air.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(element.motion), epoch]);
}

/** Gaussian white band (exp(-(d/w)^2) * amount), centred in a 6w-wide strip. */
function glintBand(amount: number) {
  const stops = [-3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3].map((d) => `rgba(255,255,255,${Math.round(amount * Math.exp(-(d * d)) * 1000) / 1000}) ${Math.round(((d + 3) / 6) * 1000) / 10}%`);
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

/** Element with frame-exact lower-third motion: outer box carries the wipe, inner box the shape and the rest. */
function MotionBox({ element, className, style, children }: { element: FgcTitleElement; className: string; style: CSSProperties; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const glint = useRef<HTMLDivElement>(null);
  useMotion(element, outer, inner, glint);
  const sweep = element.motion?.sweep;
  return (
    <div ref={outer} className="absolute" style={{ left: style.left, top: style.top, width: style.width, height: style.height }} data-fx="motion">
      <div ref={inner} className={className} style={{ ...style, left: 0, top: 0, transformOrigin: "center" }}>
        {children}
        {sweep ? <div ref={glint} className="pointer-events-none absolute top-0 left-0 h-full" style={{ background: glintBand(sweep[6]), marginLeft: `${-sweep[5] * 3}px`, opacity: 0 }} /> : null}
      </div>
    </div>
  );
}

/**
 * One positioned layer element with its on-air effects. Effects only use transform/opacity/filter,
 * so moving or resizing the layer in the editor never changes how they play.
 *  - enter "slide": translateY(-70px) and opacity 0 to rest; transform .7s SLIDE_EASE, opacity .4s, 60ms after mount.
 *  - anim "pulse": on value change, brightness(1.6) scale(1.12) back to none over .6s ease-out.
 */
function FxBox(props: { element: FgcTitleElement; value: string; unit: (px: number) => string; className: string; style: CSSProperties; children: ReactNode }) {
  if (props.element.motion) return <MotionBox element={props.element} className={props.className} style={props.style}>{props.children}</MotionBox>;
  return <SlideBox {...props} />;
}

function SlideBox({ element, value, unit, className, style, children }: { element: FgcTitleElement; value: string; unit: (px: number) => string; className: string; style: CSSProperties; children: ReactNode }) {
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

/** Layer picture. `fit: "cover"` crops bound art (e.g. character skin) to the box; a missing image falls back to `src`. */
export function LayerPicture({ element, value, unit }: { element: FgcTitleElement; value: string; unit: (px: number) => string }) {
  const [broken, setBroken] = useState("");
  const src = broken === value && element.src ? element.src : value;
  const fallback = !!element.src && src === element.src;
  const cover = element.kind === "image" || (element.fit === "cover" && !fallback);
  const pad = fallback && element.fallbackPad ? `${unit(element.fallbackPad[0])} ${unit(element.fallbackPad[1])}` : undefined;
  return (
    <img
      src={src}
      alt=""
      onError={() => setBroken(value)}
      className={`pointer-events-none h-full w-full ${cover ? "object-cover" : "object-contain"}`}
      style={{ objectPosition: cover && element.focus ? element.focus : undefined, padding: pad, boxSizing: "border-box" }}
    />
  );
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
  if (element.partnerCards?.length) return <PartnerCards element={element} unit={unit} list={list} />;
  if (element.partnerLayout === "stack") return <PartnerStack element={element} unit={unit} list={list} on={on} />;
  if (typeof element.partnerSplit === "number") {
    const split = element.partnerSplit;
    const gap = element.partnerGap ?? 14;
    const pad = 6;
    const logoW = Math.max(0, split - gap - pad);
    const textW = Math.max(0, element.w - split - gap - pad);
    return (
      <div className="absolute inset-0">
        {list.map((sponsor, index) => (
          <div key={sponsor.id || index} className="absolute inset-0" style={{ opacity: index === on ? 1 : 0, transition: "opacity .8s" }}>
            {sponsor.logo ? (
              <div className="absolute flex items-center justify-end" style={{ left: unit(pad), width: unit(logoW), top: 0, bottom: 0 }}>
                <img src={sponsor.logo} alt="" style={{ maxHeight: unit(Math.min(34, element.h - 12)), maxWidth: "100%", objectFit: "contain" }} />
              </div>
            ) : null}
            {sponsor.name ? (
              <div className="absolute flex items-center overflow-hidden" style={{ left: unit(split + gap), width: unit(textW), top: 0, bottom: 0, justifyContent: "flex-start", textAlign: "left", textTransform: element.caps ? "uppercase" : undefined }}>
                <FitText text={sponsor.name} fontSize={unit(element.size)} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="absolute inset-0">
      {list.map((sponsor, index) => (
        <div
          key={sponsor.id || index}
          className="absolute inset-0 flex items-center justify-center"
          style={{ gap: unit(10), padding: `0 ${unit(8)}`, opacity: index === on ? 1 : 0, transition: "opacity .8s" }}
        >
          {sponsor.logo ? <img src={sponsor.logo} alt="" style={{ flexShrink: 0, maxHeight: unit(26), maxWidth: unit(110) }} /> : null}
          {sponsor.name ? (
            <div className="flex h-full min-w-0 items-center" style={{ flex: "0 1 auto", textTransform: element.caps ? "uppercase" : undefined }}>
              <FitText text={sponsor.name} fontSize="1em" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Scoreboard SSI partners: the built-in cards first, then the Production partners, one rotation
 * (same .8s crossfade and sponsorSeconds as PartnerSlides).
 */
function PartnerCards({ element, unit, list }: { element: FgcTitleElement; unit: (px: number) => string; list: ReturnType<typeof sponsorList> }) {
  const fgc = useFgcStore((s) => s.fgc);
  const cards = element.partnerCards || [];
  const count = cards.length + list.length;
  const on = Math.floor(Date.now() / (sponsorSeconds(fgc) * 1000)) % count;
  const slide = (index: number): CSSProperties => ({ opacity: index === on ? 1 : 0, transition: "opacity .8s", gap: unit(8), padding: `0 ${unit(8)}` });
  return (
    <div className="absolute inset-0">
      {cards.map((card, index) => (
        <div key={card.id} className="absolute inset-0 flex items-center justify-center" style={slide(index)}>
          {card.label ? (
            <small style={{ fontFamily: card.font || undefined, fontWeight: 600, fontSize: unit(10), letterSpacing: unit(2), lineHeight: unit(11), color: "#AFB4B6", textAlign: "right", whiteSpace: "pre-line", textTransform: "uppercase" }}>{card.label}</small>
          ) : null}
          {card.logo ? <img src={card.logo} alt="" style={{ flexShrink: 0, maxHeight: unit(card.logoH || 26), maxWidth: card.logoW ? unit(card.logoW) : "none" }} /> : null}
          {card.name ? <i style={{ fontStyle: "normal", fontFamily: card.font || undefined, fontWeight: 600, fontSize: unit(15), letterSpacing: unit(0.3), whiteSpace: "nowrap", textTransform: "none" }}>{card.name}</i> : null}
        </div>
      ))}
      {list.map((sponsor, index) => (
        <div key={sponsor.id || index} className="absolute inset-0 flex items-center justify-center" style={{ ...slide(cards.length + index), gap: unit(10) }}>
          {sponsor.logo ? <img src={sponsor.logo} alt="" style={{ flexShrink: 0, maxHeight: unit(26), maxWidth: unit(110) }} /> : null}
          {sponsor.name ? (
            <div className="flex h-full min-w-0 items-center" style={{ flex: "0 1 auto", textTransform: element.caps ? "uppercase" : undefined }}>
              <FitText text={sponsor.name} fontSize="1em" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// Local TSH flag pack (same files TSH layouts reference as country.asset); flagcdn as the network fallback.
const TSH_COUNTRY_FLAGS = "/tsh/layout/scoreboard_vgbootcampy_neo/assets/country_flag";

function chipFlags(location: boolean, bind: string, set: ReturnType<typeof liveSet>): string[][] {
  const hit = bind.match(/^p([12])\.region$/);
  if (!hit || !location) return [];
  const player = (hit[1] === "1" ? set?.p1 : set?.p2) as FgcPlayer | null | undefined;
  if (!player) return [];
  const out: string[][] = [];
  const remote = countryFlagUrl(player.country || "", player.flag || "");
  const iso = remote.match(/\/([a-z]{2})\.png$/)?.[1];
  if (iso) out.push([`${TSH_COUNTRY_FLAGS}/${iso}.png`, remote]);
  const state = stateFlagUrl(player.country || "", player.flag || "", player.region || "");
  if (state) out.push([state]);
  return out;
}

function FlagImg({ sources, onFail }: { sources: string[]; onFail: () => void }) {
  const [index, setIndex] = useState(0);
  if (index >= sources.length) return null;
  // TSH pack flags are 92x92 with the 92x66 flag centred in transparent padding: crop to the flag itself.
  const padded = sources[index].includes("/country_flag/");
  return (
    <img
      src={sources[index]}
      alt=""
      onError={() => (index + 1 >= sources.length ? onFail() : setIndex(index + 1))}
      style={{ height: "100%", width: "auto", aspectRatio: padded ? "92 / 66" : undefined, objectFit: padded ? "cover" : "contain", boxShadow: "0 0 0 1px rgba(255,255,255,0.55)", flex: "0 0 auto" }}
    />
  );
}

function FlagChip({ flags, element, text, unit }: { flags: string[][]; element: FgcTitleElement; text: string; unit: (value: number) => string }) {
  const [failed, setFailed] = useState<number[]>([]);
  const live = flags.map((sources, i) => ({ sources, i })).filter((item) => !failed.includes(item.i));
  if (!live.length) return text ? <ElementWords element={element} text={text} fontSize={element.size} unit={unit} /> : null;
  return (
    <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", gap: unit(6), padding: `${unit(3)} ${unit(10)}`, boxSizing: "border-box" }}>
      {live.map((item) => (
        <FlagImg key={item.sources.join("|")} sources={item.sources} onFail={() => setFailed((list) => [...list, item.i])} />
      ))}
    </div>
  );
}

/**
 * Commentators ROK partners: logo centred over its label, never cut (the label shrinks to fit, no ellipsis).
 * Same list, index and sponsorSeconds as PartnerSlides; the change slides up 24px with a 20-frame ease-in-out
 * cubic (build.py slot_cycle T=20, dy=24), so every unit on the page changes on the same tick.
 */
/** Long partner labels go on two balanced lines (split at a word) instead of shrinking to a sliver. */
function partnerLines(label: string): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (label.length <= 26 || words.length < 2) return label ? [label] : [];
  let best = 1;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    const top = words.slice(0, best).join(" ").length;
    if (Math.abs(a - b) < Math.abs(top - words.slice(best).join(" ").length)) best = i;
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

function PartnerStack({ element, unit, list, on }: { element: FgcTitleElement; unit: (px: number) => string; list: ReturnType<typeof sponsorList>; on: number }) {
  const [prev, setPrev] = useState(-1);
  const last = useRef(on);
  useEffect(() => {
    if (last.current === on) return;
    setPrev(last.current);
    last.current = on;
    const timer = window.setTimeout(() => setPrev(-1), 400);
    return () => window.clearTimeout(timer);
  }, [on]);
  const dy = element.h * 0.29;
  const move = "transform 333ms cubic-bezier(.65,0,.35,1), opacity 333ms cubic-bezier(.65,0,.35,1)";
  return (
    <div className="absolute inset-0">
      {list.map((sponsor, index) => {
        const state = index === on ? "on" : index === prev ? "out" : "next";
        const label = sponsor.name ? (element.caps ? sponsor.name.toUpperCase() : sponsor.name) : "";
        return (
          <div
            key={sponsor.id || index}
            data-partner={state}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ gap: unit(element.h * 0.1), padding: `${unit(element.h * 0.1)} ${unit(10)}`, opacity: state === "on" ? 1 : 0, transform: state === "on" ? "none" : `translateY(${unit(state === "out" ? -dy : dy)})`, transition: state === "next" ? "none" : move }}
          >
            {sponsor.logo ? <img src={sponsor.logo} alt="" className="block min-h-0 object-contain" style={{ maxHeight: unit(!label ? element.h * 0.62 : partnerLines(label).length > 1 ? element.h * 0.36 : element.h * 0.42), maxWidth: "100%" }} /> : null}
            {partnerLines(label).map((line, row, lines) => (
              <div key={row} className="w-full flex-none text-center" style={{ height: unit(sponsor.logo ? element.size * 1.2 : element.size * (lines.length > 1 ? 1.5 : 2)), marginTop: row ? unit(-element.h * 0.07) : undefined }}>
                <FitText text={line} fontSize={sponsor.logo ? element.size : element.size * (lines.length > 1 ? 1.3 : 1.6)} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function CustomLayout({ editing = false, titleId = "", fallback }: { editing?: boolean; titleId?: string; fallback?: () => FgcTitle }) {
  useTitleImages();
  const fgc = useLiveFgc();
  const set = liveSet(fgc);
  // Built-in templates always render the current template; an older saved copy (from the removed editor button) is ignored.
  const saved = null as FgcTitle | null;
  const title = fallback ? normalizeTitle(saved ?? fallback()) : activeTitle(fgc, titleId);
  const rotating = title.elements.some((element) => element.bind.startsWith("sponsor.") || element.anim === "partners");
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setTick((n) => n + 1), 250);
    return () => window.clearInterval(timer);
  }, [rotating]);
  const [epoch] = useState(() => (typeof performance !== "undefined" ? performance.now() : 0));
  return (
    <OnAirClock.Provider value={epoch}>
    <div className="relative h-full w-full">
      {titleStack(title).map((element) => {
        const words = element.kind === "text" || element.kind === "ticker";
        const picture = element.kind === "image" || element.kind === "rect" || element.kind === "circle" || element.kind === "triangle";
        const pips = element.pips ? gamesWon(set, element.pips) : null;
        const value = pips ? `${pips.won}/${pips.total}` : picture ? titleImage(fgc, set, element) : elementText(element, titleText(fgc, set, element.bind, element.text));
        const flags = !picture && !pips ? chipFlags(fgc.settings.show.location, element.bind, set) : [];
        if (element.hideEmpty && !value && !flags.length) return null;
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
              value ? <LayerPicture element={element} value={value} unit={px} /> : null
            ) : element.kind === "ticker" ? (
              <span className="inline-block whitespace-nowrap" style={{ animation: "rok-ticker 14s linear infinite" }}>{titleText(fgc, set, element.bind, element.text)}</span>
            ) : pips ? (
              <GamePips element={element} won={pips.won} total={pips.total} unit={px} />
            ) : element.anim === "partners" ? (
              <PartnerSlides element={element} unit={px} />
            ) : flags.length ? (
              <FlagChip flags={flags} element={element} text={value} unit={px} />
            ) : words ? (
              <ElementWords element={element} text={value} fontSize={element.size} unit={px} />
            ) : null}
          </TitleMotion>
        </FxBox>
        );
      })}
    </div>
    </OnAirClock.Provider>
  );
}

export function FgcOverlay({ source, titleId = "" }: { source: string; titleId?: string }) {
  const id = (source || "hud") as FgcOverlayId;
  const graphic = FgcGraphic({ id });
  if (graphic) return graphic;
  // Fixed 1920x1080 stage scaled to fit whatever window or preview hosts it (scale 1 at 1920x1080).
  if (id === "scoreboard-rok") return <ScaleFrame><CustomLayout titleId={SCOREBOARD_ROK_ID} fallback={scoreboardRokTitle} /></ScaleFrame>;
  if (id === "scoreboard-ssi") return <ScaleFrame><CustomLayout titleId={SCOREBOARD_SSI_ID} fallback={scoreboardSsiTitle} /></ScaleFrame>;
  if (id === "versus-ssi") return <ScaleFrame><CustomLayout titleId={VERSUS_SSI_ID} fallback={versusSsiTitle} /></ScaleFrame>;
  if (id === "versus-rok") return <ScaleFrame><CustomLayout titleId={VERSUS_ROK_ID} fallback={versusRokTitle} /></ScaleFrame>;
  if (id === "commentators-rok") return <ScaleFrame><CustomLayout titleId={COMMENTATORS_ROK_ID} fallback={commentatorsRokTitle} /></ScaleFrame>;
  if (id === "casters") return <Casters />;
  if (id === "lower") return <Lower />;
  if (id === "winner") return <Winner />;
  if (id === "custom") return <CustomLayout titleId={titleId} />;
  return <FgcHud />;
}
