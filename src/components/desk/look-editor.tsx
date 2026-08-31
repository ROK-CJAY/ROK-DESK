import { NativeSelect } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import type { OverlaySourceId } from "@/components/desk/sources";
import { OVERLAY_SOURCES } from "@/components/desk/sources";
import {
  DEFAULT_LOOK,
  FONT_OPTIONS,
  LOOK_PRESETS,
  applyLookToAll,
  clampAlpha,
  clampRadius,
  clampScale,
  clampStroke,
  clampTracking,
  lookFor,
  looksEqual,
  resetSourceLook,
  setSourceLook,
  type OverlayLook,
  type OverlayLookBook,
} from "@/lib/overlay-look";
import { Switch } from "@/components/ui/switch";

function colorLabels(source: OverlaySourceId) {
  if (source === "winner" || source === "game-win") {
    return { fg: "Name", muted: "Sub", accent: "Kicker", panel: "Panel", live: "Live" };
  }
  if (source === "scorebug" || source === "hud" || source === "versus") {
    return { fg: "Name", muted: "Chrome", accent: "Gold", panel: "Rails", live: "Live" };
  }
  return { fg: "Ink", muted: "Mute", accent: "Accent", panel: "Panel", live: "Live" };
}

export function LookEditor({
  book,
  source,
  onChange,
}: {
  book: OverlayLookBook;
  source: OverlaySourceId;
  onChange: (book: OverlayLookBook) => void;
}) {
  const look = lookFor(book, source);
  const atDefault = looksEqual(look, DEFAULT_LOOK);
  const label = OVERLAY_SOURCES.find((s) => s.id === source)?.name ?? source;
  const colors = colorLabels(source);
  const winBug = source === "winner" || source === "game-win";
  const layout = source === "scorebug" || source === "hud" || source === "versus";

  const set = (partial: Partial<OverlayLook>) => {
    onChange(setSourceLook(book, source, { ...look, ...partial }));
  };

  return (
    <div className="mt-3 grid gap-3 rounded-lg bg-surface-2 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted uppercase">Look · {label}</p>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(applyLookToAll(look, OVERLAY_SOURCES.map((s) => s.id)))}
          >
            Apply to all
          </Button>
          <Button variant="ghost" size="sm" disabled={atDefault} onClick={() => onChange(resetSourceLook(book, source))}>
            Reset
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {LOOK_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => set(preset.look)}
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-fg"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        <Swatch label={colors.fg} value={look.fg} onChange={(fg) => set({ fg })} />
        <Swatch label={colors.muted} value={look.muted} onChange={(muted) => set({ muted })} />
        <Swatch label={colors.accent} value={look.accent} onChange={(accent) => set({ accent })} />
        <Swatch label={colors.panel} value={look.panel} onChange={(panel) => set({ panel })} />
        <Swatch label={colors.live} value={look.live} onChange={(live) => set({ live })} />
      </div>
      <label className="grid gap-1 text-xs text-muted">
        {winBug ? "Name font" : "Names"}
        <NativeSelect value={look.displayFont} onChange={(e) => set({ displayFont: e.target.value as OverlayLook["displayFont"] })}>
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="grid gap-1 text-xs text-muted">
        {winBug ? "Subtitle font" : "Body"}
        <NativeSelect value={look.bodyFont} onChange={(e) => set({ bodyFont: e.target.value as OverlayLook["bodyFont"] })}>
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="grid gap-1 text-xs text-muted">
        {winBug ? "Kicker font" : "Meta / clock"}
        <NativeSelect value={look.monoFont} onChange={(e) => set({ monoFont: e.target.value as OverlayLook["monoFont"] })}>
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <label className="grid gap-1 text-xs text-muted">
          Name outline · {look.strokeWidth}
          <input
            type="range"
            min={0}
            max={6}
            step={1}
            value={look.strokeWidth}
            onChange={(e) => set({ strokeWidth: clampStroke(Number(e.target.value)) })}
            className="w-full accent-accent"
          />
        </label>
        <Swatch label="Stroke" value={look.stroke} onChange={(stroke) => set({ stroke })} />
      </div>
      <label className="grid gap-1 text-xs text-muted">
        Size · {look.scale}%
        <input
          type="range"
          min={70}
          max={140}
          step={5}
          value={look.scale}
          onChange={(e) => set({ scale: clampScale(Number(e.target.value)) })}
          className="w-full accent-accent"
        />
      </label>
      <label className="grid gap-1 text-xs text-muted">
        Panel opacity · {look.panelAlpha}%
        <input
          type="range"
          min={40}
          max={100}
          step={5}
          value={look.panelAlpha}
          onChange={(e) => set({ panelAlpha: clampAlpha(Number(e.target.value)) })}
          className="w-full accent-accent"
        />
      </label>
      <label className="grid gap-1 text-xs text-muted">
        Corners · {look.radius}px
        <input
          type="range"
          min={0}
          max={28}
          step={2}
          value={look.radius}
          onChange={(e) => set({ radius: clampRadius(Number(e.target.value)) })}
          className="w-full accent-accent"
        />
      </label>
      <label className="grid gap-1 text-xs text-muted">
        Name tracking · {look.tracking}
        <input
          type="range"
          min={0}
          max={16}
          step={1}
          value={look.tracking}
          onChange={(e) => set({ tracking: clampTracking(Number(e.target.value)) })}
          className="w-full accent-accent"
        />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-md bg-surface px-2.5 py-2">
        <span className="text-xs text-fg">All-caps names</span>
        <Switch checked={look.uppercase} onCheckedChange={(on) => set({ uppercase: on === true })} />
      </label>
      <p className="rounded-md bg-surface px-2.5 py-2 text-[0.7rem] leading-relaxed text-muted">
        {winBug
          ? "Name, kicker (GAME / MATCH WINNER), and subtitle each have a color and font. Size, tracking, and outline apply to the name."
          : layout
            ? "Name, chrome, gold, rails, and live apply on this overlay for this title only. Switch games and each keeps its own look. Apply to all copies it onto every overlay of this game (scorebug, HUD, versus, clocks…)."
            : "Changes save on their own. This overlay’s look stays on this game. Apply to all copies it onto every source."}
      </p>
    </div>
  );
}

function Swatch({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <label className="grid justify-items-center gap-1 text-[0.62rem] text-muted">
      {label}
      <input
        type="color"
        value={value.length >= 7 ? value.slice(0, 7) : "#f4f4f1"}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full cursor-pointer rounded-md border border-border bg-surface p-0.5"
        aria-label={label}
      />
    </label>
  );
}
