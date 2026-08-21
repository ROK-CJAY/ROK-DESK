import type { LookupCard } from "@/lib/card-lookup";

export type PtcgAttack = {
  name: string;
  cost: string[];
  damage: string;
};

export type PtcgAbility = {
  name: string;
  text: string;
};

export type PtcgMon = {
  id: string;
  name: string;
  image: string;
  hp: number;
  hpNow: number;
  type: string;
  attacks: PtcgAttack[];
  abilities: PtcgAbility[];
};

export type PtcgSideBoard = {
  energy: boolean;
  supporter: boolean;
  retreat: boolean;
  active: PtcgMon | null;
  bench: Array<PtcgMon | null>;
  spotlight: PtcgMon | null;
};

export type PtcgBoard = {
  p1: PtcgSideBoard;
  p2: PtcgSideBoard;
};

export const PTCG_BENCH = 5;

export function emptyPtcgSide(): PtcgSideBoard {
  return {
    energy: true,
    supporter: true,
    retreat: true,
    active: null,
    bench: [null, null, null, null, null],
    spotlight: null,
  };
}

export function emptyPtcgBoard(): PtcgBoard {
  return { p1: emptyPtcgSide(), p2: emptyPtcgSide() };
}

/** Retreat / switch: active and this bench slot trade places. */
export function swapActiveWithBench(side: PtcgSideBoard, index: number): PtcgSideBoard {
  if (index < 0 || index >= side.bench.length) return side;
  const incoming = side.bench[index];
  if (!incoming) return side;
  const bench = [...side.bench];
  bench[index] = side.active;
  return { ...side, active: incoming, bench };
}

/** Knock-out: this bench Pokémon becomes active; previous active is removed. */
export function promoteBenchToActive(side: PtcgSideBoard, index: number): PtcgSideBoard {
  if (index < 0 || index >= side.bench.length) return side;
  const incoming = side.bench[index];
  if (!incoming) return side;
  const bench = [...side.bench];
  bench[index] = null;
  return { ...side, active: incoming, bench };
}

function asMon(raw: unknown): PtcgMon | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim();
  if (!name) return null;
  const hp = Math.max(0, Number(row.hp) || 0);
  const hpNow = Math.max(0, Number(row.hpNow ?? hp) || 0);
  return {
    id: String(row.id ?? name),
    name,
    image: String(row.image ?? ""),
    hp,
    hpNow,
    type: String(row.type ?? ""),
    attacks: Array.isArray(row.attacks)
      ? row.attacks.flatMap((item) => {
          if (!item || typeof item !== "object" || !("name" in item)) return [];
          const atk = item as Record<string, unknown>;
          return [
            {
              name: String(atk.name ?? ""),
              cost: Array.isArray(atk.cost) ? atk.cost.map(String) : [],
              damage: String(atk.damage ?? ""),
            },
          ];
        })
      : [],
    abilities: Array.isArray(row.abilities)
      ? row.abilities.flatMap((item) => {
          if (!item || typeof item !== "object" || !("name" in item)) return [];
          const ab = item as Record<string, unknown>;
          return [{ name: String(ab.name ?? ""), text: String(ab.text ?? "") }];
        })
      : [],
  };
}

function parseSide(raw: unknown): PtcgSideBoard {
  const base = emptyPtcgSide();
  if (!raw || typeof raw !== "object") return base;
  const row = raw as Record<string, unknown>;
  const benchIn = Array.isArray(row.bench) ? row.bench : [];
  const bench = [0, 1, 2, 3, 4].map((i) => asMon(benchIn[i]) ?? null);
  return {
    energy: row.energy == null ? true : Boolean(row.energy),
    supporter: row.supporter == null ? true : Boolean(row.supporter),
    retreat: row.retreat == null ? true : Boolean(row.retreat),
    active: asMon(row.active),
    bench,
    spotlight: asMon(row.spotlight),
  };
}

export function parsePtcgBoard(raw: unknown): PtcgBoard {
  if (!raw || typeof raw !== "object") return emptyPtcgBoard();
  const row = raw as Record<string, unknown>;
  return { p1: parseSide(row.p1), p2: parseSide(row.p2) };
}

export function monFromLookup(card: LookupCard): PtcgMon {
  const hp = Math.max(0, Number.parseInt(String(card.hp ?? "0"), 10) || 0);
  return {
    id: card.id,
    name: card.name,
    image: card.image ?? "",
    hp,
    hpNow: hp,
    type: card.type ?? "",
    attacks: (card.attacks ?? []).map((atk) => ({
      name: atk.name,
      cost: atk.cost ?? [],
      damage: atk.damage ?? "",
    })),
    abilities: (card.abilities ?? []).map((ab) => ({
      name: ab.name,
      text: ab.text ?? "",
    })),
  };
}

export function patchPtcgSide(
  board: PtcgBoard,
  side: "p1" | "p2",
  next: Partial<PtcgSideBoard>,
): PtcgBoard {
  return { ...board, [side]: { ...board[side], ...next, bench: next.bench ?? board[side].bench } };
}

export function addToBench(side: PtcgSideBoard, mon: PtcgMon): PtcgSideBoard {
  const bench = [...side.bench];
  const empty = bench.findIndex((slot) => !slot);
  if (empty >= 0) bench[empty] = mon;
  else bench[PTCG_BENCH - 1] = mon;
  while (bench.length < PTCG_BENCH) bench.push(null);
  return { ...side, bench: bench.slice(0, PTCG_BENCH) };
}

export function energyColor(type: string): string {
  const key = type.toLowerCase();
  if (key.includes("grass")) return "#4caf50";
  if (key.includes("fire")) return "#ef6c2b";
  if (key.includes("water")) return "#2f9ed8";
  if (key.includes("lightning") || key.includes("electric")) return "#f5d445";
  if (key.includes("psychic")) return "#c45ec4";
  if (key.includes("fighting")) return "#c45a28";
  if (key.includes("dark")) return "#5a5370";
  if (key.includes("metal") || key.includes("steel")) return "#9aa4b2";
  if (key.includes("fairy")) return "#e78dc0";
  if (key.includes("dragon")) return "#7a6ad8";
  return "#d8d8d8";
}
