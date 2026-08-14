import { OverlayEditProvider, Placed, type OverlayEdit } from "@/components/overlays/placed";
import { TeraBadge, TypeIcon } from "@/components/overlays/type-icon";
import type { DeskState, PlayerSide, RosterSide } from "@/lib/desk-types";
import { spriteFallbackUrl, spriteUrl, teamHasMons, type TeamMon } from "@/lib/pokemon-vgc";
import { cn } from "@/lib/cn";

export function RosterView({
  desk,
  edit = null,
  force,
}: {
  desk: DeskState;
  edit?: OverlayEdit | null;
  force?: RosterSide;
}) {
  if (desk.gameId !== "pokemon-vgc") return null;
  const side = force ?? desk.rosterSide;
  const showP1 = side === "p1" || side === "both";
  const showP2 = side === "p2" || side === "both";
  if (!showP1 && !showP2 && !edit) return null;

  return (
    <OverlayEditProvider desk={desk} edit={edit}>
      <div data-game={desk.gameId} className="pointer-events-none absolute inset-0">
        {showP1 || edit ? (
          <Placed id="rosterP1" pin="right" pinInset={28}>
            <RosterBoard player={desk.p1} />
          </Placed>
        ) : null}
        {showP2 || edit ? (
          <Placed id="rosterP2" pin="left" pinInset={28}>
            <RosterBoard player={desk.p2} />
          </Placed>
        ) : null}
      </div>
    </OverlayEditProvider>
  );
}

function RosterBoard({ player }: { player: PlayerSide }) {
  const team = (player.team ?? []).filter((mon) => mon.species.trim());
  if (!teamHasMons(player.team)) {
    return (
      <div className="w-[var(--size-roster-board)] rounded-lg bg-roster-body/90 px-6 py-8 text-center shadow-[0_12px_28px_rgb(0_0_0/0.4)]">
        <p className="font-display text-roster-name leading-none font-semibold tracking-wide text-ov-fg uppercase">
          {player.name || "Open"}
        </p>
        <p className="mt-2 text-sm text-ov-muted">No team entered</p>
      </div>
    );
  }

  return (
    <div className="w-[var(--size-roster-board)]">
      <div className="mb-2.5 rounded-md bg-roster-plate px-4 py-1.5 text-center shadow-[0_6px_16px_rgb(0_0_0/0.28)]">
        <p className="font-display text-roster-name leading-none font-semibold tracking-[0.04em] text-roster-ink uppercase">
          {player.name || "Trainer"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {team.map((mon, i) => (
          <MonCard key={`${mon.species}-${i}`} mon={mon} />
        ))}
      </div>
    </div>
  );
}

function MonCard({ mon }: { mon: TeamMon }) {
  const art = spriteUrl(mon);
  return (
    <article className="overflow-hidden rounded-md bg-roster-body shadow-[0_8px_20px_rgb(0_0_0/0.38)]">
      <header className="flex items-center justify-between gap-2 bg-roster-plate px-2.5 py-0.5">
        <p className="font-display text-roster-species min-w-0 truncate leading-tight font-semibold tracking-wide text-roster-ink uppercase">
          {mon.species}
        </p>
        {mon.tera ? <TeraBadge type={mon.tera} /> : null}
      </header>
      <div className="relative min-h-[var(--size-roster-card)] bg-linear-to-b from-roster-body to-roster-body-2 px-2.5 pt-1.5 pb-2">
        <div className="relative z-10 pr-28">
          <div className="mb-1 flex items-baseline justify-between gap-2 text-roster-meta text-roster-soft">
            <span className="truncate italic">{mon.ability || "—"}</span>
            <span className="shrink-0 text-right not-italic">{mon.item || "—"}</span>
          </div>
          <ul className="grid gap-0.5">
            {mon.moves.map((move, i) => (
              <li key={i} className="flex min-h-5 items-center gap-1.5 text-ov-fg">
                <TypeIcon type={move.type} />
                <span className="text-roster-move truncate leading-tight">{move.name || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
        {art ? (
          <img
            src={art}
            alt=""
            className={cn(
              "pointer-events-none absolute right-0 bottom-0 z-0 h-32 w-32 object-contain object-bottom",
              "drop-shadow-[0_4px_8px_rgb(0_0_0/0.45)]",
            )}
            onError={(event) => {
              const fallback = spriteFallbackUrl(mon);
              if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
            }}
          />
        ) : null}
      </div>
    </article>
  );
}
