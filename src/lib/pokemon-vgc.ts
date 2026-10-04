import { SPECIES as NATIONAL_SPECIES } from "./pokedex-national";
import { ALL_MOVES } from "./pokedex-moves";
import { ZA_ABILITY_FILL, ZA_FORMES, ZA_MOVES } from "./pokedex-za";
import { REG_MC_FORMES, REG_MC_NAME_SET } from "./pokedex-reg-mc";

export const POKE_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type PokeType = (typeof POKE_TYPES)[number];

export const TYPE_LABEL: Record<PokeType, string> = {
  normal: "Normal",
  fire: "Fire",
  water: "Water",
  electric: "Electric",
  grass: "Grass",
  ice: "Ice",
  fighting: "Fighting",
  poison: "Poison",
  ground: "Ground",
  flying: "Flying",
  psychic: "Psychic",
  bug: "Bug",
  rock: "Rock",
  ghost: "Ghost",
  dragon: "Dragon",
  dark: "Dark",
  steel: "Steel",
  fairy: "Fairy",
};

export const TERA_OPTIONS = [...POKE_TYPES, "stellar"] as const;
export type TeraType = (typeof TERA_OPTIONS)[number];

export const TERA_LABEL: Record<TeraType, string> = {
  ...TYPE_LABEL,
  stellar: "Stellar",
};

export type MonTypes = [PokeType | "", PokeType | ""];

export type MoveSlot = {
  name: string;
  type: PokeType | "";
};

export type TeamMon = {
  species: string;
  dex: number;
  types: MonTypes;
  tera: TeraType | "";
  ability: string;
  item: string;
  moves: [MoveSlot, MoveSlot, MoveSlot, MoveSlot];
  level: string;
  nature: string;
  hp: string;
  atk: string;
  def: string;
  spa: string;
  spd: string;
  spe: string;
};

export const NATURES = [
  "Adamant",
  "Bashful",
  "Bold",
  "Brave",
  "Calm",
  "Careful",
  "Docile",
  "Gentle",
  "Hardy",
  "Hasty",
  "Impish",
  "Jolly",
  "Lax",
  "Lonely",
  "Mild",
  "Modest",
  "Naive",
  "Naughty",
  "Quiet",
  "Quirky",
  "Rash",
  "Relaxed",
  "Sassy",
  "Serious",
  "Timid",
] as const;

export type SpeciesDef = {
  name: string;
  dex: number;
  slug: string;
  spriteDex?: number;
  types: PokeType[];
  abilities: string[];
};

export function speciesArtDex(species: SpeciesDef): number {
  return species.spriteDex ?? species.dex;
}

export function emptyTypes(): MonTypes {
  return ["", ""];
}

export function isPokeType(value: unknown): value is PokeType {
  return typeof value === "string" && (POKE_TYPES as readonly string[]).includes(value);
}

export function typesFromSpecies(name: string): MonTypes {
  const found = findSpecies(name);
  return [found?.types[0] ?? "", found?.types[1] ?? ""];
}

export function mergeTypes(raw: unknown, speciesName = ""): MonTypes {
  const list = Array.isArray(raw) ? raw : [];
  const first = isPokeType(list[0]) ? list[0] : "";
  const second = isPokeType(list[1]) ? list[1] : "";
  if (first || second) return [first, second];
  return typesFromSpecies(speciesName);
}

export function emptyMove(): MoveSlot {
  return { name: "", type: "" };
}

export function emptyMon(): TeamMon {
  return {
    species: "",
    dex: 0,
    types: emptyTypes(),
    tera: "",
    ability: "",
    item: "",
    moves: [emptyMove(), emptyMove(), emptyMove(), emptyMove()],
    level: "50",
    nature: "",
    hp: "",
    atk: "",
    def: "",
    spa: "",
    spd: "",
    spe: "",
  };
}

export function emptyTeam(): TeamMon[] {
  return [emptyMon(), emptyMon(), emptyMon(), emptyMon(), emptyMon(), emptyMon()];
}

export function spriteUrl(input: number | { dex?: number; species?: string } | string): string {
  if (typeof input === "string") {
    const found = findSpecies(input);
    if (found?.slug) return pokemondbSprite(found.slug);
    return "";
  }
  if (typeof input === "number") {
    if (!input) return "";
    const found = SPECIES.find((s) => s.dex === input && !s.spriteDex);
    if (found?.slug) return pokemondbSprite(found.slug);
    return pokeapiArt(input);
  }
  const found = input.species ? findSpecies(input.species) : undefined;
  if (found?.slug) return pokemondbSprite(found.slug);
  if (input.dex) return pokeapiArt(input.dex);
  return "";
}

export function spriteFallbackUrl(input: { dex?: number; species?: string }): string {
  const dex = input.dex || findSpecies(input.species ?? "")?.dex || 0;
  return dex ? pokeapiArt(dex) : "";
}

function pokemondbSprite(slug: string): string {
  return `https://img.pokemondb.net/sprites/home/normal/2x/${slug}.jpg`;
}

function pokeapiArt(dex: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dex}.png`;
}

export const SPECIES: SpeciesDef[] = mergeNationalWithZa();

function mergeNationalWithZa(): SpeciesDef[] {
  const rows = (NATIONAL_SPECIES as unknown as SpeciesDef[]).map((row) => {
    const fill = ZA_ABILITY_FILL[row.name];
    if (!fill || row.abilities.length) return row;
    return { ...row, abilities: fill };
  });
  const seen = new Set(rows.map((row) => row.name.toLowerCase()));
  for (const forme of ZA_FORMES) {
    if (seen.has(forme.name.toLowerCase())) continue;
    seen.add(forme.name.toLowerCase());
    rows.push({ ...forme, types: [...forme.types] as PokeType[], abilities: [...forme.abilities] });
  }
  for (const forme of REG_MC_FORMES) {
    if (seen.has(forme.name.toLowerCase())) continue;
    seen.add(forme.name.toLowerCase());
    rows.push({ ...forme, types: [...forme.types] as PokeType[], abilities: [...forme.abilities] });
  }
  return rows;
}

export const VGC_ITEMS_RAW = [
  "Ability Shield",
  "Assault Vest",
  "Booster Energy",
  "Choice Band",
  "Choice Scarf",
  "Choice Specs",
  "Clear Amulet",
  "Covert Cloak",
  "Eject Button",
  "Eject Pack",
  "Focus Sash",
  "Life Orb",
  "Loaded Dice",
  "Leek",
  "Normal Gem",
  "Mental Herb",
  "Mirror Herb",
  "Power Herb",
  "Rocky Helmet",
  "Safety Goggles",
  "Sitrus Berry",
  "Wiki Berry",
  "Iapapa Berry",
  "Aguav Berry",
  "Figy Berry",
  "Mago Berry",
  "Leftovers",
  "Lum Berry",
  "Occa Berry",
  "Colbur Berry",
  "Chople Berry",
  "Kasib Berry",
  "Babiri Berry",
  "Shuca Berry",
  "Yache Berry",
  "Charti Berry",
  "Passho Berry",
  "Rindo Berry",
  "Wacan Berry",
  "Fairy Feather",
  "Punching Glove",
  "Wide Lens",
  "Scope Lens",
  "Weakness Policy",
  "Air Balloon",
  "Red Card",
  "Light Clay",
  "Terrain Extender",
  "Heat Rock",
  "Damp Rock",
  "Smooth Rock",
  "Icy Rock",
  "Throat Spray",
  "Room Service",
  "Heavy-Duty Boots",
  "Expert Belt",
  "Muscle Band",
  "Wise Glasses",
  "Charcoal",
  "Mystic Water",
  "Miracle Seed",
  "Magnet",
  "Never-Melt Ice",
  "Black Belt",
  "Poison Barb",
  "Soft Sand",
  "Sharp Beak",
  "Twisted Spoon",
  "Silver Powder",
  "Hard Stone",
  "Spell Tag",
  "Dragon Fang",
  "Black Glasses",
  "Metal Coat",
  "Pink Bow",
  "Rusted Sword",
  "Rusted Shield",
  "Wellspring Mask",
  "Hearthflame Mask",
  "Cornerstone Mask",
  "Eviolite",
  "Black Sludge",
  "Flame Orb",
  "Toxic Orb",
  "Life Orb",
  "White Herb",
  "Mental Herb",
  "Mirror Herb",
  "Power Herb",
  "Eject Button",
  "Eject Pack",
  "Red Card",
  "Air Balloon",
  "Focus Sash",
  "Focus Band",
  "Binding Band",
  "Iron Ball",
  "Lagging Tail",
  "Shed Shell",
  "Sticky Barb",
  "Float Stone",
  "Ring Target",
  "Protective Pads",
  "Punching Glove",
  "Loaded Dice",
  "Covert Cloak",
  "Clear Amulet",
  "Ability Shield",
  "Booster Energy",
  "Fairy Feather",
  "Throat Spray",
  "Room Service",
  "Blunder Policy",
  "Weakness Policy",
  "Adrenaline Orb",
  "Terrain Extender",
  "Light Clay",
  "Heat Rock",
  "Damp Rock",
  "Smooth Rock",
  "Icy Rock",
  "Electric Seed",
  "Grassy Seed",
  "Misty Seed",
  "Psychic Seed",
  "Safety Goggles",
  "Heavy-Duty Boots",
  "Rocky Helmet",
  "Assault Vest",
  "Choice Band",
  "Choice Scarf",
  "Choice Specs",
  "Expert Belt",
  "Life Orb",
  "Leftovers",
  "Sitrus Berry",
  "Wiki Berry",
  "Iapapa Berry",
  "Aguav Berry",
  "Figy Berry",
  "Mago Berry",
  "Lum Berry",
  "Chesto Berry",
  "Pecha Berry",
  "Rawst Berry",
  "Aspear Berry",
  "Persim Berry",
  "Leppa Berry",
  "Oran Berry",
  "Liechi Berry",
  "Ganlon Berry",
  "Salac Berry",
  "Petaya Berry",
  "Apicot Berry",
  "Starf Berry",
  "Lansat Berry",
  "Micle Berry",
  "Custap Berry",
  "Enigma Berry",
  "Kee Berry",
  "Maranga Berry",
  "Jaboca Berry",
  "Rowap Berry",
  "Roseli Berry",
  "Kasib Berry",
  "Colbur Berry",
  "Babiri Berry",
  "Chople Berry",
  "Charti Berry",
  "Chilan Berry",
  "Coba Berry",
  "Haban Berry",
  "Payapa Berry",
  "Tanga Berry",
  "Wacan Berry",
  "Occa Berry",
  "Passho Berry",
  "Rindo Berry",
  "Shuca Berry",
  "Yache Berry",
  "Kebia Berry",
  "Rusted Sword",
  "Rusted Shield",
  "Wellspring Mask",
  "Hearthflame Mask",
  "Cornerstone Mask",
  "Adamant Crystal",
  "Lustrous Globe",
  "Griseous Core",
  "Booster Energy",
];

/** Held Mega Stones (XY/ORAS + Legends Z-A / Mega Dimension). */
export const MEGA_STONES = [
  "Abomasite",
  "Absolite",
  "Absolite Z",
  "Aerodactylite",
  "Aggronite",
  "Alakazite",
  "Altarianite",
  "Ampharosite",
  "Audinite",
  "Banettite",
  "Barbaracite",
  "Baxcalibrite",
  "Beedrillite",
  "Blastoisinite",
  "Blazikenite",
  "Cameruptite",
  "Chandelurite",
  "Charizardite X",
  "Charizardite Y",
  "Chesnaughtite",
  "Chimechite",
  "Clefablite",
  "Crabominite",
  "Darkranite",
  "Delphoxite",
  "Diancite",
  "Dragalgite",
  "Dragoninite",
  "Drampanite",
  "Eelektrossite",
  "Emboarite",
  "Excadrite",
  "Falinksite",
  "Feraligite",
  "Floettite",
  "Froslassite",
  "Galladite",
  "Garchompite",
  "Garchompite Z",
  "Gardevoirite",
  "Gengarite",
  "Glalitite",
  "Glimmoranite",
  "Golisopite",
  "Golurkite",
  "Greninjite",
  "Gyaradosite",
  "Hawluchanite",
  "Heatranite",
  "Heracronite",
  "Houndoominite",
  "Kangaskhanite",
  "Latiasite",
  "Latiosite",
  "Lopunnite",
  "Lucarionite",
  "Lucarionite Z",
  "Magearnite",
  "Malamarite",
  "Manectite",
  "Mawilite",
  "Medichamite",
  "Meganiumite",
  "Meowsticite",
  "Metagrossite",
  "Mewtwonite X",
  "Mewtwonite Y",
  "Pidgeotite",
  "Pinsirite",
  "Pyroarite",
  "Raichunite X",
  "Raichunite Y",
  "Sablenite",
  "Salamencite",
  "Sceptilite",
  "Scizorite",
  "Scolipite",
  "Scovillainite",
  "Scraftinite",
  "Sharpedonite",
  "Skarmorite",
  "Slowbronite",
  "Staraptite",
  "Starminite",
  "Steelixite",
  "Swampertite",
  "Tatsugirinite",
  "Tyranitarite",
  "Venusaurite",
  "Victreebelite",
  "Zeraorite",
  "Zygardite",
] as const;

export const VGC_ITEMS = [...new Set([...VGC_ITEMS_RAW, ...MEGA_STONES])].sort((a, b) =>
  a.localeCompare(b),
);

export type MoveDef = { name: string; type: PokeType };

export const VGC_MOVES: MoveDef[] = mergeMoves();

function mergeMoves(): MoveDef[] {
  const seen = new Set<string>();
  const out: MoveDef[] = [];
  for (const move of [...(ALL_MOVES as MoveDef[]), ...(ZA_MOVES as MoveDef[])]) {
    const key = move.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(move);
  }
  return out;
}

export function findMove(name: string): MoveDef | undefined {
  const key = name.trim().toLowerCase();
  if (!key) return undefined;
  const exact = VGC_MOVES.find((m) => m.name.toLowerCase() === key);
  if (exact) return exact;
  const starts = VGC_MOVES.filter((m) => m.name.toLowerCase().startsWith(key));
  if (starts.length === 1 && key.length >= 4) return starts[0];
  return undefined;
}

export const VGC_ABILITIES = [...new Set(SPECIES.flatMap((s) => s.abilities))].sort((a, b) => a.localeCompare(b));

export function findSpecies(name: string): SpeciesDef | undefined {
  const key = speciesKey(name);
  if (!key) return undefined;
  const aliased = SPECIES_ALIASES[key] ?? key;
  const exact = SPECIES.find((s) => speciesKey(s.name) === aliased);
  if (exact) return exact;
  const starts = SPECIES.filter((s) => speciesKey(s.name).startsWith(aliased) || speciesKey(s.name).startsWith(key));
  if (starts.length === 1 && key.length >= 4 && !isMegaForme(starts[0].name)) return starts[0];
  return undefined;
}

function speciesKey(name: string): string {
  return name.trim().toLowerCase().replaceAll("’", "'").replaceAll("‘", "'");
}

const SPECIES_ALIASES: Record<string, string> = {
  "eternal flower floette": "floette eternal",
  "floette eternal flower": "floette eternal",
  "eternal floette": "floette eternal",
  "mega eternal flower floette": "mega floette",
  "mega eternal floette": "mega floette",
  "raichu (alolan form)": "raichu-a",
  "alolan raichu": "raichu-a",
  "ninetales (alolan form)": "ninetales-a",
  "alolan ninetales": "ninetales-a",
  "persian (alolan form)": "persian-a",
  "alolan persian": "persian-a",
  "arcanine (hisuian form)": "arcanine-h",
  "hisuian arcanine": "arcanine-h",
  "slowbro (galarian form)": "slowbro-g",
  "galarian slowbro": "slowbro-g",
  "slowking (galarian form)": "slowking-g",
  "galarian slowking": "slowking-g",
  "tauros (paldean form (combat breed))": "tauros-paldea",
  "tauros (paldean combat breed)": "tauros-paldea",
  "paldean tauros": "tauros-paldea",
  "tauros (paldean form (blaze breed))": "tauros-paldea-blaze",
  "tauros (paldean form (aqua breed))": "tauros-paldea-aqua",
  "typhlosion (hisuian form)": "typhlosion-h",
  "hisuian typhlosion": "typhlosion-h",
  "samurott (hisuian form)": "samurott-h",
  "hisuian samurott": "samurott-h",
  "zoroark (hisuian form)": "zoroark-h",
  "hisuian zoroark": "zoroark-h",
  "stunfisk (galarian form)": "stunfisk-g",
  "galarian stunfisk": "stunfisk-g",
  "goodra (hisuian form)": "goodra-h",
  "hisuian goodra": "goodra-h",
  "avalugg (hisuian form)": "avalugg-h",
  "hisuian avalugg": "avalugg-h",
  "decidueye (hisuian form)": "decidueye-h",
  "hisuian decidueye": "decidueye-h",
  "rotom (rotom)": "rotom",
  "rotom (heat rotom)": "rotom-heat",
  "heat rotom": "rotom-heat",
  "rotom-h": "rotom-heat",
  "rotom (wash rotom)": "rotom-wash",
  "wash rotom": "rotom-wash",
  "rotom-w": "rotom-wash",
  "rotom (frost rotom)": "rotom-frost",
  "frost rotom": "rotom-frost",
  "rotom-f": "rotom-frost",
  "rotom (fan rotom)": "rotom-fan",
  "fan rotom": "rotom-fan",
  "rotom-s": "rotom-fan",
  "rotom (mow rotom)": "rotom-mow",
  "mow rotom": "rotom-mow",
  "rotom-c": "rotom-mow",
  "meowstic (male)": "meowstic",
  "meowstic (female)": "meowstic-f",
  "female meowstic": "meowstic-f",
  "gourgeist (medium variety)": "gourgeist",
  "gourgeist (small variety)": "gourgeist-small",
  "gourgeist (large variety)": "gourgeist-large",
  "gourgeist (jumbo variety)": "gourgeist-super",
  "gourgeist-jumbo": "gourgeist-super",
  "lycanroc (midday form)": "lycanroc",
  "lycanroc (midnight form)": "lycanroc-midnight",
  "lycanroc (dusk form)": "lycanroc-dusk",
  "toxtricity (amped form)": "toxtricity",
  "toxtricity (low key form)": "toxtricity-low-key",
  "indeedee (male)": "indeedee m",
  "indeedee (female)": "indeedee f",
  "indeedee-m": "indeedee m",
  "indeedee-f": "indeedee f",
  "basculegion (male)": "basculegion",
  "basculegion (female)": "basculegion-f",
};

export function isMegaForme(name: string): boolean {
  return speciesKey(name).startsWith("mega ");
}

export function isRegMcSpecies(name: string): boolean {
  const key = speciesKey(name);
  return REG_MC_NAME_SET.has(SPECIES_ALIASES[key] ?? key);
}

const FORM_SEARCH: Record<string, string> = {
  "Raichu-A": "Alolan",
  "Ninetales-A": "Alolan",
  "Persian-A": "Alolan",
  "Arcanine-H": "Hisuian",
  "Slowbro-G": "Galarian",
  "Slowking-G": "Galarian",
  "Tauros-Paldea": "Paldea Combat",
  "Tauros-Paldea-Blaze": "Paldea Blaze",
  "Tauros-Paldea-Aqua": "Paldea Aqua",
  "Typhlosion-H": "Hisuian",
  "Samurott-H": "Hisuian",
  "Rotom-Heat": "Heat",
  "Rotom-Wash": "Wash",
  "Rotom-Frost": "Frost",
  "Rotom-Fan": "Fan",
  "Rotom-Mow": "Mow",
  "Zoroark-H": "Hisuian",
  "Stunfisk-G": "Galarian",
  "Floette Eternal": "Eternal Flower",
  "Meowstic-F": "Female",
  "Goodra-H": "Hisuian",
  "Gourgeist-Small": "Small",
  "Gourgeist-Large": "Large",
  "Gourgeist-Super": "Jumbo",
  "Avalugg-H": "Hisuian",
  "Decidueye-H": "Hisuian",
  "Lycanroc-Midnight": "Midnight",
  "Lycanroc-Dusk": "Dusk",
  "Toxtricity-Low-Key": "Low Key",
  "Indeedee M": "Male",
  "Indeedee F": "Female",
  "Basculegion-F": "Female",
};

export const SPECIES_OPTIONS = SPECIES.filter((species) => isRegMcSpecies(species.name) && !isMegaForme(species.name))
  .slice()
  .sort((a, b) => a.dex - b.dex || a.name.localeCompare(b.name))
  .map((species) => {
    const form = FORM_SEARCH[species.name];
    const dex = `#${String(species.dex).padStart(4, "0")}`;
    return {
      value: species.name,
      label: species.name,
      hint: form ? `${dex} · ${form}` : dex,
    };
  });

export const ITEM_OPTIONS = VGC_ITEMS.map((item) => ({
  value: item,
  label: item,
}));

export const MOVE_OPTIONS = VGC_MOVES.map((move) => ({
  value: move.name,
  label: move.name,
  hint: TYPE_LABEL[move.type],
}));

export function applySpeciesChoice(mon: TeamMon, name: string): TeamMon {
  const found = findSpecies(name);
  return {
    ...mon,
    species: found?.name ?? name,
    dex: found ? speciesArtDex(found) : mon.dex,
    types: found ? typesFromSpecies(found.name) : mon.types,
    ability: found && !found.abilities.includes(mon.ability) ? found.abilities[0] ?? "" : mon.ability,
  };
}

export function applyMoveChoice(mon: TeamMon, index: number, name: string): TeamMon {
  const found = findMove(name);
  const moves = [...mon.moves] as TeamMon["moves"];
  const current = moves[index] ?? { name: "", type: "" as const };
  moves[index] = { name: found?.name ?? name, type: found?.type ?? current.type };
  return { ...mon, moves };
}

export function mergeTeam(raw: unknown): TeamMon[] {
  const list = Array.isArray(raw) ? raw : [];
  return emptyTeam().map((slot, i) => {
    const row = list[i];
    if (!row || typeof row !== "object") return slot;
    const incoming = row as Partial<TeamMon>;
    const moves = Array.isArray(incoming.moves) ? incoming.moves : [];
    const species = typeof incoming.species === "string" ? incoming.species : "";
    return {
      species,
      dex: typeof incoming.dex === "number" ? incoming.dex : 0,
      types: mergeTypes(incoming.types, species),
      tera: TERA_OPTIONS.includes(incoming.tera as TeraType) ? (incoming.tera as TeraType) : "",
      ability: typeof incoming.ability === "string" ? incoming.ability : "",
      item: typeof incoming.item === "string" ? incoming.item : "",
      level: typeof incoming.level === "string" ? incoming.level : incoming.level != null ? String(incoming.level) : "",
      nature: typeof incoming.nature === "string" ? incoming.nature : "",
      hp: typeof incoming.hp === "string" ? incoming.hp : incoming.hp != null ? String(incoming.hp) : "",
      atk: typeof incoming.atk === "string" ? incoming.atk : incoming.atk != null ? String(incoming.atk) : "",
      def: typeof incoming.def === "string" ? incoming.def : incoming.def != null ? String(incoming.def) : "",
      spa: typeof incoming.spa === "string" ? incoming.spa : incoming.spa != null ? String(incoming.spa) : "",
      spd: typeof incoming.spd === "string" ? incoming.spd : incoming.spd != null ? String(incoming.spd) : "",
      spe: typeof incoming.spe === "string" ? incoming.spe : incoming.spe != null ? String(incoming.spe) : "",
      moves: [0, 1, 2, 3].map((idx) => {
        const move = moves[idx];
        if (!move || typeof move !== "object") return emptyMove();
        return {
          name: typeof move.name === "string" ? move.name : "",
          type: (move.type as PokeType | "") || "",
        };
      }) as TeamMon["moves"],
    };
  });
}

export function sampleTeamA(): TeamMon[] {
  return [
    mon("Scovillain", "fire", "Moody", "Life Orb", [
      ["Flamethrower", "fire"],
      ["Giga Drain", "grass"],
      ["Rage Powder", "bug"],
      ["Protect", "normal"],
    ]),
    mon("Archaludon", "dragon", "Stamina", "Leftovers", [
      ["Dragon Pulse", "dragon"],
      ["Flash Cannon", "steel"],
      ["Electro Shot", "electric"],
      ["Protect", "normal"],
    ]),
    mon("Espathra", "psychic", "Speed Boost", "Colbur Berry", [
      ["Lumina Crash", "psychic"],
      ["Calm Mind", "psychic"],
      ["Baton Pass", "normal"],
      ["Protect", "normal"],
    ]),
    mon("Incineroar", "grass", "Intimidate", "Charcoal", [
      ["Fake Out", "normal"],
      ["Flare Blitz", "fire"],
      ["Throat Chop", "dark"],
      ["Parting Shot", "dark"],
    ]),
    mon("Politoed", "water", "Drizzle", "Choice Scarf", [
      ["Weather Ball", "normal"],
      ["Muddy Water", "water"],
      ["Ice Beam", "ice"],
      ["Icy Wind", "ice"],
    ]),
    mon("Sylveon", "fairy", "Pixilate", "Fairy Feather", [
      ["Hyper Voice", "normal"],
      ["Moonblast", "fairy"],
      ["Psych Up", "normal"],
      ["Protect", "normal"],
    ]),
  ];
}

export function sampleTeamB(): TeamMon[] {
  return [
    mon("Flutter Mane", "fairy", "Protosynthesis", "Booster Energy", [
      ["Moonblast", "fairy"],
      ["Shadow Ball", "ghost"],
      ["Icy Wind", "ice"],
      ["Protect", "normal"],
    ]),
    mon("Incineroar", "grass", "Intimidate", "Safety Goggles", [
      ["Fake Out", "normal"],
      ["Flare Blitz", "fire"],
      ["Knock Off", "dark"],
      ["Parting Shot", "dark"],
    ]),
    mon("Amoonguss", "water", "Regenerator", "Rocky Helmet", [
      ["Pollen Puff", "bug"],
      ["Rage Powder", "bug"],
      ["Spore", "grass"],
      ["Protect", "normal"],
    ]),
    mon("Raging Bolt", "electric", "Protosynthesis", "Assault Vest", [
      ["Thunderclap", "electric"],
      ["Dragon Pulse", "dragon"],
      ["Thunderbolt", "electric"],
      ["Snarl", "dark"],
    ]),
    mon("Urshifu Rapid", "water", "Unseen Fist", "Choice Scarf", [
      ["Surging Strikes", "water"],
      ["Close Combat", "fighting"],
      ["U-turn", "bug"],
      ["Aqua Jet", "water"],
    ]),
    mon("Farigiraf", "psychic", "Armor Tail", "Throat Spray", [
      ["Hyper Voice", "normal"],
      ["Psychic", "psychic"],
      ["Trick Room", "psychic"],
      ["Helping Hand", "normal"],
    ]),
  ];
}

function mon(
  name: string,
  tera: PokeType,
  ability: string,
  item: string,
  moves: Array<[string, PokeType]>,
): TeamMon {
  const species = findSpecies(name);
  return {
    species: name,
    dex: species ? speciesArtDex(species) : 0,
    types: [species?.types[0] ?? "", species?.types[1] ?? ""],
    tera,
    ability,
    item,
    level: "50",
    nature: "",
    hp: "",
    atk: "",
    def: "",
    spa: "",
    spd: "",
    spe: "",
    moves: [0, 1, 2, 3].map((i) => ({
      name: moves[i]?.[0] ?? "",
      type: moves[i]?.[1] ?? "",
    })) as TeamMon["moves"],
  };
}

export function teamHasMons(team: TeamMon[] | undefined): boolean {
  return countFilledMons(team) > 0;
}

export function countFilledMons(team: TeamMon[] | undefined): number {
  return (team ?? []).filter((mon) => mon.species.trim()).length;
}
