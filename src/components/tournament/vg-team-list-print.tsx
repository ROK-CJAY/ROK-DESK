import {
  ageLabel,
  battleTeamOf,
  monRows,
  switchProfileOf,
  trainerNameOf,
} from "@/lib/vg-team-list";
import type { Entrant, TournamentState } from "@/lib/tournament-types";

export function VgTeamListPrint({
  tournament,
  players,
}: {
  tournament: TournamentState;
  players: Entrant[];
}) {
  return (
    <div className="vg-print bg-white text-black">
      <style>{PRINT_CSS}</style>
      {players.map((player) => (
        <article key={player.id} className="player-set">
          <StaffPage tournament={tournament} player={player} />
          <OpponentPage tournament={tournament} player={player} />
        </article>
      ))}
    </div>
  );
}

function StaffPage({ tournament, player }: { tournament: TournamentState; player: Entrant }) {
  const mons = monRows(player);
  return (
    <section className="sheet">
      <header className="mast">
        <div>
          <p className="kicker">Pokémon Video Game Team List</p>
          <h1>1 of 2 · For Tournament Staff</h1>
        </div>
        <p className="badge">Complete both pages</p>
      </header>
      <p className="note">
        Submit this page to event staff before the tournament, at the time set by the Organizer.
      </p>
      <div className="meta">
        <Field label="Player Name" value={player.name} wide />
        <Field label="Player ID" value={player.playerId} />
        <Field label="Date of Birth" value={player.birthDate} />
        <Field label="Trainer Name in Game" value={trainerNameOf(player)} />
        <Field label="Switch Profile Name" value={switchProfileOf(player)} />
        <Field label="Battle Team Number / Name" value={battleTeamOf(player)} />
        <Field label="Event" value={`${tournament.name} · ${tournament.formatName}`} wide />
        <AgeBox value={player.ageDivision} />
      </div>
      <div className="mons staff">
        {mons.map((mon, i) => (
          <StaffMon key={i} index={i + 1} mon={mon} />
        ))}
      </div>
      <footer className="signs">
        <Field label="Player Signature" value="" wide />
        <Field label="Staff Use" value="" />
      </footer>
    </section>
  );
}

function OpponentPage({ tournament, player }: { tournament: TournamentState; player: Entrant }) {
  const mons = monRows(player);
  return (
    <section className="sheet">
      <header className="mast">
        <div>
          <p className="kicker">Pokémon Video Game Team List</p>
          <h1>2 of 2 · For Opponents</h1>
        </div>
        <p className="badge">{ageLabel(player.ageDivision) || "Age Division"}</p>
      </header>
      <div className="meta compact">
        <Field label="Player Name" value={player.name} wide />
        <Field label="Trainer Name in Game" value={trainerNameOf(player)} />
        <Field label="Event" value={`${tournament.name} · ${tournament.formatName}`} wide />
      </div>
      <div className="mons foes">
        {mons.map((mon, i) => (
          <FoeMon key={i} index={i + 1} mon={mon} />
        ))}
      </div>
    </section>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <label className={wide ? "cell wide" : "cell"}>
      <span>{label}</span>
      <b>{value || "\u00a0"}</b>
    </label>
  );
}

function AgeBox({ value }: { value: string }) {
  return (
    <div className="cell">
      <span>Age Division</span>
      <div className="ages">
        {(["juniors", "seniors", "masters"] as const).map((id) => (
          <em key={id} className={value === id ? "on" : ""}>
            {id[0]!.toUpperCase() + id.slice(1)}
          </em>
        ))}
      </div>
    </div>
  );
}

function StaffMon({ index, mon }: { index: number; mon: ReturnType<typeof monRows>[number] }) {
  return (
    <div className="mon">
      <p className="slot">Pokémon {index}</p>
      <div className="grid2">
        <Mini label="Pokémon" value={mon.species} />
        <Mini label="Ability" value={mon.ability} />
        <Mini label="Held Item" value={mon.item} />
        <Mini label="Level" value={mon.level} />
        <Mini label="Stat Alignment" value={mon.nature} />
      </div>
      <p className="slot" style={{ marginTop: 4 }}>Stats</p>
      <div className="stats">
        {(
          [
            ["HP", mon.hp],
            ["Atk", mon.atk],
            ["Def", mon.def],
            ["SpA", mon.spa],
            ["SpD", mon.spd],
            ["Spe", mon.spe],
          ] as const
        ).map(([stat, value]) => (
          <Mini key={stat} label={stat} value={value} />
        ))}
      </div>
      <div className="moves">
        {mon.moves.map((move, i) => (
          <Mini key={i} label={`Move ${i + 1}`} value={move.name} />
        ))}
      </div>
    </div>
  );
}

function FoeMon({ index, mon }: { index: number; mon: ReturnType<typeof monRows>[number] }) {
  return (
    <div className="mon">
      <p className="slot">Pokémon {index}</p>
      <div className="grid2">
        <Mini label="Pokémon" value={mon.species} />
        <Mini label="Ability" value={mon.ability} />
        <Mini label="Held Item" value={mon.item} />
      </div>
      <div className="moves">
        {mon.moves.map((move, i) => (
          <Mini key={i} label={`Move ${i + 1}`} value={move.name} />
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <label className="mini">
      <span>{label}</span>
      <b>{value || "\u00a0"}</b>
    </label>
  );
}

const PRINT_CSS = `
  .vg-print { color: #111; font-family: "DM Sans", Helvetica, Arial, sans-serif; }
  .sheet {
    box-sizing: border-box;
    width: 8.5in;
    min-height: 11in;
    padding: 0.42in 0.45in 0.38in;
    margin: 0 auto 24px;
    background: #fff;
    color: #111;
    border: 1px solid #d4d4d4;
  }
  .mast { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; border-bottom: 3px solid #111; padding-bottom: 8px; }
  .kicker { margin: 0; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 700; }
  .mast h1 { margin: 2px 0 0; font-size: 20px; line-height: 1.1; text-transform: uppercase; letter-spacing: 0.02em; }
  .badge { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid #111; padding: 4px 8px; }
  .note { margin: 8px 0 10px; font-size: 11px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 8px; margin-bottom: 10px; }
  .meta.compact { grid-template-columns: 1fr 1fr; }
  .cell, .mini { display: flex; flex-direction: column; gap: 2px; }
  .cell.wide { grid-column: span 2; }
  .cell span, .mini span { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; color: #444; }
  .cell b, .mini b {
    display: block; min-height: 22px; padding: 3px 6px; border: 1px solid #222; font-size: 12px; font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ages { display: flex; gap: 4px; min-height: 22px; }
  .ages em { flex: 1; border: 1px solid #222; font-style: normal; font-size: 10px; text-align: center; padding: 4px 0; font-weight: 600; }
  .ages em.on { background: #111; color: #fff; }
  .mons { display: grid; gap: 7px; }
  .mons.staff { grid-template-columns: 1fr 1fr; }
  .mons.foes { grid-template-columns: 1fr 1fr; }
  .mon { border: 1px solid #222; padding: 6px; }
  .slot { margin: 0 0 4px; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
  .grid2, .moves, .stats { display: grid; gap: 4px; }
  .grid2 { grid-template-columns: 1fr 1fr; }
  .stats { grid-template-columns: repeat(6, 1fr); margin: 4px 0; }
  .moves { grid-template-columns: 1fr 1fr; margin-top: 4px; }
  .signs { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; margin-top: 10px; }
  .signs b { min-height: 36px; }
  @media print {
    @page { size: letter portrait; margin: 0; }
    html, body { background: #fff !important; }
    .no-print { display: none !important; }
    .sheet { margin: 0; border: 0; page-break-after: always; break-after: page; }
    .player-set .sheet:last-child { page-break-after: auto; }
  }
`;
