import { playerIdField, type GameId } from "@/lib/games";
import { cn } from "@/lib/cn";

export function PlayerIdPrivacy({
  gameId,
  accepted,
  onAccept,
  compact = false,
}: {
  gameId: GameId;
  accepted: boolean;
  onAccept: (next: boolean) => void;
  compact?: boolean;
}) {
  const field = playerIdField(gameId);
  return (
    <div className={cn("rounded-lg border border-border bg-surface-2", compact ? "px-3 py-2.5" : "px-3.5 py-3")}>
      <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">Player ID privacy</p>
      <p className={cn("mt-1.5 leading-relaxed text-muted", compact ? "text-xs" : "text-sm")}>
        {field.label} is for <span className="text-fg">this event’s staff roster only</span> — to check you in and
        report results to organized play. It is <span className="text-fg">not shown on stream</span>, not sold, and
        not copied to other events on this desk. A parent or guardian should enter it for a minor.
      </p>
      {field.policyUrl ? (
        <p className="mt-1.5 text-xs text-muted">
          Official policy:{" "}
          <a
            href={field.policyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-fg underline-offset-2 hover:underline"
          >
            {field.policyName}
          </a>
        </p>
      ) : null}
      <label className="mt-2.5 flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAccept(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-current"
        />
        <span>
          I understand staff will keep my {field.label} for this event, and I have read the privacy notice
          {field.policyUrl ? ` and ${field.policyName}` : ""}.
        </span>
      </label>
    </div>
  );
}

export function PlayerIdStaffNote({ gameId }: { gameId: GameId }) {
  const field = playerIdField(gameId);
  return (
    <p className="text-xs leading-relaxed text-muted">
      {field.label} stays on this roster. It does not go on overlays. Use it to match the player to organized play.
      {field.policyUrl ? (
        <>
          {" "}
          <a href={field.policyUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            {field.policyName}
          </a>
        </>
      ) : null}
    </p>
  );
}
