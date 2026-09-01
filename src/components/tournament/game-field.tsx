import { Field, NativeSelect } from "@/components/desk/field";
import {
  GAME_LIST,
  MTG_LANES,
  PTCG_DIVISIONS,
  VGC_DIVISIONS,
  isMtgTitle,
  isPlayPokemonTitle,
  playDivisionsFor,
  type GameId,
} from "@/lib/games";
import { rosterCount, type TournamentState } from "@/lib/tournament-types";

export function GameField({
  gameId,
  tournament,
  onGame,
}: {
  gameId: GameId;
  tournament: TournamentState;
  onGame: (id: GameId) => void;
}) {
  return (
    <Field label="Game">
      <NativeSelect value={gameId} onChange={(e) => onGame(e.target.value as GameId)}>
        <optgroup label="Pokémon TCG">
          {PTCG_DIVISIONS.map((d) => (
            <option key={d.gameId} value={d.gameId}>
              {d.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Pokémon VGC">
          {VGC_DIVISIONS.map((d) => (
            <option key={d.gameId} value={d.gameId}>
              {d.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Magic: The Gathering">
          {MTG_LANES.map((d) => (
            <option key={d.gameId} value={d.gameId}>
              {d.label}
            </option>
          ))}
        </optgroup>
        {GAME_LIST.filter((g) => !isPlayPokemonTitle(g.id) && !isMtgTitle(g.id)).map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </NativeSelect>
      {playDivisionsFor(gameId).length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {playDivisionsFor(gameId).map((d) => {
            const active = gameId === d.gameId;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  if (!active) onGame(d.gameId);
                }}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium tracking-wide ${
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-surface-2 text-muted hover:text-fg"
                }`}
              >
                {d.label}
                <span className="ml-1 font-mono text-[0.62rem] text-subtle">{rosterCount(tournament, d.gameId)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <p className="mt-1 text-[0.65rem] text-subtle">
        {isPlayPokemonTitle(gameId)
          ? "Masters, Seniors, and Juniors are three events on this host. Each has its own roster, pairings, kiosk, and overlays."
          : isMtgTitle(gameId)
            ? "Constructed and Commander are two events on this host. Each has its own roster, pairings, kiosk, and overlays."
            : "This title only. Each game keeps its own name."}
      </p>
    </Field>
  );
}
