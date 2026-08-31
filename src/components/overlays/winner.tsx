import { OverlayEditProvider, Placed, useOverlayEdit, type OverlayEdit } from "@/components/overlays/placed";
import { OverlayLookRoot } from "@/components/overlays/overlay-look-root";
import type { DeskState } from "@/lib/desk-types";

function Shell({
  desk,
  edit,
  children,
}: {
  desk: DeskState;
  edit?: OverlayEdit | null;
  children: React.ReactNode;
}) {
  return (
    <OverlayEditProvider desk={desk} edit={edit}>
      <div data-game={desk.gameId} className="pointer-events-none absolute inset-0">
        {children}
      </div>
    </OverlayEditProvider>
  );
}

export function WinnerView({
  desk,
  edit = null,
  preview = false,
}: {
  desk: DeskState;
  edit?: OverlayEdit | null;
  preview?: boolean;
}) {
  return (
    <Shell desk={desk} edit={edit}>
      <OverlayLookRoot book={desk.overlayLook} source="winner" className="absolute inset-0">
        <WinnerBody desk={desk} kind="match" preview={preview} />
      </OverlayLookRoot>
    </Shell>
  );
}

export function GameWinView({
  desk,
  edit = null,
  preview = false,
}: {
  desk: DeskState;
  edit?: OverlayEdit | null;
  preview?: boolean;
}) {
  return (
    <Shell desk={desk} edit={edit}>
      <OverlayLookRoot book={desk.overlayLook} source="game-win" className="absolute inset-0">
        <WinnerBody desk={desk} kind="game" preview={preview} />
      </OverlayLookRoot>
    </Shell>
  );
}

/** Live stings for Play / ROK layouts. Hidden until Production punches Game or Match. */
export function WinStings({ desk }: { desk: DeskState }) {
  return (
    <>
      <OverlayLookRoot book={desk.overlayLook} source="game-win" className="absolute inset-0 z-20">
        <WinnerBody desk={desk} kind="game" />
      </OverlayLookRoot>
      <OverlayLookRoot book={desk.overlayLook} source="winner" className="absolute inset-0 z-20">
        <WinnerBody desk={desk} kind="match" />
      </OverlayLookRoot>
    </>
  );
}

function WinnerBody({
  desk,
  kind,
  preview = false,
}: {
  desk: DeskState;
  kind: "game" | "match";
  preview?: boolean;
}) {
  const edit = useOverlayEdit();
  const side = kind === "match" ? desk.winnerSide : desk.gameWinnerSide;
  if (!side && !edit && !preview) return null;
  const player = desk[side ?? "p1"];
  const name = player.name.trim() || (kind === "match" ? "Match winner" : "Game winner");
  return (
    <Placed id={kind === "match" ? "winner" : "gameWin"}>
      <div className={`w-[1920px] px-16 text-center ${side ? "" : "opacity-60"}`}>
        <p className="font-mono text-ov-kicker tracking-[0.34em] text-game uppercase">
          {kind === "match" ? "Match winner" : "Game"}
        </p>
        <h1 className="font-display mt-2 text-[length:var(--text-ov-hero)] leading-none font-semibold text-ov-fg uppercase">
          {name}
        </h1>
        <p className="font-sans mt-3 text-[length:var(--text-ov-name)] text-ov-muted">
          {player.archetype || player.extra || player.tag || desk.roundName}
          {kind === "match" ? ` · ${desk.p1.score}–${desk.p2.score}` : ""}
        </p>
      </div>
    </Placed>
  );
}
