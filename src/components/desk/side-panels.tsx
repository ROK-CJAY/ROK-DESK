import { Plus, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Field, NativeSelect } from "@/components/desk/field";
import { RoundClock } from "@/components/desk/round-clock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { gameOf, GAME_LIST, formatsInFamily, currentFamily, isCommanderLane, casterTabletPath, playerTabletPath, signupPath, supportsRokLayout, tabletPath, type GameId } from "@/lib/games";
import { deskLooksLikeTest } from "@/lib/test-fixtures";
import { blankSponsor, readOverlayImage, readSponsorLogo } from "@/lib/sponsors";
import { useDeskStore } from "@/lib/desk-store";
import { useTournamentStore } from "@/lib/tournament-store";
import { viewsFor, deskForGame, emptyDesk, type BracketViewId } from "@/lib/tournament-types";
import { overlayPath } from "@/components/desk/sources";
import {
  emptySpotlight,
  type LowerThirdMode,
  type RosterSide,
  type SlateKind,
  type TableSize,
  seatsFor,
  isCommanderTable,
  resourceLimit,
  MATCH_SLOTS,
  MATCH_SLOT_SHORT,
  type MatchSlot,
} from "@/lib/desk-types";
import { useEffect, useState } from "react";

export function EventPanel() {
  const desk = useDeskStore((s) => s.desk);
  const patch = useDeskStore((s) => s.patch);
  const applyFormat = useDeskStore((s) => s.applyFormat);
  const setTableSize = useDeskStore((s) => s.setTableSize);
  const setResourceCap = useDeskStore((s) => s.setResourceCap);
  const loadTestMode = useDeskStore((s) => s.loadTestMode);
  const game = gameOf(desk.gameId);
  const family = currentFamily(desk);
  const formatOptions = desk.gameId === "mtg" ? formatsInFamily(game, family) : game.formats;
  const formatValue = formatOptions.some((f) => f.label === desk.formatName)
    ? desk.formatName
    : (formatOptions[0]?.label ?? desk.formatName);
  const commander = isCommanderLane(desk);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Event</p>
      <div className="mt-3 grid gap-3">
        <Field label="Show title">
          <Input
            value={desk.eventName}
            onChange={(e) => patch({ eventName: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phase">
            <Input
              value={desk.eventPhase}
              onChange={(e) => patch({ eventPhase: e.target.value })}
            />
          </Field>
          <Field label="Round">
            <Input
              value={desk.roundName}
              onChange={(e) => patch({ roundName: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Format">
          <NativeSelect
            key={desk.gameId}
            value={formatValue}
            onChange={(e) => {
              const preset = game.formats.find((f) => f.label === e.target.value);
              if (preset) applyFormat(preset);
              else patch({ formatName: e.target.value });
            }}
          >
            {formatOptions.map((f) => (
              <option key={`${desk.gameId}-${f.id}`} value={f.label}>
                {f.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {commander ? (
          <Field label="Pod">
            <NativeSelect
              value={String(desk.tableSize)}
              onChange={(e) => setTableSize(Number(e.target.value) as TableSize)}
            >
              <option value="2">Duel · 2</option>
              <option value="3">3 players</option>
              <option value="4">4 players</option>
            </NativeSelect>
          </Field>
        ) : (
          <Field label="Best of">
            <NativeSelect
              value={String(desk.bestOf)}
              onChange={(e) =>
                patch({ bestOf: Number(e.target.value) as 1 | 3 | 5 | 7 })
              }
            >
              {[1, 3, 5, 7].map((n) => (
                <option key={n} value={n}>
                  Bo{n}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        {desk.gameId === "pokemon-tcg" ? (
          <Field label="Prizes">
            <NativeSelect
              value={String(resourceLimit(desk))}
              onChange={(e) => setResourceCap(Number(e.target.value))}
            >
              {[6, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "prize" : "prizes"}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <Field label="Sponsor line">
          <Input
            value={desk.sponsorLine}
            onChange={(e) => patch({ sponsorLine: e.target.value })}
          />
        </Field>
        <div className="grid gap-2">
          <p className="text-[0.7rem] text-muted">Event logo</p>
          <div className="flex items-center gap-3">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-2">
              {desk.eventLogo ? (
                <img src={desk.eventLogo} alt="" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[0.6rem] text-subtle">Logo</span>
              )}
            </div>
            <div className="grid min-w-0 flex-1 gap-1.5">
              <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted">
                {desk.eventLogo ? "Replace logo" : "Upload logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    void readOverlayImage(file).then((eventLogo) => patch({ eventLogo }));
                  }}
                />
              </label>
              {desk.eventLogo ? (
                <Button variant="ghost" size="sm" onClick={() => patch({ eventLogo: "" })}>
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Test mode</p>
            <p className="text-[0.65rem] leading-relaxed text-subtle">
              {deskLooksLikeTest(desk)
                ? "Demo field is live. Turn off to restore the last real seats, casters, and queue."
                : `Load 8 demo players for ${game.short}. Your current seats are saved until you turn this off.`}
            </p>
          </div>
          <Switch checked={deskLooksLikeTest(desk)} onCheckedChange={() => loadTestMode()} aria-label="Toggle test mode" />
        </div>
        <RoundClock />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="flex-1" asChild>
            <a href={overlayPath(desk.gameId, "stream-clock")} target="_blank" rel="noreferrer">
              Open stream clock
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              void navigator.clipboard.writeText(
                `${window.location.origin}${overlayPath(desk.gameId, "stream-clock")}`,
              );
            }}
          >
            Copy stream clock URL
          </Button>
        </div>
      </div>
    </section>
  );
}

export function CasterPanel() {
  const desk = useDeskStore((s) => s.desk);
  const patch = useDeskStore((s) => s.patch);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Casters</p>
      <div className="mt-3 grid gap-4">
        {desk.casters.map((caster, index) => (
          <div key={index} className="grid gap-2">
            <p className="text-xs text-subtle">Caster {index + 1}</p>
            <Input
              value={caster.name}
              placeholder="Name"
              onChange={(e) => {
                const next = [...desk.casters] as typeof desk.casters;
                next[index] = { ...next[index]!, name: e.target.value };
                patch({ casters: next });
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={caster.handle}
                placeholder="Handle"
                onChange={(e) => {
                  const next = [...desk.casters] as typeof desk.casters;
                  next[index] = { ...next[index]!, handle: e.target.value };
                  patch({ casters: next });
                }}
              />
              <Input
                value={caster.role}
                placeholder="Role"
                onChange={(e) => {
                  const next = [...desk.casters] as typeof desk.casters;
                  next[index] = { ...next[index]!, role: e.target.value };
                  patch({ casters: next });
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SponsorPanel() {
  const desk = useDeskStore((s) => s.desk);
  const patch = useDeskStore((s) => s.patch);

  const update = (id: string, partial: Partial<(typeof desk.sponsors)[number]>) => {
    patch({
      sponsors: desk.sponsors.map((row) => (row.id === id ? { ...row, ...partial } : row)),
    });
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Sponsors</p>
      <p className="mt-1 text-[0.65rem] leading-relaxed text-subtle">
        Logos rotate on the Sponsors overlay and in the HUD pack. Leave the list empty and the source stays transparent.
      </p>
      <div className="mt-3 grid gap-3">
        {desk.sponsors.map((row) => (
          <div key={row.id} className="grid gap-2 rounded-lg bg-surface-2 p-2">
            <div className="flex items-center gap-2">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-bg">
                {row.logo ? (
                  <img src={row.logo} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[0.6rem] text-subtle">Logo</span>
                )}
              </div>
              <Input
                value={row.name}
                placeholder="Sponsor name"
                onChange={(e) => update(row.id, { name: e.target.value })}
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove sponsor"
                onClick={() => patch({ sponsors: desk.sponsors.filter((item) => item.id !== row.id) })}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted">
              <span>{row.logo ? "Replace logo" : "Upload logo"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  void readSponsorLogo(file).then((logo) => update(row.id, { logo }));
                }}
              />
            </label>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => patch({ sponsors: [...desk.sponsors, blankSponsor()] })}
        >
          <Plus className="size-3.5" />
          Add sponsor
        </Button>
        {desk.sponsors.length > 1 ? (
          <Field label="Rotate every">
            <NativeSelect
              value={String(desk.sponsorSeconds)}
              onChange={(e) => patch({ sponsorSeconds: Number(e.target.value) })}
            >
              {[4, 6, 8, 10, 12, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} seconds
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </div>
    </section>
  );
}

export function QueuePanel() {
  const desk = useDeskStore((s) => s.desk);
  const patch = useDeskStore((s) => s.patch);
  const setPlayer = useDeskStore((s) => s.setPlayer);
  const resetMatch = useDeskStore((s) => s.resetMatch);

  const load = (id: string) => {
    const match = desk.queue.find((m) => m.id === id);
    if (!match) return;
    setPlayer("p1", { name: match.p1, score: 0 });
    setPlayer("p2", { name: match.p2, score: 0 });
    patch({ roundName: match.round, winnerSide: null });
    resetMatch();
    setPlayer("p1", { name: match.p1 });
    setPlayer("p2", { name: match.p2 });
    patch({
      queue: desk.queue.filter((m) => m.id !== id),
      roundName: match.round,
    });
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Queue</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            patch({
              queue: [
                ...desk.queue,
                {
                  id: `q-${Date.now()}`,
                  p1: "",
                  p2: "",
                  round: desk.roundName,
                  note: "",
                },
              ],
            })
          }
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>
      <ul className="mt-3 space-y-2">
        {desk.queue.length === 0 ? (
          <li className="rounded-lg bg-surface-2 px-3 py-4 text-sm text-muted">
            No matches waiting. Add the next feature match.
          </li>
        ) : (
          desk.queue.map((match) => (
            <li key={match.id} className="rounded-lg bg-surface-2 p-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={match.p1}
                  placeholder="Player 1"
                  onChange={(e) =>
                    patch({
                      queue: desk.queue.map((m) =>
                        m.id === match.id ? { ...m, p1: e.target.value } : m,
                      ),
                    })
                  }
                />
                <Input
                  value={match.p2}
                  placeholder="Player 2"
                  onChange={(e) =>
                    patch({
                      queue: desk.queue.map((m) =>
                        m.id === match.id ? { ...m, p2: e.target.value } : m,
                      ),
                    })
                  }
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={match.round}
                  placeholder="Round"
                  onChange={(e) =>
                    patch({
                      queue: desk.queue.map((m) =>
                        m.id === match.id ? { ...m, round: e.target.value } : m,
                      ),
                    })
                  }
                />
                <Button variant="secondary" size="sm" onClick={() => load(match.id)}>
                  Load
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    patch({ queue: desk.queue.filter((m) => m.id !== match.id) })
                  }
                  aria-label="Remove match"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export function ShowPanel() {
  const desk = useDeskStore((s) => s.desk);
  const patch = useDeskStore((s) => s.patch);
  const snapScorebug = useDeskStore((s) => s.snapScorebug);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Show control</p>
      <div className="mt-3 grid gap-3">
        <Field label="Hold slate">
          <NativeSelect
            value={desk.slate}
            onChange={(e) => patch({ slate: e.target.value as SlateKind })}
          >
            <option value="hidden">Hidden (transparent)</option>
            <option value="starting">Starting soon</option>
            <option value="brb">Be right back</option>
            <option value="thanks">Thanks for watching</option>
            <option value="tech">Technical pause</option>
          </NativeSelect>
        </Field>
        <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
          <div>
            <p className="text-sm">Lower third</p>
            <p className="text-xs text-muted">Player / caster sting</p>
          </div>
          <Switch
            checked={desk.lowerThird.visible}
            onCheckedChange={(visible) =>
              patch({ lowerThird: { ...desk.lowerThird, visible } })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect
            value={desk.lowerThird.mode}
            onChange={(e) =>
              patch({
                lowerThird: { ...desk.lowerThird, mode: e.target.value as LowerThirdMode },
              })
            }
          >
            <option value="player">Player</option>
            <option value="caster">Caster</option>
            <option value="custom">Custom</option>
          </NativeSelect>
          <NativeSelect
            value={desk.lowerThird.side}
            onChange={(e) =>
              patch({
                lowerThird: {
                  ...desk.lowerThird,
                  side: e.target.value as typeof desk.lowerThird.side,
                },
              })
            }
          >
            <option value="p1">Player 1</option>
            <option value="p2">Player 2</option>
            {isCommanderTable(desk) ? (
              <>
                <option value="p3">Player 3</option>
                <option value="p4">Player 4</option>
              </>
            ) : null}
            <option value="c1">Caster 1</option>
            <option value="c2">Caster 2</option>
          </NativeSelect>
        </div>
        {desk.lowerThird.mode === "custom" ? (
          <div className="grid gap-2">
            <Input
              value={desk.lowerThird.title}
              placeholder="Title"
              onChange={(e) =>
                patch({ lowerThird: { ...desk.lowerThird, title: e.target.value } })
              }
            />
            <Input
              value={desk.lowerThird.subtitle}
              placeholder="Subtitle"
              onChange={(e) =>
                patch({
                  lowerThird: { ...desk.lowerThird, subtitle: e.target.value },
                })
              }
            />
          </div>
        ) : null}
        <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
          <span className="text-sm">Show resources on scorebug</span>
          <Switch
            checked={desk.showResources}
            onCheckedChange={(showResources) => patch({ showResources })}
          />
        </div>
        {desk.gameId === "pokemon-tcg" || desk.gameId === "mtg" ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm">Card overlay</p>
              <p className="truncate text-xs text-muted">
                {desk.cardSpotlight.visible && desk.cardSpotlight.name
                  ? desk.cardSpotlight.name
                  : "Tap a card on the judge tablet"}
              </p>
            </div>
            {desk.cardSpotlight.visible ? (
              <Button variant="outline" size="sm" onClick={() => patch({ cardSpotlight: emptySpotlight() })}>
                Clear
              </Button>
            ) : null}
          </div>
        ) : null}
        {desk.gameId === "pokemon-vgc" ? (
          <Field label="Team preview">
            <NativeSelect
              value={desk.rosterSide}
              onChange={(e) => patch({ rosterSide: e.target.value as RosterSide })}
            >
              <option value="hidden">Hidden</option>
              <option value="p1">Player 1 (right)</option>
              <option value="p2">Player 2 (left)</option>
              <option value="both">Both</option>
            </NativeSelect>
          </Field>
        ) : null}
        {isCommanderTable(desk) ? null : (
        <div className="grid grid-cols-2 gap-2">
          <NativeSelect
            value={desk.scorebugStyle}
            onChange={(e) =>
              patch({ scorebugStyle: e.target.value as typeof desk.scorebugStyle })
            }
          >
            <option value="bar">Scorebug · bar</option>
            <option value="split">Scorebug · split</option>
            {supportsRokLayout(desk) ? (
              <option value="rok">ROK Layout</option>
            ) : null}
            {desk.gameId === "pokemon-tcg" ? (
              <option value="play">Play Layout</option>
            ) : null}
          </NativeSelect>
          {desk.scorebugStyle === "rok" ? (
            <p className="self-center text-[0.7rem] text-muted">
              {desk.gameId === "mtg"
                ? "Cameras, life, poison, W/L/D, Best-of diamonds, clock, Magic card well."
                : desk.gameId === "yugioh"
                  ? "Cameras, LP, W/L/D, Best-of diamonds, clock, Yu-Gi-Oh! card well."
                  : desk.gameId === "pokemon-tcg"
                    ? "Cameras, prize pokéballs, W/L/D, Best-of diamonds, clock, Pokémon card well."
                    : desk.gameId === "riftbound"
                      ? "Cameras, point ladder, W/L/D, Best-of diamonds, clock, Riftbound card well."
                      : desk.gameId === "swu"
                        ? "Cameras, base HP, initiative, W/L/D, Best-of diamonds, clock, SWU card well."
                      : "Cameras, lore ladder, inks, W/L/D, diamonds, clock, card well."}
            </p>
          ) : desk.scorebugStyle === "play" ? (
            <p className="self-center text-[0.7rem] text-muted">
              Side rails: prizes, active, bench. Energy / Supporter / Retreat. Show P1 / P2 over the bench.
            </p>
          ) : (
            <NativeSelect
              value={desk.scorebugPosition}
              onChange={(e) =>
                snapScorebug(e.target.value as typeof desk.scorebugPosition)
              }
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
            </NativeSelect>
          )}
        </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {seatsFor(desk.tableSize).map((seat) => (
            <Button
              key={`game-${seat}`}
              variant={desk.gameWinnerSide === seat ? "live" : "secondary"}
              onClick={() =>
                patch({ gameWinnerSide: desk.gameWinnerSide === seat ? null : seat, winnerSide: null })
              }
            >
              Game {seat.toUpperCase()}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {seatsFor(desk.tableSize).map((seat) => (
            <Button
              key={`match-${seat}`}
              variant={desk.winnerSide === seat ? "live" : "secondary"}
              onClick={() =>
                patch({ winnerSide: desk.winnerSide === seat ? null : seat, gameWinnerSide: null })
              }
            >
              Match {seat.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GameStrip({ onPick }: { onPick: (id: GameId) => void }) {
  const desk = useDeskStore((s) => s.desk);
  const applyMtgLane = useDeskStore((s) => s.applyMtgLane);
  const applyMatchSlot = useDeskStore((s) => s.applyMatchSlot);
  const commander = isCommanderLane(desk);
  const slot = (desk.matchSlot ?? 1) as MatchSlot;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
        {GAME_LIST.map((game) => {
          const active = desk.gameId === game.id;
          return (
            <button
              key={game.id}
              type="button"
              data-game={game.id}
              onClick={() => onPick(game.id)}
              className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium tracking-wide whitespace-nowrap transition-colors duration-150 ${
                active
                  ? "border-game bg-game/15 text-fg"
                  : "border-border bg-surface text-muted hover:text-fg"
              }`}
            >
              {game.short}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
          {MATCH_SLOTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => applyMatchSlot(n)}
              className={`rounded-md border px-3 py-1 text-xs font-medium tracking-wide ${
                slot === n
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-surface-2 text-muted hover:text-fg"
              }`}
            >
              {MATCH_SLOT_SHORT[n]}
            </button>
          ))}
        </div>
      {desk.gameId === "mtg" ? (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => applyMtgLane("constructed")}
            className={`rounded-md border px-3 py-1 text-xs font-medium tracking-wide ${
              !commander
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-surface-2 text-muted hover:text-fg"
            }`}
          >
            Constructed
          </button>
          <button
            type="button"
            onClick={() => applyMtgLane("commander")}
            className={`rounded-md border px-3 py-1 text-xs font-medium tracking-wide ${
              commander
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-surface-2 text-muted hover:text-fg"
            }`}
          >
            Commander
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function BracketPanel() {
  const hydrate = useTournamentStore((s) => s.hydrate);
  const ready = useTournamentStore((s) => s.ready);
  const t = useTournamentStore((s) => s.tournament);
  const patch = useTournamentStore((s) => s.patch);
  const deskGame = useDeskStore((s) => s.desk.gameId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ready) void hydrate();
  }, [ready, hydrate]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${overlayPath(deskGame, "bracket")}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  const lane = deskForGame(t, deskGame);
  const game = gameOf(deskGame);
  const live = lane.matches.find((m) => m.id === lane.streamMatchId);
  const p1 = live ? lane.entrants.find((e) => e.id === live.p1.entrantId) : null;
  const p2 = live ? lane.entrants.find((e) => e.id === live.p2.entrantId) : null;
  const shape =
    lane.bracketType === "double" ? "Double elim" : lane.bracketType === "swiss" ? "Swiss" : "Single elim";

  const setOverlayView = (overlayView: BracketViewId) => {
    if (t.gameId === deskGame) {
      patch({ overlayView });
      return;
    }
    const current = t.desks[deskGame] ?? emptyDesk(deskGame);
    patch({ desks: { ...t.desks, [deskGame]: { ...current, overlayView } } });
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Bracket widget</p>
      <p className="mt-1 text-sm text-muted">
        {t.name} · {game.short} · {shape} {lane.size}
      </p>
      {live && p1 && p2 ? (
        <p className="mt-2 text-xs text-live">
          On air · {p1.name} vs {p2.name}
        </p>
      ) : lane.matches.length ? (
        <p className="mt-2 text-xs text-subtle">
          Full-screen bracket overlay for {game.short}. Pick a view and copy the URL into the stream.
        </p>
      ) : (
        <p className="mt-2 text-xs text-subtle">
          No bracket yet for {game.short}. Open Tournament to start one for this game.
        </p>
      )}
      <div className="mt-3 grid gap-2">
        <NativeSelect
          value={lane.overlayView}
          onChange={(e) => setOverlayView(e.target.value as BracketViewId)}
        >
          {viewsFor(lane.bracketType).map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </NativeSelect>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy URL"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/tournament">Open TO</Link>
          </Button>
        </div>
        <Button variant="secondary" size="sm" className="w-full" asChild>
          <a href={signupPath(deskGame)} target="_blank" rel="noreferrer">
            Open walk-up sign-up
          </a>
        </Button>
      </div>
    </section>
  );
}

export function PodPanel() {
  const desk = useDeskStore((s) => s.desk);
  const [copied, setCopied] = useState(false);
  const commander = isCommanderTable(desk) || isCommanderLane(desk);
  const vgc = desk.gameId === "pokemon-vgc";
  const tcg = desk.gameId === "pokemon-tcg";
  const mtg = desk.gameId === "mtg";
  const swu = desk.gameId === "swu";
  const ygo = desk.gameId === "yugioh";
  const op = desk.gameId === "one-piece";
  const rift = desk.gameId === "riftbound";
  const lorcana = desk.gameId === "lorcana";
  const slot = desk.matchSlot ?? 1;
  const path = tabletPath(desk.gameId, slot);
  const playerPath = playerTabletPath(desk.gameId, slot);
  const copyPath = mtg && commander ? playerPath : path;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${copyPath}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">
        Tablet · {MATCH_SLOT_SHORT[slot]}
      </p>
      <p className="mt-1 text-sm text-muted">
        {vgc
          ? "Judge tablet — team sheets, remaining Pokémon, score, and the round clock."
          : tcg
            ? "Judge tablet — prizes, score, clock, and a card lookup for the floor."
            : mtg
              ? commander
                ? "Two tablets: the player pad sits on the table for life, poison, and commander damage. The judge tablet keeps Scryfall and match report."
                : "Judge tablet — life, poison, score, clock, and Scryfall card lookup. Open the player tablet if the table wants to tap their own life."
              : swu
                ? "Judge tablet — base HP, score, clock, and SWU-DB card lookup."
                : ygo
                  ? "Judge tablet — life points, score, clock, and YGOPRODeck card lookup."
                  : op
                    ? "Judge tablet — life, DON!!, score, clock, and official OP card lookup."
                    : rift
                      ? "Judge tablet — first-to-8 points, Duel / Match / Skirmish / War, clock, and Riftcodex card lookup."
                      : lorcana
                        ? "Two tablets: the player pad sits with the table for lore, games, and the match clock. The judge tablet keeps Lorcast and match report."
                        : "Player tablet for the live table. Each game uses its own layout."}
      </p>
      {tcg ? (
        <p className="mt-2 text-xs text-ok">Card lookup uses Pokémon TCG Live (TCGdex) data.</p>
      ) : vgc ? (
        <p className="mt-2 text-xs text-ok">Tap a Pokémon to mark it KO. Game / Match report to the desk.</p>
      ) : mtg ? (
        <p className="mt-2 text-xs text-ok">
          {commander
            ? `${desk.formatName} · drop the player tablet in the middle of the table. Judge tablet still reports Wins and looks up cards.`
            : "Type an amount then + / −. Game and Match report to the desk and bracket."}
        </p>
      ) : swu ? (
        <p className="mt-2 text-xs text-ok">Type damage then + / −. Game and Match report to the desk and bracket.</p>
      ) : ygo ? (
        <p className="mt-2 text-xs text-ok">Life points default to 100 ticks. Game and Match report to the desk and bracket.</p>
      ) : op ? (
        <p className="mt-2 text-xs text-ok">Tap life. Type DON!! then + / −. Game and Match report to the desk and bracket.</p>
      ) : rift ? (
        <p className="mt-2 text-xs text-ok">Tap points 1–8. Game and Match report to the desk and bracket. Search cards below on the pad.</p>
      ) : lorcana ? (
        <p className="mt-2 text-xs text-ok">Player tablet: tap lore and game diamonds. Judge tablet still looks up cards and reports the match.</p>
      ) : !commander ? (
        <p className="mt-2 text-xs text-subtle">Open the tablet for the live table of this game.</p>
      ) : (
        <p className="mt-2 text-xs text-ok">{desk.tableSize}-seat table · updates the stream bugs live.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy URL"}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={path} target="_blank" rel="noreferrer">
            Open judge tablet
          </a>
        </Button>
        {mtg || lorcana ? (
          <Button variant={commander || lorcana ? "default" : "outline"} size="sm" asChild>
            <a href={playerPath} target="_blank" rel="noreferrer">
              Open player tablet
            </a>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function CastingPanel() {
  const desk = useDeskStore((s) => s.desk);
  const [copied, setCopied] = useState(false);
  const slot = desk.matchSlot ?? 1;
  const path = casterTabletPath(desk.gameId, slot);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">
        Commentary · {MATCH_SLOT_SHORT[slot]}
      </p>
      <p className="mt-1 text-sm text-muted">
        Casting tablet — names, decks, teams, records, and the match clock for this table. Read-only; casters cannot punch scores.
      </p>
      <p className="mt-2 text-xs text-ok">
        VGC shows the sixes with moves. PTCG shows Active / bench / prizes. Other titles show life, lore, LP, commander, inks, and initiative.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy URL"}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={path} target="_blank" rel="noreferrer">
            Open caster tablet
          </a>
        </Button>
      </div>
    </section>
  );
}

