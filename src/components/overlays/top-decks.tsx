import { RemoteArt } from "@/components/ui/remote-art";
import { rokCardBack } from "@/components/overlays/rok-layout";
import { computeStandings } from "@/lib/tournament-bracket";
import { gameOf } from "@/lib/games";
import type { DeckCard } from "@/lib/decklist";
import type { TopDeckSlot } from "@/lib/desk-types";
import type { Entrant, TournamentState } from "@/lib/tournament-types";

export function TopDecksOverlay({
  tournament,
  count,
  slots = [],
}: {
  tournament: TournamentState;
  count: number;
  slots?: TopDeckSlot[];
}) {
  const shown = Math.min(16, Math.max(1, Math.round(count) || 8));
  const rows = topDeckRows(tournament, slots, shown);
  const rowCount = Math.max(1, Math.ceil(rows.length / columnsFor(rows.length)));
  const cols = columnsFor(rows.length);
  const cardH = rowCount >= 4 ? 108 : rowCount === 3 ? 146 : rowCount === 2 ? 248 : 280;
  const nameSize = rowCount >= 4 ? "1.05rem" : rowCount === 3 ? "1.2rem" : "1.45rem";
  const deckSize = rowCount >= 4 ? "0.72rem" : "0.95rem";
  const title = tournament.name.trim() || "ROK Esports";
  const mark = gameOf(tournament.gameId).short;
  const back = rokCardBack(tournament);

  return (
    <div data-game={tournament.gameId} className="absolute inset-0 overflow-hidden bg-[#0b0c0e] text-[#ececea]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(920px 520px at 8% -8%, rgb(212 83 76 / 0.32), transparent 58%), radial-gradient(760px 480px at 108% 112%, rgb(197 204 214 / 0.14), transparent 56%), linear-gradient(180deg, #14171c 0%, #0b0c0e 42%, #101216 100%)",
        }}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1920 1080" fill="none" aria-hidden>
        <path d="M-80 220C240 40 560 20 900 210" stroke="#d4534c" strokeOpacity="0.45" strokeWidth="3" />
        <path d="M-40 280C300 90 640 80 980 270" stroke="#c5ccd6" strokeOpacity="0.18" strokeWidth="2" />
        <path d="M1040 920C1380 760 1660 760 2020 980" stroke="#d4534c" strokeOpacity="0.28" strokeWidth="3" />
        <path d="M1868 70V1010" stroke="#d4534c" strokeOpacity="0.55" strokeWidth="3" />
        <path d="M1884 70V1010" stroke="#c5ccd6" strokeOpacity="0.35" strokeWidth="1" />
      </svg>
      <p className="font-display pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 -rotate-90 text-[1.35rem] font-semibold tracking-[0.42em] text-[#d4534c] uppercase">
        {mark}
      </p>

      <div className="relative flex h-full flex-col px-16 pt-7 pb-6">
        <header className="flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-5">
            <img src="/brand/rok-mark.png" alt="" className="size-16 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="truncate font-mono text-[0.95rem] tracking-[0.28em] text-[#c5ccd6] uppercase">{title}</p>
              <h1
                className="font-display leading-none font-semibold tracking-tight text-white uppercase"
                style={{ fontSize: rowCount >= 4 ? "3.5rem" : "5.15rem" }}
              >
                Top {rows.length || shown} Decks
              </h1>
            </div>
          </div>
          <p className="font-display shrink-0 text-5xl font-semibold tracking-wide text-[#d4534c]">ROK</p>
        </header>

        {rows.length === 0 ? (
          <p className="font-display mt-28 text-center text-4xl font-semibold text-[#8b9098] uppercase">
            Type the names and cards in Top deck cards.
          </p>
        ) : (
          <div
            className="mx-auto mt-5 grid min-h-0 w-full flex-1 content-center gap-x-4 gap-y-3"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              maxWidth: cols <= 2 ? cols * 440 : undefined,
            }}
          >
            {rows.map((row, index) => (
                <article key={`${row.name}-${index}`} className="min-w-0">
                  <div className="rounded-xl border border-white/15 bg-[#12151a]/95 p-2 shadow-[0_12px_28px_rgb(0_0_0/0.4)]">
                    <CardPair faces={row.faces} height={cardH} back={back} />
                    <div className="mt-2 rounded-md bg-[#d4534c] px-2 py-1.5 text-center">
                      <p className="truncate font-display leading-none font-semibold tracking-wide text-white uppercase" style={{ fontSize: nameSize }}>
                        {row.name}
                      </p>
                    </div>
                  </div>
                  <div className="mx-3 rounded-b-md bg-[#7a2436] px-2 py-1.5 text-center">
                    <p className="line-clamp-2 font-display leading-tight font-semibold tracking-[0.03em] text-[#f3eee3] uppercase" style={{ fontSize: deckSize }}>
                      {row.deck}
                    </p>
                  </div>
                </article>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function columnsFor(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

export function topDeckEntrants(tournament: TournamentState, count: number): Entrant[] {
  const named = tournament.entrants.filter((entrant) => entrant.name.trim() && !entrant.dropped);
  if (tournament.matches.length) {
    const ordered = computeStandings(tournament).flatMap((row) => {
      const entrant = named.find((item) => item.id === row.entrantId);
      return entrant ? [entrant] : [];
    });
    if (ordered.length) return ordered.slice(0, count);
  }
  return [...named].sort((a, b) => a.seed - b.seed).slice(0, count);
}

export function topDeckRows(tournament: TournamentState, slots: TopDeckSlot[], count: number) {
  const shown = Math.min(16, Math.max(1, Math.round(count) || 8));
  const players = topDeckEntrants(tournament, shown);
  const rows: { name: string; deck: string; faces: [DeckCard | null, DeckCard | null] }[] = [];
  for (let i = 0; i < shown; i += 1) {
    const slot = slots[i];
    const player = players[i];
    const faces = slot?.faces ?? [null, null];
    const name = (slot?.name || player?.name || "").trim();
    const fromCards = faces.flatMap((card) => (card?.name ? [card.name] : []));
    const deck = (slot?.deck || player?.deck || "").trim() || fromCards.join(" / ");
    if (!name && !deck && !faces[0] && !faces[1]) continue;
    rows.push({ name: name || "Player", deck: deck || "Deck", faces });
  }
  return rows;
}

function CardPair({ faces, height, back }: { faces: Array<DeckCard | null | undefined>; height: number; back: string }) {
  const pair = [faces[0] ?? null, faces[1] ?? null];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {pair.map((card, index) => (
        <div key={card?.id || index} className="overflow-hidden rounded-md bg-black shadow-[0_8px_16px_rgb(0_0_0/0.35)]" style={{ height }}>
          <Face card={card ?? undefined} back={back} />
        </div>
      ))}
    </div>
  );
}

function Face({ card, back }: { card?: DeckCard; back: string }) {
  if (!card) {
    return <img src={back} alt="" className="h-full w-full object-cover" />;
  }
  return <RemoteArt image={card.image} id={card.id} size="low" alt={card.name} eager className="h-full w-full object-cover" />;
}
