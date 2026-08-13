import { Plus, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Field, NativeSelect } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { gameOf, GAME_LIST, formatsInFamily, currentFamily, isCommanderLane, type GameId } from "@/lib/games";
import { useDeskStore } from "@/lib/desk-store";
import { useTournamentStore } from "@/lib/tournament-store";
import { viewsFor, type BracketViewId } from "@/lib/tournament-types";
import {
  formatClock,
  remainingSeconds,
  type LowerThirdMode,
  type SlateKind,
  type TableSize,
  seatsFor,
  isCommanderTable,
} from "@/lib/desk-types";
import { useEffect, useState } from "react";

export function EventPanel() {
  const desk = useDeskStore((s) => s.desk);
  const patch = useDeskStore((s) => s.patch);
  const applyFormat = useDeskStore((s) => s.applyFormat);
  const setTableSize = useDeskStore((s) => s.setTableSize);
  const toggleTimer = useDeskStore((s) => s.toggleTimer);
  const setTimerMinutes = useDeskStore((s) => s.setTimerMinutes);
  const game = gameOf(desk.gameId);
  const family = currentFamily(desk);
  const formatOptions = desk.gameId === "mtg" ? formatsInFamily(game, family) : game.formats;
  const commander = isCommanderLane(desk);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Format">
            <NativeSelect
              value={desk.formatName}
              onChange={(e) => {
                const preset = game.formats.find((f) => f.label === e.target.value);
                if (preset) applyFormat(preset);
                else patch({ formatName: e.target.value });
              }}
            >
              {formatOptions.map((f) => (
                <option key={f.id} value={f.label}>
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
        </div>
        <Field label="Sponsor line">
          <Input
            value={desk.sponsorLine}
            onChange={(e) => patch({ sponsorLine: e.target.value })}
          />
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2">
          <div>
            <p className="text-xs text-muted">Round clock</p>
            <p className="font-display text-2xl font-semibold tabular-nums">
              {formatClock(remainingSeconds(desk, now))}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTimerMinutes(50)}>
              50m
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTimerMinutes(25)}>
              25m
            </Button>
            <Button variant={desk.timerRunning ? "live" : "secondary"} size="sm" onClick={toggleTimer}>
              {desk.timerRunning ? "Pause" : "Start"}
            </Button>
          </div>
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
          </NativeSelect>
          <NativeSelect
            value={desk.scorebugPosition}
            onChange={(e) =>
              snapScorebug(e.target.value as typeof desk.scorebugPosition)
            }
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
          </NativeSelect>
        </div>
        )}
        <div className="flex flex-wrap gap-2">
          {seatsFor(desk.tableSize).map((seat) => (
            <Button
              key={seat}
              variant={desk.winnerSide === seat ? "live" : "secondary"}
              className="flex-1"
              onClick={() => patch({ winnerSide: desk.winnerSide === seat ? null : seat })}
            >
              {seat.toUpperCase()} wins
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
  const commander = isCommanderLane(desk);

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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ready) void hydrate();
  }, [ready, hydrate]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/overlay/bracket`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  const live = t.matches.find((m) => m.id === t.streamMatchId);
  const p1 = live ? t.entrants.find((e) => e.id === live.p1.entrantId) : null;
  const p2 = live ? t.entrants.find((e) => e.id === live.p2.entrantId) : null;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Bracket widget</p>
      <p className="mt-1 text-sm text-muted">
        {t.name} · {t.bracketType === "double" ? "DE" : t.bracketType === "swiss" ? "Swiss" : "SE"} {t.size}
      </p>
      {live && p1 && p2 ? (
        <p className="mt-2 text-xs text-live">
          On air · {p1.name} vs {p2.name}
        </p>
      ) : (
        <p className="mt-2 text-xs text-subtle">Assign a stream match from Tournament.</p>
      )}
      <div className="mt-3 grid gap-2">
        <NativeSelect
          value={t.overlayView}
          onChange={(e) => patch({ overlayView: e.target.value as BracketViewId })}
        >
          {viewsFor(t.bracketType).map((v) => (
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
      </div>
    </section>
  );
}

export function PodPanel() {
  const desk = useDeskStore((s) => s.desk);
  const [copied, setCopied] = useState(false);
  const commander = isCommanderTable(desk) || isCommanderLane(desk);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pod`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Pod tablet</p>
      <p className="mt-1 text-sm text-muted">
        Life, poison, and commander damage on a phone or tablet. Players tap their own seat.
      </p>
      {!commander ? (
        <p className="mt-2 text-xs text-subtle">Switch MTG to Commander so all four seats are live.</p>
      ) : (
        <p className="mt-2 text-xs text-ok">{desk.tableSize}-seat pod · updates the stream bugs live.</p>
      )}
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy URL"}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="/pod" target="_blank" rel="noreferrer">
            Open pad
          </a>
        </Button>
      </div>
    </section>
  );
}

