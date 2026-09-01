import {
  ageLabel,
  battleTeamOf,
  monRows,
  printAgeDivision,
  switchProfileOf,
  trainerNameOf,
} from "@/lib/vg-team-list";
import type { Entrant, TournamentState } from "@/lib/tournament-types";
import type { TeamMon } from "@/lib/pokemon-vgc";

export function VgTeamListPrint({
  tournament,
  players,
}: {
  tournament: TournamentState;
  players: Entrant[];
}) {
  return (
    <div className="vg-print">
      <style>{PRINT_CSS}</style>
      {players.map((player) => (
        <article key={player.id} className="player-set">
          <OfficialPage variant="staff" tournament={tournament} player={player} />
          <OfficialPage variant="opponents" tournament={tournament} player={player} />
        </article>
      ))}
    </div>
  );
}

function OfficialPage({
  variant,
  tournament,
  player,
}: {
  variant: "staff" | "opponents";
  tournament: TournamentState;
  player: Entrant;
}) {
  const staff = variant === "staff";
  const mons = monRows(player);
  const division = printAgeDivision(player, tournament.gameId);
  return (
    <section className={`sheet ${staff ? "staff" : "foes"}`}>
      <header className="head">
        <div className="brand">
          <p className="play">Play! Pokémon</p>
          <h1>Pokémon Video Game Team List</h1>
          <p className="which">
            {staff ? (
              <>
                <strong>1 of 2:</strong> For Tournament Staff
              </>
            ) : (
              <>
                <strong>2 of 2:</strong> For Opponents
              </>
            )}
          </p>
        </div>
        <AgeChecks value={division} />
      </header>

      <p className="instruct">
        {staff
          ? "Complete both pages of this document. Submit this page to event staff before the tournament, at the time set by the Organizer."
          : "Do not lose this page! Keep it throughout the tournament, sharing it with your opponent each round."}
      </p>

      <div className="id-grid">
        <Write label="Player Name" value={player.name} />
        <Write label="Trainer Name in Game" value={trainerNameOf(player)} />
        <Write label="Battle Team Number / Name" value={battleTeamOf(player)} />
        <Write label="Switch Profile Name" value={switchProfileOf(player)} />
        {staff ? (
          <>
            <Write label="Player ID" value={player.playerId} />
            <Write label="Date of Birth" value={player.birthDate} />
            <Write label="Support ID" value="" />
          </>
        ) : (
          <Write label="Event" value={`${tournament.name} · ${tournament.formatName}`} />
        )}
      </div>

      <div className="team">
        {mons.map((mon, i) =>
          staff ? <StaffSlot key={i} mon={mon} /> : <FoeSlot key={i} mon={mon} />,
        )}
      </div>

      <p className="foot">All Pokémon must be listed exactly as they appear in the Battle Team.</p>
      {staff ? (
        <div className="signs">
          <Write label="Player Signature" value="" tall />
          <Write label="Staff Use" value="" tall />
        </div>
      ) : (
        <p className="event-line">
          {tournament.name} · {tournament.formatName}
          {ageLabel(division) ? ` · ${ageLabel(division)}` : ""}
        </p>
      )}
    </section>
  );
}

function AgeChecks({ value }: { value: string }) {
  return (
    <div className="ages">
      <span>Age Division</span>
      <div>
        {(["juniors", "seniors", "masters"] as const).map((id) => (
          <label key={id} className={value === id ? "on" : ""}>
            <i />
            {id === "juniors" ? "Junior" : id === "seniors" ? "Senior" : "Masters"}
          </label>
        ))}
      </div>
    </div>
  );
}

function Write({ label, value, tall }: { label: string; value: string; tall?: boolean }) {
  return (
    <label className={tall ? "write tall" : "write"}>
      <span>{label}</span>
      <b>{value || "\u00a0"}</b>
    </label>
  );
}

function speciesLine(mon: TeamMon): string {
  return mon.species;
}

function StaffSlot({ mon }: { mon: TeamMon }) {
  return (
    <div className="slot">
      <div className="slot-top">
        <Line label="Pokémon" value={speciesLine(mon)} />
        <Line label="Stat Alignment" value={mon.nature} />
      </div>
      <div className="slot-grid">
        <div className="slot-left">
          <Line label="Ability" value={mon.ability} />
          <Line label="Held Item" value={mon.item} />
          <Line label="Move 1" value={mon.moves[0]?.name ?? ""} />
          <Line label="Move 2" value={mon.moves[1]?.name ?? ""} />
          <Line label="Move 3" value={mon.moves[2]?.name ?? ""} />
          <Line label="Move 4" value={mon.moves[3]?.name ?? ""} />
        </div>
        <div className="slot-stats">
          <Stat label="HP" value={mon.hp} />
          <Stat label="Atk" value={mon.atk} />
          <Stat label="Def" value={mon.def} />
          <Stat label="Sp. Atk" value={mon.spa} />
          <Stat label="Sp. Def" value={mon.spd} />
          <Stat label="Speed" value={mon.spe} />
        </div>
      </div>
    </div>
  );
}

function FoeSlot({ mon }: { mon: TeamMon }) {
  return (
    <div className="slot foe">
      <Line label="Pokémon" value={speciesLine(mon)} />
      <Line label="Stat Alignment" value={mon.nature} />
      <Line label="Ability" value={mon.ability} />
      <Line label="Held Item" value={mon.item} />
      <Line label="Move 1" value={mon.moves[0]?.name ?? ""} />
      <Line label="Move 2" value={mon.moves[1]?.name ?? ""} />
      <Line label="Move 3" value={mon.moves[2]?.name ?? ""} />
      <Line label="Move 4" value={mon.moves[3]?.name ?? ""} />
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <label className="line">
      <span>{label}</span>
      <b>{value || "\u00a0"}</b>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <label className="stat">
      <span>{label}</span>
      <b>{value || "\u00a0"}</b>
    </label>
  );
}

const PRINT_CSS = `
  .vg-print {
    color: #111;
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
  }
  .sheet {
    box-sizing: border-box;
    width: 8.5in;
    min-height: 11in;
    padding: 0.38in 0.42in 0.32in;
    margin: 0 auto 20px;
    background: #fff;
    color: #111;
    border: 1px solid #ccc;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    border-bottom: 2px solid #111;
    padding-bottom: 8px;
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
    line-height: 1.1;
    font-weight: 700;
  }
  .which {
    margin: 3px 0 0;
    font-size: 11px;
  }
  .ages {
    text-align: right;
    flex: 0 0 auto;
  }
  .ages > span {
    display: block;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .ages div { display: flex; gap: 8px; }
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
  .ages label.on i {
    background: #111;
    box-shadow: inset 0 0 0 2px #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .instruct {
    margin: 8px 0 8px;
    font-size: 10px;
    font-style: italic;
    line-height: 1.35;
  }
  .id-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 5px 8px;
    margin-bottom: 8px;
  }
  .write, .line, .stat { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .write span, .line span, .stat span {
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .write b, .line b, .stat b {
    display: block;
    min-height: 16px;
    border-bottom: 1px solid #111;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.2;
    padding: 1px 0 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .write.tall b { min-height: 28px; }
  .team {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px 8px;
  }
  .slot {
    border: 1.4px solid #111;
    padding: 5px 6px 6px;
  }
  .slot-top {
    display: grid;
    grid-template-columns: 1.4fr 0.9fr;
    gap: 6px;
    margin-bottom: 4px;
  }
  .slot-grid {
    display: grid;
    grid-template-columns: 1.4fr 0.9fr;
    gap: 6px;
  }
  .slot-left, .slot-stats { display: grid; gap: 3px; }
  .stat {
    display: grid;
    grid-template-columns: 42px 1fr;
    align-items: end;
    gap: 4px;
  }
  .stat span { padding-bottom: 1px; }
  .foe .line { margin-bottom: 2px; }
  .foot {
    margin: 8px 0 0;
    font-size: 9px;
    font-style: italic;
  }
  .signs {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 12px;
    margin-top: 8px;
  }
  .event-line {
    margin: 8px 0 0;
    font-size: 9px;
  }
  @media print {
    @page { size: letter portrait; margin: 0; }
    html, body { background: #fff !important; }
    .no-print { display: none !important; }
    .sheet { margin: 0; border: 0; page-break-after: always; break-after: page; }
    .player-set .sheet:last-child { page-break-after: auto; }
  }
`;
