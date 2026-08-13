import { ArrowLeftRight, RotateCcw, Trophy } from "lucide-react";
import { Field, NativeSelect } from "@/components/desk/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRIES } from "@/lib/countries";
import { gameOf, isCommanderLane } from "@/lib/games";
import { useDeskStore } from "@/lib/desk-store";
import {
  SEAT_LABELS,
  isCommanderTable,
  seatsFor,
  type PlayerSide,
  type SeatId,
  type SideId,
} from "@/lib/desk-types";
import { cn } from "@/lib/cn";
import { PokeballIcon } from "@/components/overlays/pips";

const LIFE_STEPS = [-1000, -100, -10, 10, 100, 1000];
const MTG_STEPS = [-10, -5, -1, 1, 5, 10];

export function MatchControl() {
  const desk = useDeskStore((s) => s.desk);
  const setPlayer = useDeskStore((s) => s.setPlayer);
  const bumpScore = useDeskStore((s) => s.bumpScore);
  const bumpResource = useDeskStore((s) => s.bumpResource);
  const setResource = useDeskStore((s) => s.setResource);
  const bumpSecondary = useDeskStore((s) => s.bumpSecondary);
  const bumpCmdDamage = useDeskStore((s) => s.bumpCmdDamage);
  const swapSides = useDeskStore((s) => s.swapSides);
  const resetGame = useDeskStore((s) => s.resetGame);
  const resetMatch = useDeskStore((s) => s.resetMatch);
  const gameWin = useDeskStore((s) => s.gameWin);
  const game = gameOf(desk.gameId);
  const commanderTable = isCommanderTable(desk);
  const commanderLane = isCommanderLane(desk);

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-panel sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">
            {commanderTable ? "Live pod" : "Live match"}
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight uppercase">
            {desk.roundName}
            <span className="text-muted">
              {commanderTable ? ` · ${desk.tableSize} seats` : ` · Bo${desk.bestOf}`}
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={swapSides}>
            <ArrowLeftRight className="size-3.5" />
            {commanderTable ? "Rotate" : "Swap"}
          </Button>
          <Button variant="secondary" size="sm" onClick={resetGame}>
            <RotateCcw className="size-3.5" />
            Reset {commanderTable ? "life" : "game"}
          </Button>
          <Button variant="outline" size="sm" onClick={resetMatch}>
            Reset match
          </Button>
        </div>
      </div>

      {commanderTable ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(desk.tableSize === 4 ? (["p1", "p2", "p4", "p3"] as SeatId[]) : seatsFor(desk.tableSize)).map(
            (seat) => (
              <SeatCard
                key={seat}
                seat={seat}
                player={desk[seat]}
                align={seat === "p2" || seat === "p3" ? "right" : "left"}
                onChange={(partial) => setPlayer(seat, partial)}
                onResource={(d) => bumpResource(seat, d)}
                onSecondary={(d) => bumpSecondary(seat, d)}
                onCmd={(d) => bumpCmdDamage(seat, d)}
                onWin={() => gameWin(seat)}
              />
            ),
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <PlayerColumn
            side="p1"
            player={desk.p1}
            align="left"
            commander={commanderLane}
            onChange={(partial) => setPlayer("p1", partial)}
            onScore={(d) => bumpScore("p1", d)}
            onResource={(d) => bumpResource("p1", d)}
            onResourceSet={(v) => setResource("p1", v)}
            onSecondary={(d) => bumpSecondary("p1", d)}
            onCmd={(d) => bumpCmdDamage("p1", d)}
            onGameWin={() => gameWin("p1")}
          />

          <div className="flex flex-col items-center justify-center gap-3 py-2">
            <div className="font-display flex items-center gap-3 text-6xl leading-none font-semibold tabular-nums">
              <span className="min-w-10 text-center">{desk.p1.score}</span>
              <span className="text-3xl text-subtle">–</span>
              <span className="min-w-10 text-center">{desk.p2.score}</span>
            </div>
            <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted uppercase">
              {game.scoreLabel} · first to {Math.ceil(desk.bestOf / 2)}
            </p>
            <div className="mt-2 flex w-full max-w-52 flex-col gap-2">
              <Button variant="secondary" onClick={() => gameWin("p1")}>
                <Trophy className="size-3.5" />
                Game P1
              </Button>
              <Button variant="secondary" onClick={() => gameWin("p2")}>
                <Trophy className="size-3.5" />
                Game P2
              </Button>
            </div>
          </div>

          <PlayerColumn
            side="p2"
            player={desk.p2}
            align="right"
            commander={commanderLane}
            onChange={(partial) => setPlayer("p2", partial)}
            onScore={(d) => bumpScore("p2", d)}
            onResource={(d) => bumpResource("p2", d)}
            onResourceSet={(v) => setResource("p2", v)}
            onSecondary={(d) => bumpSecondary("p2", d)}
            onCmd={(d) => bumpCmdDamage("p2", d)}
            onGameWin={() => gameWin("p2")}
          />
        </div>
      )}
    </section>
  );
}

function SeatCard({
  seat,
  player,
  align,
  onChange,
  onResource,
  onSecondary,
  onCmd,
  onWin,
}: {
  seat: SeatId;
  player: PlayerSide;
  align: "left" | "right";
  onChange: (partial: Partial<PlayerSide>) => void;
  onResource: (delta: number) => void;
  onSecondary: (delta: number) => void;
  onCmd: (delta: number) => void;
  onWin: () => void;
}) {
  const focused = useDeskStore((s) => s.focusedSeat);
  const setFocusedSeat = useDeskStore((s) => s.setFocusedSeat);
  const winnerSide = useDeskStore((s) => s.desk.winnerSide);
  const rtl = align === "right";

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface-2 p-4",
        focused === seat ? "border-accent" : "border-transparent",
        rtl && "lg:text-right",
      )}
      onClick={() => setFocusedSeat(seat)}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-mono text-[0.65rem] tracking-[0.2em] text-muted uppercase">
          {SEAT_LABELS[seat]}
        </p>
        <Button
          variant={winnerSide === seat ? "live" : "outline"}
          size="sm"
          onClick={onWin}
        >
          <Trophy className="size-3.5" />
          Wins
        </Button>
      </div>
      <div className="grid gap-3">
        <Field label="Name">
          <Input
            value={player.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onFocus={() => setFocusedSeat(seat)}
          />
        </Field>
        <Field label="Commander">
          <Input
            value={player.archetype}
            placeholder="Atraxa · Kinnan · Kenrith"
            onChange={(e) => onChange({ archetype: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted">Life</span>
          <span className="font-display text-3xl font-semibold tabular-nums">{player.resource}</span>
        </div>
        <div className={cn("flex flex-wrap gap-1.5", rtl && "lg:justify-end")}>
          {MTG_STEPS.map((step) => (
            <Button key={step} variant="outline" size="sm" onClick={() => onResource(step)}>
              {step > 0 ? `+${step}` : step}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted">Poison</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => onSecondary(-1)}>
              −
            </Button>
            <span className="min-w-5 text-center font-semibold tabular-nums">{player.secondary}</span>
            <Button variant="outline" size="sm" onClick={() => onSecondary(1)}>
              +
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted">Cmd dmg</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => onCmd(-1)}>
              −
            </Button>
            <span className="min-w-5 text-center font-semibold tabular-nums">{player.cmdDamage}</span>
            <Button variant="outline" size="sm" onClick={() => onCmd(1)}>
              +
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerColumn({
  side,
  player,
  align,
  commander,
  onChange,
  onScore,
  onResource,
  onResourceSet,
  onSecondary,
  onCmd,
}: {
  side: SideId;
  player: PlayerSide;
  align: "left" | "right";
  commander: boolean;
  onChange: (partial: Partial<PlayerSide>) => void;
  onScore: (delta: number) => void;
  onResource: (delta: number) => void;
  onResourceSet: (value: number) => void;
  onSecondary: (delta: number) => void;
  onCmd: (delta: number) => void;
  onGameWin: () => void;
}) {
  const desk = useDeskStore((s) => s.desk);
  const game = gameOf(desk.gameId);
  const format = game.formats.find((f) => f.label === desk.formatName);
  const max = format?.resourceMax ?? game.resource.max;
  const rtl = align === "right";
  const extraLabel = commander ? "Commander" : game.extraLabel;
  const extraPlaceholder = commander ? "Atraxa · Yoshimaru" : game.extraPlaceholder;

  return (
    <div className={cn("rounded-lg bg-surface-2 p-4", rtl && "lg:text-right")} data-game={desk.gameId}>
      <p className="font-mono mb-3 text-[0.65rem] tracking-[0.2em] text-muted uppercase">
        {side === "p1" ? "Player 1" : "Player 2"}
      </p>
      <div className="grid gap-3">
        <Field label="Name">
          <Input
            value={player.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={rtl ? "lg:text-right" : undefined}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Handle">
            <Input
              value={player.tag}
              onChange={(e) => onChange({ tag: e.target.value })}
            />
          </Field>
          <Field label="Country">
            <NativeSelect
              value={player.country}
              onChange={(e) => onChange({ country: e.target.value })}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={extraLabel}>
            <Input
              value={player.archetype}
              placeholder={extraPlaceholder}
              onChange={(e) => onChange({ archetype: e.target.value })}
            />
          </Field>
          <Field label="Pronouns">
            <Input
              value={player.pronouns}
              onChange={(e) => onChange({ pronouns: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{game.scoreLabel}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="score" onClick={() => onScore(-1)} aria-label={`${side} score down`}>
            −
          </Button>
          <span className="font-display min-w-8 text-center text-3xl font-semibold tabular-nums">
            {player.score}
          </span>
          <Button variant="outline" size="score" onClick={() => onScore(1)} aria-label={`${side} score up`}>
            +
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted">{game.resource.label}</span>
          <span className="font-mono text-xs tabular-nums text-fg">{player.resource}</span>
        </div>
        {game.resource.pips ? (
          <div className={cn("flex flex-wrap gap-1.5", rtl && "lg:justify-end")}>
            {Array.from({ length: max }, (_, i) => {
              const value = i + 1;
              const active = player.resource >= value;
              if (game.resource.pipStyle === "pokeball") {
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onResourceSet(player.resource === value ? value - 1 : value)}
                    className="grid size-8 place-items-center rounded-full transition-transform duration-150 hover:scale-110"
                    aria-label={`Set ${game.resource.shortLabel} to ${value}`}
                  >
                    <PokeballIcon filled={active} className="size-7" />
                  </button>
                );
              }
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onResourceSet(player.resource === value ? value - 1 : value)}
                  className={cn(
                    "size-8 rounded-full border transition-colors duration-150",
                    active ? "border-game bg-game" : "border-border bg-transparent hover:border-muted",
                  )}
                  aria-label={`Set ${game.resource.shortLabel} to ${value}`}
                />
              );
            })}
          </div>
        ) : game.resource.kind === "life" && game.resource.step >= 10 ? (
          <div className={cn("flex flex-wrap gap-1.5", rtl && "lg:justify-end")}>
            {LIFE_STEPS.map((step) => (
              <Button
                key={step}
                variant="outline"
                size="sm"
                onClick={() => onResource(step)}
              >
                {step > 0 ? `+${step}` : step}
              </Button>
            ))}
          </div>
        ) : game.resource.kind === "life" ? (
          <div className={cn("flex flex-wrap gap-1.5", rtl && "lg:justify-end")}>
            {MTG_STEPS.map((step) => (
              <Button key={step} variant="outline" size="sm" onClick={() => onResource(step)}>
                {step > 0 ? `+${step}` : step}
              </Button>
            ))}
          </div>
        ) : (
          <div className={cn("flex items-center gap-2", rtl && "lg:justify-end")}>
            <Button variant="outline" size="score" onClick={() => onResource(-game.resource.step)}>
              −
            </Button>
            <span className="font-display min-w-14 text-center text-3xl font-semibold tabular-nums">
              {player.resource}
            </span>
            <Button variant="outline" size="score" onClick={() => onResource(game.resource.step)}>
              +
            </Button>
          </div>
        )}
      </div>

      {game.secondary ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">{game.secondary.label}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onSecondary(-game.secondary!.step)}>
              −
            </Button>
            <span className="min-w-6 text-center font-semibold tabular-nums">{player.secondary}</span>
            <Button variant="outline" size="sm" onClick={() => onSecondary(game.secondary!.step)}>
              +
            </Button>
          </div>
        </div>
      ) : null}

      {commander ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">Commander damage</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onCmd(-1)}>
              −
            </Button>
            <span className="min-w-6 text-center font-semibold tabular-nums">{player.cmdDamage}</span>
            <Button variant="outline" size="sm" onClick={() => onCmd(1)}>
              +
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
