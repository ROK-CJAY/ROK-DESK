import { create } from "zustand";
import { blankPlayer, blankRoster, blankRosterSlot, blankRuleset, blankSet, EMPTY_BRACKET_VIEW, EMPTY_FGC, type FgcBracketView, type FgcCaster, type FgcLibrary, type FgcPlayer, type FgcRoster, type FgcRosterSlot, type FgcRuleset, type FgcSet, type FgcState } from "@/lib/fgc-types";
import { normalizeSettings } from "@/lib/fgc-settings";
import { applyLane, applyStartggStreamNames, boardForStreamName, boardsForStreams, defaultBoard, emptyLane, isPermanentBoard, laneIdOf, mergeRemoteLanes, stampLanes, touchLane, withPermanentBoards } from "@/lib/fgc-lanes";
import { type StreamQueueRow } from "@/lib/startgg";
import { startggAuthBody } from "@/lib/startgg-link";

const KEY = "rok-fgc";
const LIBRARIES_KEY = "rok-fgc-libraries";
const PLAYERS_KEY = "rok-fgc-players";
const CASTERS_KEY = "rok-fgc-casters";

export type SavedPlayer = Omit<FgcPlayer, "id" | "seed">;
export type SavedCaster = Omit<FgcCaster, "id">;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readLibraries(): FgcLibrary[] {
  return readJson<FgcLibrary[]>(LIBRARIES_KEY, []);
}

function writeLibraries(libraries: FgcLibrary[]) {
  writeJson(LIBRARIES_KEY, libraries);
}

type FgcStore = {
  fgc: FgcState;
  players: SavedPlayer[];
  casters: SavedCaster[];
  ready: boolean;
  importing: boolean;
  error: string;
  hydrate: () => void;
  reload: () => void;
  patch: (partial: Partial<FgcState>) => void;
  importEvent: () => Promise<void>;
  pullStreamQueue: () => Promise<void>;
  selectSet: (id: string | null) => void;
  patchSet: (id: string, partial: Partial<FgcSet>) => void;
  patchPlayer: (setId: string, side: "p1" | "p2" | "p1b" | "p2b", partial: Partial<FgcPlayer>) => void;
  newSet: () => void;
  loadStreamSet: () => Promise<void>;
  patchCaster: (id: string, partial: Partial<FgcCaster>) => void;
  saveRuleset: (ruleset: FgcRuleset) => void;
  deleteRuleset: (id: string) => void;
  selectRuleset: (id: string | null) => void;
  setLibrary: (library: FgcLibrary) => void;
  savePlayer: (player: FgcPlayer) => void;
  saveCaster: (caster: FgcCaster) => void;
  moveCaster: (index: number, direction: -1 | 1) => void;
  clearCaster: (id: string) => void;
  setCasterCount: (count: number) => void;
  swapTeams: (id: string) => void;
  resetScore: (id: string) => void;
  clear: () => void;
  clearImport: () => void;
  setRoster: (partial: Partial<FgcRoster>) => void;
  setRosterSlot: (index: number, partial: Partial<FgcRosterSlot>) => void;
  setRosterPlayer: (index: number, playerIndex: number, partial: Partial<FgcPlayer>) => void;
  loadStandings: () => Promise<void>;
  setBracketView: (partial: Partial<FgcBracketView>) => void;
  selectLane: (id: string) => void;
  selectBoard: (id: string) => void;
  selectStream: (id: string) => void;
  addBoard: (name?: string) => void;
  addScoreboard: () => void;
  renameBoard: (id: string, name: string) => void;
  removeBoard: (id: string) => void;
  assignStream: (input: { eventId: string; eventName: string; game: string; slug: string; streamName: string; set: FgcSet }) => void;
  pullLanes: () => Promise<void>;
};

function rememberPlayers(existing: SavedPlayer[], incoming: (FgcPlayer | null)[], keep: boolean): SavedPlayer[] {
  const next = [...existing];
  for (const player of incoming) {
    if (!player?.tag && !player?.profileId) continue;
    const index = next.findIndex((item) =>
      player.profileId ? item.profileId === player.profileId : item.tag.toLowerCase() === player.tag.trim().toLowerCase(),
    );
    if (index < 0) {
      next.unshift({
        profileId: player.profileId,
        tag: player.tag.trim(),
        prefix: player.prefix,
        realName: player.realName,
        country: player.country,
        flag: player.flag,
        region: player.region,
        twitter: player.twitter,
        pronouns: player.pronouns,
        avatar: player.avatar,
        character: player.character,
        skin: player.skin,
        character2: player.character2,
        skin2: player.skin2,
      });
      continue;
    }
    if (index >= 0 && player.avatar) next[index] = { ...next[index], avatar: player.avatar };
    if (keep || (!player.character && !player.character2)) continue;
    const current = next[index];
    next[index] = {
      ...current,
      character: player.character || current.character,
      skin: player.character ? player.skin : current.skin,
      character2: player.character2 || current.character2,
      skin2: player.character2 ? player.skin2 : current.skin2,
    };
  }
  return next;
}

function applySaved(player: FgcPlayer | null, saved: SavedPlayer[], keepCharacters: boolean): FgcPlayer | null {
  if (!player) return player;
  const match =
    (player.profileId && saved.find((item) => item.profileId === player.profileId)) ||
    saved.find((item) => item.tag.toLowerCase() === player.tag.trim().toLowerCase());
  if (!match) return player;
  const character = keepCharacters ? player.character : player.character || match.character;
  const skin = keepCharacters
    ? player.skin
    : player.character
      ? (player.character.toLowerCase() === (match.character || "").toLowerCase() ? match.skin : player.skin)
      : match.skin;
  const character2 = keepCharacters ? player.character2 : player.character2 || match.character2;
  const skin2 = keepCharacters
    ? player.skin2
    : player.character2
      ? (player.character2.toLowerCase() === (match.character2 || "").toLowerCase() ? match.skin2 : player.skin2)
      : match.skin2;
  return { ...player, ...match, id: player.id, seed: player.seed, profileId: player.profileId || match.profileId, avatar: player.avatar || match.avatar || "", character, skin, character2, skin2 };
}

function playerOf(raw: Partial<FgcPlayer> & { stocks?: number } | null | undefined): FgcPlayer | null {
  if (!raw) return null;
  return { ...blankPlayer(), ...raw, id: raw.id || blankPlayer().id, profileId: raw.profileId || "", skin: raw.skin ?? raw.stocks ?? 0 };
}

function setOf(raw: Partial<FgcSet>): FgcSet {
  return {
    ...blankSet(),
    ...raw,
    id: raw.id || blankSet().id,
    p1: playerOf(raw.p1),
    p2: playerOf(raw.p2),
    p1b: playerOf(raw.p1b) ?? blankPlayer(),
    p2b: playerOf(raw.p2b) ?? blankPlayer(),
    playersPerTeam: raw.playersPerTeam || 1,
    charactersPerPlayer: raw.charactersPerPlayer || 1,
  };
}

function read(): FgcState {
  if (typeof window === "undefined") return EMPTY_FGC;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_FGC;
    const parsed = JSON.parse(raw) as Partial<FgcState>;
    const event = parsed.event
      ? Object.assign({ venue: "", shortLink: "", icon: "", ruleset: "", entrants: 0, startAt: "", endAt: "" }, parsed.event)
      : null;
    return {
      ...EMPTY_FGC,
      ...parsed,
      event,
      sets: (parsed.sets ?? []).map(setOf),
      casters: (parsed.casters?.length ? parsed.casters : EMPTY_FGC.casters).map((caster) => ({
        id: caster.id,
        profileId: caster.profileId || "",
        prefix: caster.prefix || "",
        name: caster.name || "",
        realName: caster.realName || "",
        twitter: caster.twitter || "",
        pronouns: caster.pronouns || "",
        country: caster.country || "",
        flag: caster.flag || "",
        region: caster.region || "",
      })),
      rulesets: parsed.rulesets ?? [],
      libraries: (readLibraries().length ? readLibraries() : parsed.libraries ?? []).map((library) => ({
        ...library,
        stages: (library.stages ?? []).map((stage) =>
          typeof stage === "string" ? { name: stage, code: stage } : stage,
        ),
      })),
      roster: parsed.roster?.slots?.length ? { ...blankRoster(), ...parsed.roster, slots: parsed.roster.slots.map((slot) => ({ ...blankRosterSlot(), ...slot, players: (slot.players?.length ? slot.players : [blankPlayer()]).map((player) => playerOf(player) ?? blankPlayer()) })) } : blankRoster(),
      bracketView: { ...EMPTY_BRACKET_VIEW, ...parsed.bracketView },
      settings: normalizeSettings(parsed.settings),
      laneId: parsed.laneId || laneIdOf(event),
      lanes: parsed.lanes || {},
      boards: withPermanentBoards(parsed.boards?.length ? parsed.boards : [defaultBoard(parsed.streamSetId ?? null)], parsed.streamSetId ?? null),
      activeBoardId: parsed.activeBoardId || "main",
    };
  } catch {
    return EMPTY_FGC;
  }
}

let publishTimer = 0;

function withBoardSet(fgc: FgcState, boardId: string, activate = true): FgcState {
  const boards = withPermanentBoards(fgc.boards?.length ? fgc.boards.map((board) => ({ ...board })) : [defaultBoard(null)], fgc.streamSetId);
  const board = boards.find((item) => item.id === boardId) ?? boards[0];
  const existing = board.setId ? fgc.sets.find((set) => set.id === board.setId) : null;
  if (existing) {
    return activate ? { ...fgc, boards, activeBoardId: board.id, streamSetId: existing.id } : { ...fgc, boards };
  }
  const created = blankSet();
  return {
    ...fgc,
    sets: [created, ...fgc.sets],
    boards: boards.map((item) => item.id === board.id ? { ...item, setId: created.id } : item),
    activeBoardId: activate ? board.id : fgc.activeBoardId,
    streamSetId: activate ? created.id : fgc.streamSetId,
  };
}

function ensureStreams(fgc: FgcState): FgcState {
  let next = { ...fgc, boards: withPermanentBoards(fgc.boards || [], fgc.streamSetId) };
  for (const board of [...next.boards]) next = withBoardSet(next, board.id, false);
  const active = next.boards.find((board) => board.id === (fgc.activeBoardId || "main")) ?? next.boards[0];
  return { ...next, activeBoardId: active.id, streamSetId: active.setId };
}

function write(fgc: FgcState, bump = true) {
  if (typeof window === "undefined") return;
  const stamped = bump ? touchLane(fgc) : stampLanes(fgc);
  Object.assign(fgc, stamped);
  window.localStorage.setItem(KEY, JSON.stringify(fgc));
  writeLibraries(fgc.libraries);
  window.clearTimeout(publishTimer);
  publishTimer = window.setTimeout(() => {
    void fetch("/api/fgc/program-state", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fgc),
    });
  }, 250);
}

export const useFgcStore = create<FgcStore>((set, get) => ({
  fgc: EMPTY_FGC,
  players: [],
  casters: [],
  ready: false,
  importing: false,
  error: "",
  hydrate: () => {
    if (get().ready) return;
    const loaded = read();
    const fgc = ensureStreams(loaded);
    write(fgc);
    set({ fgc, players: readJson<SavedPlayer[]>(PLAYERS_KEY, []), casters: readJson<SavedCaster[]>(CASTERS_KEY, []), ready: true });
  },
  reload: () => set({ fgc: read(), ready: true }),
  patch: (partial) => {
    const fgc = { ...get().fgc, ...partial };
    write(fgc);
    set({ fgc });
  },
  importEvent: async () => {
    const { url } = get().fgc;
    set({ importing: true, error: "" });
    try {
      const res = await fetch("/api/startgg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, ...startggAuthBody() }),
      });
      const text = await res.text();
      let body: { event?: FgcState["event"]; sets?: FgcState["sets"]; streams?: string[]; events?: { event: FgcState["event"]; sets: FgcState["sets"]; streams?: string[] }[]; error?: string };
      try {
        body = JSON.parse(text) as typeof body;
      } catch {
        throw new Error("Import failed before start.gg answered. Refresh and try the event link again.");
      }
      if (!res.ok) throw new Error(body.error || "Import failed");
      const packs = (body.events?.length ? body.events : body.event && body.sets ? [{ event: body.event, sets: body.sets, streams: body.streams }] : []).filter((pack) => pack.event && pack.sets);
      if (!packs.length) throw new Error(body.error || "Import failed");
      const settings = get().fgc.settings;
      const libraryFor = (game: string) => get().fgc.libraries.find((item) => item.game === game) ?? get().fgc.libraries[0];
      const align = (player: FgcPlayer | null, game: string) => {
        const library = libraryFor(game);
        if (!player?.character || !library) return player;
        const found = library.characters.find((item) => item.name.toLowerCase() === player.character.toLowerCase());
        return found ? { ...player, character: found.name } : player;
      };
      let fgc = stampLanes(get().fgc);
      const playersIn: (FgcPlayer | null)[] = [];
      for (const pack of packs) {
        const event = pack.event!;
        const id = laneIdOf(event);
        const previous = fgc.lanes[id];
        const priorSets = previous?.sets ?? (fgc.laneId === id ? fgc.sets : []);
        const sets = pack.sets!.map((set) => {
          const previousSet = priorSets.find((item) => item.id === set.id);
          const next = {
            ...set,
            p1: applySaved(align(set.p1, event.game), get().players, settings.keepCharacters),
            p2: applySaved(align(set.p2, event.game), get().players, settings.keepCharacters),
            p1b: applySaved(align(set.p1b, event.game), get().players, settings.keepCharacters),
            p2b: applySaved(align(set.p2b, event.game), get().players, settings.keepCharacters),
          };
          return settings.autoScore || !previousSet ? next : { ...next, score1: previousSet.score1, score2: previousSet.score2 };
        });
        playersIn.push(...sets.flatMap((set) => [set.p1, set.p2, set.p1b, set.p2b]));
        const live = sets.find((set) => set.state === "live");
        const named = applyStartggStreamNames(previous?.boards ?? [], pack.streams ?? []);
        const boards = boardsForStreams(named, [...new Set(sets.map((set) => set.streamName).filter(Boolean))], previous?.streamSetId ?? null);
        const activeBoardId = boards.some((board) => board.id === previous?.activeBoardId) ? previous?.activeBoardId || "main" : boards[0].id;
        let streamSetId = boards.find((board) => board.id === activeBoardId)?.setId ?? null;
        if (settings.autoSet && live && (activeBoardId === "main" || !streamSetId)) {
          streamSetId = live.id;
          const index = boards.findIndex((board) => board.id === activeBoardId);
          if (index >= 0) boards[index] = { ...boards[index], setId: live.id };
        }
        const lane = {
          ...(previous ?? emptyLane(id, event, fgc.casters)),
          id,
          url: event.url || fgc.url,
          event,
          sets,
          importedAt: new Date().toISOString(),
          boards,
          activeBoardId,
          streamSetId,
          updatedAt: Date.now(),
        };
        fgc = { ...fgc, lanes: { ...fgc.lanes, [id]: lane } };
      }
      const preferred = fgc.lanes[fgc.laneId]?.event ? fgc.laneId : laneIdOf(packs[0].event);
      fgc = ensureStreams(applyLane(fgc, fgc.lanes[preferred]));
      const players = rememberPlayers(get().players, playersIn, settings.keepPlayerDb);
      writeJson(PLAYERS_KEY, players);
      write(fgc);
      set({ fgc, players, importing: false });
    } catch (err) {
      set({ importing: false, error: err instanceof Error ? err.message : "Import failed" });
    }
  },
  pullStreamQueue: async () => {
    const url = get().fgc.url.trim();
    if (!url) throw new Error("Import the event first");
    const res = await fetch("/api/startgg", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, action: "queue", ...startggAuthBody() }),
    });
    const text = await res.text();
    let body: { queue?: StreamQueueRow[]; error?: string };
    try {
      body = JSON.parse(text) as typeof body;
    } catch {
      throw new Error("start.gg did not return a stream queue");
    }
    if (!res.ok || !body.queue) throw new Error(body.error || "Could not read the stream queue");
    const byId = new Map(body.queue.map((row) => [row.id, row]));
    const known = new Set(get().fgc.sets.map((set) => set.id));
    const sets = get().fgc.sets.map((set) => {
      const hit = byId.get(set.id);
      if (!hit) return { ...set, queued: false, queueOrder: 0 };
      return { ...set, queued: true, queueOrder: hit.order, streamName: hit.streamName || set.streamName };
    });
    for (const row of body.queue) {
      if (known.has(row.id)) continue;
      sets.push({
        ...blankSet(),
        id: row.id,
        phase: row.phase,
        group: row.group,
        round: row.round,
        identifier: row.identifier,
        streamName: row.streamName,
        queued: true,
        queueOrder: row.order,
        state: row.state,
        p1: row.p1 ? { ...blankPlayer(), id: `${row.id}-p1`, tag: row.p1 } : null,
        p2: row.p2 ? { ...blankPlayer(), id: `${row.id}-p2`, tag: row.p2 } : null,
      });
    }
    const fgc = { ...get().fgc, sets };
    write(fgc);
    set({ fgc });
  },
  selectSet: (id) => {
    const players = get().players;
    const keepCharacters = get().fgc.settings.keepCharacters;
    const boards = (get().fgc.boards?.length ? get().fgc.boards : [defaultBoard(id)]).map((board) => board.id === (get().fgc.activeBoardId || "main") ? { ...board, setId: id } : board);
    const fgc = {
      ...get().fgc,
      streamSetId: id,
      boards,
      sets: get().fgc.sets.map((set) => {
        if (set.id !== id) return set;
        return {
          ...set,
          p1: applySaved(set.p1, players, keepCharacters),
          p2: applySaved(set.p2, players, keepCharacters),
          p1b: applySaved(set.p1b, players, keepCharacters),
          p2b: applySaved(set.p2b, players, keepCharacters),
        };
      }),
    };
    write(fgc);
    set({ fgc });
  },
  patchSet: (id, partial) => {
    const fgc = {
      ...get().fgc,
      sets: get().fgc.sets.map((set) => (set.id === id ? { ...set, ...partial } : set)),
    };
    write(fgc);
    set({ fgc });
  },
  patchPlayer: (setId, side, partial) => {
    let updated: FgcPlayer | null = null;
    const fgc = {
      ...get().fgc,
      sets: get().fgc.sets.map((set) => {
        if (set.id !== setId) return set;
        const current = set[side] ?? blankPlayer();
        updated = { ...current, ...partial };
        return { ...set, [side]: updated };
      }),
    };
    const players =
      updated && ("character" in partial || "skin" in partial || "character2" in partial || "skin2" in partial)
        ? rememberPlayers(get().players, [updated], get().fgc.settings.keepPlayerDb)
        : get().players;
    if (players !== get().players) writeJson(PLAYERS_KEY, players);
    write(fgc);
    set({ fgc, players });
  },
  newSet: () => {
    const created = blankSet();
    const boards = (get().fgc.boards?.length ? get().fgc.boards : [defaultBoard(created.id)]).map((board) => board.id === (get().fgc.activeBoardId || "main") ? { ...board, setId: created.id } : board);
    const fgc = { ...get().fgc, sets: [created, ...get().fgc.sets], streamSetId: created.id, boards };
    write(fgc);
    set({ fgc });
  },
  loadStreamSet: async () => {
    const { url, sets } = get().fgc;
    set({ error: "" });
    try {
      const res = await fetch("/api/startgg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, action: "stream", ...startggAuthBody() }),
      });
      const body = (await res.json()) as { setId?: string | null; error?: string };
      if (!res.ok) throw new Error(body.error || "Could not read the stream set");
      if (!body.setId) throw new Error("No set is marked on stream");
      const match = sets.find((set) => set.id === body.setId);
      if (!match) throw new Error("Stream set is not in the imported list. Import again.");
      const boards = (get().fgc.boards?.length ? get().fgc.boards : [defaultBoard(match.id)]).map((board) => board.id === (get().fgc.activeBoardId || "main") ? { ...board, setId: match.id } : board);
      const fgc = { ...get().fgc, streamSetId: match.id, boards };
      write(fgc);
      set({ fgc });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Could not load the stream set" });
    }
  },
  patchCaster: (id, partial) => {
    const fgc = {
      ...get().fgc,
      casters: get().fgc.casters.map((caster) => (caster.id === id ? { ...caster, ...partial } : caster)),
    };
    write(fgc);
    set({ fgc });
  },
  saveRuleset: (ruleset) => {
    const existing = get().fgc.rulesets.some((item) => item.id === ruleset.id);
    const rulesets = existing
      ? get().fgc.rulesets.map((item) => (item.id === ruleset.id ? ruleset : item))
      : [...get().fgc.rulesets, ruleset];
    const fgc = { ...get().fgc, rulesets, activeRulesetId: ruleset.id };
    write(fgc);
    set({ fgc });
  },
  deleteRuleset: (id) => {
    const fgc = {
      ...get().fgc,
      rulesets: get().fgc.rulesets.filter((item) => item.id !== id),
      activeRulesetId: get().fgc.activeRulesetId === id ? null : get().fgc.activeRulesetId,
    };
    write(fgc);
    set({ fgc });
  },
  selectRuleset: (id) => {
    const fgc = { ...get().fgc, activeRulesetId: id };
    write(fgc);
    set({ fgc });
  },
  setLibrary: (library) => {
    const libraries = [library, ...get().fgc.libraries.filter((item) => item.code !== library.code)];
    const fgc = { ...get().fgc, libraries };
    write(fgc);
    set({ fgc });
  },
  savePlayer: (player) => {
    const tag = player.tag.trim();
    if (!tag && !player.profileId) return;
    const saved: SavedPlayer = {
      profileId: player.profileId,
      tag,
      prefix: player.prefix,
      realName: player.realName,
      country: player.country,
      flag: player.flag,
      region: player.region,
      twitter: player.twitter,
      pronouns: player.pronouns,
      avatar: player.avatar,
      character: player.character,
      skin: player.skin,
      character2: player.character2,
      skin2: player.skin2,
    };
    const players = [
      saved,
      ...get().players.filter((item) =>
        player.profileId ? item.profileId !== player.profileId : item.tag.toLowerCase() !== tag.toLowerCase(),
      ),
    ];
    writeJson(PLAYERS_KEY, players);
    set({ players });
  },
  saveCaster: (caster) => {
    const name = caster.name.trim();
    if (!name) return;
    const saved: SavedCaster = {
      profileId: caster.profileId,
      prefix: caster.prefix,
      name,
      realName: caster.realName,
      twitter: caster.twitter,
      pronouns: caster.pronouns,
      country: caster.country,
      flag: caster.flag,
      region: caster.region,
    };
    const casters = [saved, ...get().casters.filter((item) => item.name.toLowerCase() !== name.toLowerCase())];
    writeJson(CASTERS_KEY, casters);
    set({ casters });
  },
  moveCaster: (index, direction) => {
    const casters = [...get().fgc.casters];
    const next = index + direction;
    if (next < 0 || next >= casters.length) return;
    [casters[index], casters[next]] = [casters[next], casters[index]];
    const fgc = { ...get().fgc, casters };
    write(fgc);
    set({ fgc });
  },
  clearCaster: (id) => {
    const fgc = {
      ...get().fgc,
      casters: get().fgc.casters.map((caster) => (caster.id === id ? { ...caster, profileId: "", prefix: "", name: "", realName: "", twitter: "", pronouns: "", country: "", flag: "", region: "" } : caster)),
    };
    write(fgc);
    set({ fgc });
  },
  setCasterCount: (count) => {
    const total = Math.min(4, Math.max(1, count));
    const current = get().fgc.casters;
    const casters = Array.from({ length: total }, (_, index) => current[index] ?? {
      id: `c${index + 1}`,
      profileId: "",
      prefix: "",
      name: "",
      realName: "",
      twitter: "",
      pronouns: "",
      country: "",
      flag: "",
      region: "",
    });
    const fgc = { ...get().fgc, casters };
    write(fgc);
    set({ fgc });
  },
  swapTeams: (id) => {
    const fgc = {
      ...get().fgc,
      sets: get().fgc.sets.map((set) =>
        set.id === id
          ? { ...set, p1: set.p2, p2: set.p1, p1b: set.p2b, p2b: set.p1b, score1: set.score2, score2: set.score1, losers1: set.losers2, losers2: set.losers1 }
          : set,
      ),
    };
    write(fgc);
    set({ fgc });
  },
  resetScore: (id) => {
    const fgc = {
      ...get().fgc,
      sets: get().fgc.sets.map((set) => (set.id === id ? { ...set, score1: 0, score2: 0 } : set)),
    };
    write(fgc);
    set({ fgc });
  },
  clear: () => {
    const fgc = EMPTY_FGC;
    write(fgc);
    set({ fgc, error: "" });
  },
  clearImport: () => {
    const created = blankSet();
    const fgc = { ...get().fgc, url: "", event: null, sets: [created], streamSetId: created.id, importedAt: null };
    write(fgc);
    set({ fgc, error: "" });
  },
  setRoster: (partial) => {
    const current = get().fgc.roster ?? blankRoster();
    const count = Math.max(1, Math.min(64, partial.count ?? current.count));
    let slots = Array.from({ length: count }, (_, index) => current.slots[index] ?? blankRosterSlot());
    if ((partial.playersPerSlot ?? current.playersPerSlot) > 1) {
      slots = slots.map((slot) => (slot.players[1] ? slot : { ...slot, players: [...slot.players, blankPlayer()] }));
    }
    const fgc = { ...get().fgc, roster: { ...current, ...partial, count, slots } };
    write(fgc);
    set({ fgc });
  },
  setRosterSlot: (index, partial) => {
    const roster = get().fgc.roster ?? blankRoster();
    const slots = roster.slots.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...partial } : slot));
    const fgc = { ...get().fgc, roster: { ...roster, slots } };
    write(fgc);
    set({ fgc });
  },
  setRosterPlayer: (index, playerIndex, partial) => {
    const roster = get().fgc.roster ?? blankRoster();
    const slots = roster.slots.map((slot, slotIndex) => {
      if (slotIndex !== index) return slot;
      const players = [...slot.players];
      players[playerIndex] = { ...(players[playerIndex] ?? blankPlayer()), ...partial };
      return { ...slot, players };
    });
    const fgc = { ...get().fgc, roster: { ...roster, slots } };
    write(fgc);
    set({ fgc });
  },
  loadStandings: async () => {
    const eventId = get().fgc.event?.id;
    if (!eventId) {
      set({ error: "Import the event first" });
      return;
    }
    set({ importing: true, error: "" });
    try {
      const res = await fetch("/api/startgg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "standings", eventId, count: get().fgc.roster?.count || 8, ...startggAuthBody() }),
      });
      const body = (await res.json()) as { standings?: { placement: number; id: string; profileId: string; tag: string; prefix: string; realName: string; country: string; region: string; twitter: string; pronouns: string; seed: number | null }[]; error?: string };
      if (!res.ok || !body.standings) throw new Error(body.error || "Standings failed");
      const count = get().fgc.roster?.count || 8;
      const slots = Array.from({ length: count }, (_, index) => {
        const row = body.standings?.[index];
        if (!row?.tag) return get().fgc.roster.slots[index] ?? blankRosterSlot();
        const player = applySaved({ ...blankPlayer(), ...row, flag: "", character: "", skin: 0, character2: "", skin2: 0 }, get().players, get().fgc.settings.keepCharacters) ?? blankPlayer();
        return { teamName: "", score: row.placement || index + 1, players: [player] };
      });
      const players = rememberPlayers(get().players, slots.flatMap((slot) => slot.players), get().fgc.settings.keepPlayerDb);
      writeJson(PLAYERS_KEY, players);
      const fgc = { ...get().fgc, roster: { ...(get().fgc.roster ?? blankRoster()), slots } };
      write(fgc);
      set({ fgc, players, importing: false });
    } catch (err) {
      set({ importing: false, error: err instanceof Error ? err.message : "Standings failed" });
    }
  },
  setBracketView: (partial) => {
    const fgc = { ...get().fgc, bracketView: { ...EMPTY_BRACKET_VIEW, ...get().fgc.bracketView, ...partial } };
    write(fgc);
    set({ fgc });
  },
  selectLane: (id) => {
    const current = stampLanes(get().fgc);
    const lane = current.lanes[id];
    if (!lane) return;
    const fgc = ensureStreams(applyLane(current, lane));
    write(fgc, false);
    set({ fgc });
  },
  selectBoard: (id) => {
    const board = get().fgc.boards.find((item) => item.id === id);
    if (!board) return;
    const fgc = withBoardSet(get().fgc, id);
    write(fgc);
    set({ fgc });
  },
  selectStream: (id) => {
    const boards = withPermanentBoards(get().fgc.boards || [], get().fgc.streamSetId).filter((board) => (board.streamId || board.id) === id);
    const current = boards.find((board) => board.id === get().fgc.activeBoardId) ?? boards[0];
    if (!current) return;
    const fgc = withBoardSet({ ...get().fgc, boards: withPermanentBoards(get().fgc.boards || [], get().fgc.streamSetId) }, current.id);
    write(fgc);
    set({ fgc });
  },
  addBoard: (name) => {
    const boards = withPermanentBoards(get().fgc.boards?.length ? [...get().fgc.boards] : [], get().fgc.streamSetId);
    const id = `stream-${Date.now()}`;
    const label = name?.trim() || `Stream ${new Set(boards.map((board) => board.streamId || board.id)).size + 1}`;
    const created = blankSet();
    const fgc = {
      ...get().fgc,
      sets: [created, ...get().fgc.sets],
      boards: [...boards, { id, name: "Scoreboard 1", setId: created.id, streamId: id, streamName: label }],
      activeBoardId: id,
      streamSetId: created.id,
    };
    write(fgc);
    set({ fgc });
  },
  addScoreboard: () => {
    const boards = withPermanentBoards(get().fgc.boards?.length ? [...get().fgc.boards] : [], get().fgc.streamSetId);
    const active = boards.find((board) => board.id === get().fgc.activeBoardId) ?? boards[0];
    const streamId = active ? (active.streamId || active.id) : "main";
    const count = boards.filter((board) => (board.streamId || board.id) === streamId).length + 1;
    const id = `board-${Date.now()}`;
    const created = blankSet();
    const streamName = boards.find((board) => (board.streamId || board.id) === streamId)?.streamName;
    const fgc = {
      ...get().fgc,
      sets: [created, ...get().fgc.sets],
      boards: [...boards, { id, name: `Scoreboard ${count}`, setId: created.id, streamId, streamName }],
      activeBoardId: id,
      streamSetId: created.id,
    };
    write(fgc);
    set({ fgc });
  },
  renameBoard: (id, name) => {
    const label = name.trim();
    if (!label) return;
    const fgc = { ...get().fgc, boards: get().fgc.boards.map((board) => board.id === id ? { ...board, name: label } : board) };
    write(fgc);
    set({ fgc });
  },
  removeBoard: (id) => {
    if (isPermanentBoard(id)) return;
    const boards = withPermanentBoards(get().fgc.boards.filter((board) => board.id !== id), get().fgc.streamSetId);
    if (boards.length === get().fgc.boards.length) return;
    const active = boards.some((board) => board.id === get().fgc.activeBoardId) ? get().fgc.activeBoardId : boards[0].id;
    const fgc = { ...get().fgc, boards, activeBoardId: active, streamSetId: boards.find((board) => board.id === active)?.setId ?? null };
    write(fgc);
    set({ fgc });
  },
  assignStream: ({ eventId, eventName, game, slug, streamName, set: match }) => {
    const current = stampLanes(get().fgc);
    const id = String(eventId || slug || "local");
    const existing = current.lanes[id] ?? emptyLane(id, {
      id,
      name: eventName,
      slug,
      tournamentName: current.event?.tournamentName || eventName,
      game,
      url: slug ? `https://www.start.gg/${slug}` : "",
      venue: "",
      shortLink: "",
      icon: "",
      ruleset: "",
      entrants: 0,
      startAt: "",
      endAt: "",
    }, current.casters);
    const sets = existing.sets.some((item) => item.id === match.id)
      ? existing.sets.map((item) => item.id === match.id ? { ...item, ...match, p1: match.p1 ?? item.p1, p2: match.p2 ?? item.p2 } : item)
      : [...existing.sets, match];
    const boards = boardsForStreams(existing.boards, [streamName], existing.streamSetId);
    const board = boardForStreamName(boards, streamName) ?? boards[0];
    if (!board) return;
    const nextBoards = boards.map((item) => item.id === board.id ? { ...item, setId: match.id } : item);
    const lane = { ...existing, sets, boards: nextBoards, streamSetId: nextBoards.find((item) => item.id === existing.activeBoardId)?.setId ?? match.id, updatedAt: Date.now() };
    const lanes = { ...current.lanes, [id]: lane };
    const fgc = current.laneId === id || !current.event ? applyLane({ ...current, lanes }, lane) : { ...current, lanes };
    write(fgc);
    set({ fgc });
  },
  pullLanes: async () => {
    try {
      const res = await fetch("/api/fgc/program-state?raw=1");
      if (!res.ok) return;
      const remote = (await res.json()) as FgcState;
      const fgc = mergeRemoteLanes(get().fgc, remote);
      if (JSON.stringify(fgc.lanes) === JSON.stringify(get().fgc.lanes)) return;
      write(fgc, false);
      set({ fgc });
    } catch {
      /* the desk still works from this browser */
    }
  },
}));
