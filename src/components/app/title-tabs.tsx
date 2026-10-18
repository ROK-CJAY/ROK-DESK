import { TITLE_STRIP, playDivisionsFor, titleStripActive, titleStripTarget, type GameId } from "@/lib/games";

export function TitleTabs({ gameId, onPick }: { gameId: GameId; onPick: (id: GameId) => void }) {
  const divisions = playDivisionsFor(gameId);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
        {TITLE_STRIP.map((title) => {
          const active = titleStripActive(title.id, gameId);
          return (
            <button
              key={title.id}
              type="button"
              data-game={title.id}
              onClick={() => onPick(titleStripTarget(title.id, gameId))}
              className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium tracking-wide whitespace-nowrap transition-colors duration-150 ${
                active ? "border-game bg-game/15 text-fg" : "border-border bg-surface text-muted hover:text-fg"
              }`}
            >
              {title.label}
            </button>
          );
        })}
      </div>
      {divisions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {divisions.map((division) => {
            const active = gameId === division.gameId;
            return (
              <button
                key={division.id}
                type="button"
                data-play-division={division.id}
                onClick={() => onPick(division.gameId)}
                className={`rounded-md border px-3 py-1 text-xs font-medium tracking-wide ${
                  active ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface-2 text-muted hover:text-fg"
                }`}
              >
                {division.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
