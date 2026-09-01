import {
  ageLabel,
  deckTotal,
  isStandardFormat,
  padRows,
  printAgeDivision,
  printRegulationMarks,
  regulationOf,
  splitPtcgDeck,
  deckRegulationMarks,
} from "@/lib/ptcg-deck-list";
import type { DeckCard } from "@/lib/decklist";
import { printedSetCode } from "@/lib/ptcg-deck-match";
import type { Entrant, TournamentState } from "@/lib/tournament-types";

const POKE_ROWS = 16;
const TRAINER_ROWS = 16;
const ENERGY_ROWS = 10;

export function PtcgDeckListPrint({
  tournament,
  players,
}: {
  tournament: TournamentState;
  players: Entrant[];
}) {
  return (
    <div className="ptcg-print">
      <style>{PRINT_CSS}</style>
      {players.map((player) => (
        <article key={player.id} className="player-set">
          <DeckSheet tournament={tournament} player={player} />
        </article>
      ))}
    </div>
  );
}

function DeckSheet({ tournament, player }: { tournament: TournamentState; player: Entrant }) {
  const [poke, trainer, energy] = splitPtcgDeck(player.decklist);
  const standard = isStandardFormat(tournament.formatName);
  const total = deckTotal(player);
  const division = printAgeDivision(player, tournament.gameId);
  return (
    <section className="sheet">
      <header className="head">
        <div className="brand">
          <p className="play">Play! Pokémon</p>
          <h1>Pokémon TCG Deck List</h1>
          <p className="season">
            {tournament.name || "Play! Pokémon TCG Tournament Season"}
            {tournament.formatName ? ` · ${tournament.formatName}` : ""}
          </p>
        </div>
        <div className="checks">
          <AgeChecks value={division} />
          <FormatChecks standard={standard} />
        </div>
      </header>

      <p className="instruct">
        Complete this list before the event. Pokémon need name, collector number, and set. Trainers and Energy need name
        and quantity. Deck must be exactly 60 cards.
      </p>

      <div className="id-grid">
        <Write label="Player Name" value={player.name} />
        <Write label="Player ID" value={player.playerId} />
        <Write label="Date of Birth" value={player.birthDate} />
      </div>

      <div className="cols">
        <Column
          title="Pokémon"
          headers={["Qty", "Name", "Set", "Coll. #", "Reg"]}
          rows={padRows(poke?.cards ?? [], Math.max(POKE_ROWS, poke?.cards.length ?? 0))}
          cells={(card) => [String(card.qty), card.name, printedSetCode(card.set, card.id), card.number, regulationOf(card)]}
          widths="0.38fr 1.55fr 1fr 0.58fr 0.38fr"
          total={poke?.total ?? 0}
        />
        <Column
          title="Trainer"
          headers={["Name", "Qty"]}
          rows={padRows(trainer?.cards ?? [], Math.max(TRAINER_ROWS, trainer?.cards.length ?? 0))}
          cells={(card) => [card.name, String(card.qty)]}
          widths="1fr 0.28fr"
          total={trainer?.total ?? 0}
        />
        <Column
          title="Energy"
          headers={["Name", "Qty"]}
          rows={padRows(energy?.cards ?? [], Math.max(ENERGY_ROWS, energy?.cards.length ?? 0))}
          cells={(card) => [card.name, String(card.qty)]}
          widths="1fr 0.28fr"
          total={energy?.total ?? 0}
        />
      </div>

      <div className="totals">
        <p>
          Pokémon <b>{poke?.total ?? 0}</b>
        </p>
        <p>
          Trainer <b>{trainer?.total ?? 0}</b>
        </p>
        <p>
          Energy <b>{energy?.total ?? 0}</b>
        </p>
        <p className={total === 60 ? "ok" : "warn"}>
          Deck total <b>{total || "—"}</b> / 60
        </p>
      </div>

      <RegulationMarks cards={player.decklist} />

      <footer className="foot">
        <p className="note">
          In addition to the card name and quantity of each card in your deck, we also require you to provide us with the
          set name and collector number of each Pokémon. This will help us ensure that each player is using a legal deck.
        </p>
        <p className="note">
          If one of the cards in your deck comes from a set previous to those listed, but was reprinted in one of the listed
          sets, put NA as the set name.
        </p>
        <p className="note">New cards become legal for tournament play two weeks after release.</p>

        <div className="signs">
          <Write label="Player Signature" value="" tall />
          <Write label="Staff Use" value="" tall />
          <Write
            label="Event"
            value={[tournament.name, tournament.formatName, ageLabel(division)].filter(Boolean).join(" · ")}
          />
        </div>
      </footer>
    </section>
  );
}

function Column({
  title,
  headers,
  rows,
  cells,
  widths,
  total,
}: {
  title: string;
  headers: string[];
  rows: (DeckCard | null)[];
  cells: (card: DeckCard) => string[];
  widths: string;
  total: number;
}) {
  return (
    <div className="col">
      <div className="col-head">
        <h2>{title}</h2>
        <span>{total}</span>
      </div>
      <div className="grid-head" style={{ gridTemplateColumns: widths }}>
        {headers.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {rows.map((card, i) => (
        <div key={i} className="grid-row" style={{ gridTemplateColumns: widths }}>
          {(card ? cells(card) : headers.map(() => "")).map((cell, ci) => (
            <b key={ci} className={/^(qty|coll|reg)/i.test(headers[ci] ?? "") ? "qty" : ""}>
              {cell}
            </b>
          ))}
        </div>
      ))}
    </div>
  );
}

function AgeChecks({ value }: { value: string }) {
  return (
    <div className="ages">
      <span>Age Division</span>
      <div>
        {(
          [
            ["juniors", "Junior"],
            ["seniors", "Senior"],
            ["masters", "Masters"],
          ] as const
        ).map(([id, label]) => (
          <label key={id} className={value === id ? "on" : ""}>
            <i />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function FormatChecks({ standard }: { standard: boolean }) {
  return (
    <div className="ages formats">
      <span>Format</span>
      <div>
        <label className={standard ? "on" : ""}>
          <i />
          Standard
        </label>
        <label className={!standard ? "on" : ""}>
          <i />
          Expanded
        </label>
      </div>
    </div>
  );
}

function RegulationMarks({ cards }: { cards: DeckCard[] | undefined }) {
  const found = deckRegulationMarks(cards);
  return (
    <div className="regs">
      <p>Standard Format Regulation Marks</p>
      <div>
        {printRegulationMarks(cards).map((letter) => (
          <label key={letter} className={found.includes(letter) ? "on" : ""}>
            <i />
            {letter}
          </label>
        ))}
      </div>
    </div>
  );
}

function Write({ label, value, tall }: { label: string; value: string; tall?: boolean }) {
  return (
    <div className={tall ? "write tall" : "write"}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

const PRINT_CSS = `
  .ptcg-print { color: #111; font-family: Arial, Helvetica, sans-serif; background: #fff; }
  .sheet {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 8.5in;
    height: 11in;
    max-height: 11in;
    overflow: hidden;
    padding: 0.22in 0.32in 0.18in;
    margin: 0 auto 20px;
    background: #fff;
    color: #111;
    border: 1px solid #ccc;
  }
  .head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-end;
    border-bottom: 2px solid #111;
    padding-bottom: 5px;
    flex: 0 0 auto;
  }
  .play {
    margin: 0;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #c00;
  }
  .head h1 {
    margin: 1px 0 0;
    font-size: 18px;
    line-height: 1.05;
    font-weight: 700;
  }
  .season { margin: 2px 0 0; font-size: 10px; }
  .checks { display: grid; gap: 4px; text-align: right; }
  .ages > span, .formats > span {
    display: block;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .ages div { display: flex; justify-content: flex-end; gap: 8px; }
  .ages label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 700;
  }
  .ages i {
    display: inline-block;
    width: 11px;
    height: 11px;
    border: 1.4px solid #111;
    box-sizing: border-box;
  }
  .ages label.on i { background: #111; box-shadow: inset 0 0 0 2px #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .instruct {
    margin: 5px 0;
    font-size: 9px;
    font-style: italic;
    line-height: 1.3;
    flex: 0 0 auto;
  }
  .id-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 4px 10px;
    margin-bottom: 6px;
    flex: 0 0 auto;
  }
  .write { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .write span {
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .write b {
    display: block;
    min-height: 14px;
    border-bottom: 1px solid #111;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.2;
    padding: 1px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .write.tall b { min-height: 22px; }
  .cols {
    display: grid;
    grid-template-columns: 1.35fr 1fr 0.85fr;
    gap: 8px;
    align-items: start;
    flex: 0 0 auto;
  }
  .col { min-width: 0; }
  .col-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1.6px solid #111;
    margin-bottom: 2px;
  }
  .col-head h2 { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
  .col-head span { font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .grid-head, .grid-row {
    display: grid;
    gap: 3px;
    align-items: end;
  }
  .grid-head span {
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding-bottom: 1px;
  }
  .grid-row { min-height: 13px; border-bottom: 1px solid #bbb; }
  .grid-row b {
    font-size: 8px;
    font-weight: 600;
    line-height: 1.1;
    padding: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .grid-row b.qty { text-align: right; font-variant-numeric: tabular-nums; }
  .totals {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 6px;
    border-top: 2px solid #111;
    padding-top: 4px;
    font-size: 11px;
    font-weight: 700;
    flex: 0 0 auto;
  }
  .totals b { font-size: 13px; margin-left: 6px; }
  .totals .warn { color: #b00; }
  .regs {
    margin-top: 6px;
    border: 1.4px solid #111;
    flex: 0 0 auto;
  }
  .regs > p {
    margin: 0;
    background: #b4b4b4;
    color: #111;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.02em;
    padding: 2px 8px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .regs div {
    display: flex;
    gap: 18px;
    padding: 4px 10px 5px;
  }
  .regs label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 700;
  }
  .regs i {
    display: inline-block;
    width: 11px;
    height: 11px;
    border: 1.4px solid #111;
    box-sizing: border-box;
  }
  .regs label.on i {
    background: #111;
    box-shadow: inset 0 0 0 2px #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .foot {
    margin-top: auto;
    padding-top: 8px;
    flex: 0 0 auto;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .note {
    margin: 3px 0 0;
    font-size: 7.5px;
    line-height: 1.3;
    color: #222;
  }
  .signs {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1.2fr;
    gap: 12px;
    margin-top: 8px;
  }
  @media print {
    @page { size: letter portrait; margin: 0.15in; }
    html, body { background: #fff !important; }
    .no-print { display: none !important; }
    .sheet {
      width: 100%;
      height: 10.7in;
      max-height: 10.7in;
      margin: 0;
      border: 0;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .player-set .sheet:last-child { page-break-after: auto; break-after: auto; }
  }
`;
