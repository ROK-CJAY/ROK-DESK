import { startggQuery } from "@/lib/startgg";

export type ToUser = { id: string; name: string; tag: string };
export type ToEvent = { id: string; name: string; slug: string; game: string; entrants: number };
export type ToTournament = { id: string; name: string; slug: string; when: string; city: string; events: ToEvent[] };
export type ToStation = { id: string; number: string; name: string; streamId: string };
export type ToStream = { id: string; name: string; stationId: string };
export type ToOption = { id: string; name: string };
export type ToSet = {
  id: string;
  phase: string;
  round: string;
  group: string;
  roundNum: number;
  identifier: string;
  state: number;
  winnerId: string;
  stationId: string;
  station: string;
  streamId: string;
  stream: string;
  updatedAt: number | null;
  startedAt: number | null;
  prereqs: string[];
  p1: { id: string; name: string; characterId: string; character: string };
  p2: { id: string; name: string; characterId: string; character: string };
  score1: number;
  score2: number;
  stageId: string;
  stage: string;
};
export type ToBoard = {
  event: ToEvent;
  tournament: string;
  stations: ToStation[];
  streams: ToStream[];
  sets: ToSet[];
  characters: ToOption[];
  stages: ToOption[];
};

function when(value: number | null | undefined): string {
  if (!value) return "";
  const date = new Date(value < 10_000_000_000 ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

const ACCOUNT_QUERY = `
  query ToAccount($page: Int!) {
    currentUser {
      id
      name
      player { gamerTag }
      tournaments(query: { page: $page, perPage: 40, filter: { upcoming: true } }) {
        nodes {
          id
          name
          slug
          city
          startAt
          state
          events { id name slug numEntrants videogame { name } }
        }
      }
    }
  }
`;

type AccountData = {
  currentUser?: {
    id?: string | number | null;
    name?: string | null;
    player?: { gamerTag?: string | null } | null;
    tournaments?: {
      nodes?: {
        id?: string | number | null;
        name?: string | null;
        slug?: string | null;
        city?: string | null;
        startAt?: number | null;
        state?: number | null;
        events?: { id?: string | number | null; name?: string | null; slug?: string | null; numEntrants?: number | null; videogame?: { name?: string | null } | null }[] | null;
      }[] | null;
    } | null;
  } | null;
};

export async function loadToAccount(token: string): Promise<{ user: ToUser; tournaments: ToTournament[] }> {
  const tournaments: ToTournament[] = [];
  let user: ToUser | null = null;
  for (let page = 1; page <= 3; page += 1) {
    const data = await startggQuery<AccountData>(ACCOUNT_QUERY, { page }, "ToAccount", token);
    const current = data.currentUser;
    if (!current?.id) throw new Error("That token is not signed into a start.gg account.");
    user = {
      id: String(current.id),
      name: current.name?.trim() || "start.gg user",
      tag: current.player?.gamerTag?.trim() || current.name?.trim() || "start.gg user",
    };
    const nodes = current.tournaments?.nodes ?? [];
    for (const node of nodes) {
      if (!node?.id || node.state === 3) continue;
      tournaments.push({
        id: String(node.id),
        name: node.name?.trim() || "Tournament",
        slug: node.slug?.trim() || "",
        when: when(node.startAt),
        city: node.city?.trim() || "",
        events: (node.events ?? []).filter((event) => event?.id && event.slug).map((event) => ({
          id: String(event.id),
          name: event.name?.trim() || "Event",
          slug: event.slug?.trim() || "",
          game: event.videogame?.name?.trim() || "",
          entrants: event.numEntrants ?? 0,
        })),
      });
    }
    if (nodes.length < 40) break;
  }
  return { user: user!, tournaments };
}

const BOARD_QUERY = `
  query ToBoard($slug: String!) {
    event(slug: $slug) {
      id
      name
      slug
      numEntrants
      videogame { name }
      tournament {
        name
        stations(page: 1, perPage: 80) { nodes { id number prefix identifier stream { id streamName } } }
        streams { id streamName }
      }
      phases {
        id
        name
        phaseGroups(query: { page: 1, perPage: 20 }) { nodes { id displayIdentifier } }
      }
    }
  }
`;

const SETS_QUERY = `
  query ToSets($id: ID!, $page: Int!) {
    phaseGroup(id: $id) {
      sets(page: $page, perPage: 12, sortType: ROUND) {
        pageInfo { totalPages }
        nodes {
          id
          fullRoundText
          round
          identifier
          state
          winnerId
          updatedAt
          startedAt
          station { id number prefix }
          stream { id streamName }
          slots {
            prereqId
            prereqType
            standing { stats { score { value } } }
            entrant { id name }
          }
        }
      }
    }
  }
`;

type BoardEvent = {
  event?: {
    id?: string | number;
    name?: string | null;
    slug?: string | null;
    numEntrants?: number | null;
    videogame?: {
      name?: string | null;
      characters?: { id?: string | number | null; name?: string | null }[] | null;
      stages?: { id?: string | number | null; name?: string | null }[] | null;
    } | null;
    tournament?: {
      name?: string | null;
      stations?: { nodes?: { id?: string | number | null; number?: number | string | null; prefix?: string | null; identifier?: number | string | null; stream?: { id?: string | number | null; streamName?: string | null } | null }[] | null } | null;
      streams?: { id?: string | number | null; streamName?: string | null }[] | null;
    } | null;
    phases?: { id?: string; name?: string | null; phaseGroups?: { nodes?: { id?: string; displayIdentifier?: string | null }[] | null } | null }[] | null;
  } | null;
};

type SetPage = {
  phaseGroup?: {
    sets?: {
      pageInfo?: { totalPages?: number | null } | null;
      nodes?: {
        id?: string | number;
        fullRoundText?: string | null;
        round?: number | null;
        identifier?: string | null;
        state?: number | null;
        winnerId?: number | string | null;
        updatedAt?: number | null;
        startedAt?: number | null;
        station?: { id?: string | number | null; number?: number | string | null; prefix?: string | null } | null;
        stream?: { id?: string | number | null; streamName?: string | null } | null;
        games?: {
          orderNum?: number | null;
          stage?: { id?: string | number | null; name?: string | null } | null;
          selections?: { entrant?: { id?: string | number | null } | null; character?: { id?: string | number | null; name?: string | null } | null }[] | null;
        }[] | null;
        slots?: {
          prereqId?: string | null;
          prereqType?: string | null;
          standing?: { stats?: { score?: { value?: number | null } | null } | null } | null;
          entrant?: { id?: string | number | null; name?: string | null } | null;
        }[] | null;
      }[] | null;
    } | null;
  } | null;
};

export async function loadToBoard(token: string, slug: string): Promise<ToBoard> {
  const data = await startggQuery<BoardEvent>(BOARD_QUERY, { slug }, "ToBoard", token);
  const event = data.event;
  if (!event?.id) throw new Error("That event is not on this account.");
  const groups = (event.phases ?? []).flatMap((phase) =>
    (phase.phaseGroups?.nodes ?? []).map((group) => ({
      id: group.id,
      phase: phase.name?.trim() || "",
      group: group.displayIdentifier?.trim() || "",
    })),
  );
  const sets: ToSet[] = [];
  for (const group of groups) {
    if (!group.id) continue;
    let page = 1;
    let pages = 1;
    while (page <= pages && page <= 20) {
      const block = await startggQuery<SetPage>(SETS_QUERY, { id: group.id, page }, "ToSets", token);
      const pageSets = block.phaseGroup?.sets;
      pages = pageSets?.pageInfo?.totalPages ?? 1;
      for (const node of pageSets?.nodes ?? []) {
        if (!node.id) continue;
        const slots = node.slots ?? [];
        const game = [...(node.games ?? [])].sort((a, b) => (a.orderNum ?? 0) - (b.orderNum ?? 0)).at(-1);
        const pick = (entrantId: string) => game?.selections?.find((row) => String(row.entrant?.id ?? "") === entrantId);
        const side = (index: number) => {
          const id = slots[index]?.entrant?.id == null ? "" : String(slots[index]?.entrant?.id);
          const selected = pick(id);
          return {
            id,
            name: slots[index]?.entrant?.name?.trim() || "TBD",
            characterId: selected?.character?.id == null ? "" : String(selected.character.id),
            character: selected?.character?.name?.trim() || "",
          };
        };
        const p1 = side(0);
        const p2 = side(1);
        sets.push({
          id: String(node.id),
          phase: group.phase,
          round: node.fullRoundText?.trim() || "Set",
          group: group.group,
          roundNum: node.round ?? 0,
          identifier: node.identifier?.trim() || "",
          state: node.state ?? 1,
          winnerId: node.winnerId == null ? "" : String(node.winnerId),
          stationId: node.station?.id == null ? "" : String(node.station.id),
          station: stationLabel(node.station?.prefix, node.station?.number),
          streamId: node.stream?.id == null ? "" : String(node.stream.id),
          stream: node.stream?.streamName?.trim() || "",
          updatedAt: node.updatedAt ?? null,
          startedAt: node.startedAt ?? null,
          prereqs: (node.slots ?? [])
            .filter((slot) => slot.prereqId && (slot.prereqType ?? "").toLowerCase().includes("set"))
            .map((slot) => String(slot.prereqId)),
          p1,
          p2,
          score1: slots[0]?.standing?.stats?.score?.value ?? 0,
          score2: slots[1]?.standing?.stats?.score?.value ?? 0,
          stageId: game?.stage?.id == null ? "" : String(game.stage.id),
          stage: game?.stage?.name?.trim() || "",
        });
      }
      page += 1;
    }
  }
  let characters: ToOption[] = [];
  let stages: ToOption[] = [];
  try {
    const game = await startggQuery<{ event?: { videogame?: { characters?: { id?: string | number | null; name?: string | null }[] | null; stages?: { id?: string | number | null; name?: string | null }[] | null } | null } | null }>(GAME_QUERY, { slug }, "ToGame", token);
    characters = optionsOf(game.event?.videogame?.characters);
    stages = optionsOf(game.event?.videogame?.stages);
  } catch {
    characters = [];
    stages = [];
  }
  return {
    event: {
      id: String(event.id),
      name: event.name?.trim() || "Event",
      slug: event.slug?.trim() || slug,
      game: event.videogame?.name?.trim() || "",
      entrants: event.numEntrants ?? 0,
    },
    tournament: event.tournament?.name?.trim() || "",
    stations: (event.tournament?.stations?.nodes ?? [])
      .filter((station) => station.id != null)
      .map((station) => ({
        id: String(station.id),
        number: station.number == null ? "" : String(station.number),
        name: station.stream?.streamName?.trim() || stationLabel(station.prefix, station.number ?? station.identifier),
        streamId: station.stream?.id == null ? "" : String(station.stream.id),
      }))
      .sort((a, b) => Number(a.number) - Number(b.number) || a.name.localeCompare(b.name)),
    streams: (event.tournament?.streams ?? []).filter((stream) => stream.id != null).map((stream) => {
      const id = String(stream.id);
      const station = (event.tournament?.stations?.nodes ?? []).find((item) => item.stream?.id != null && String(item.stream.id) === id);
      return {
        id,
        name: stream.streamName?.trim() || "Stream",
        stationId: station?.id == null ? "" : String(station.id),
      };
    }),
    sets,
    characters,
    stages,
  };
}

const GAME_QUERY = `
  query ToGame($slug: String!) {
    event(slug: $slug) {
      videogame { characters { id name } stages { id name } }
    }
  }
`;

function stationLabel(prefix: string | null | undefined, number: number | string | null | undefined): string {
  const name = prefix?.trim() || "Station";
  if (number == null || number === "") return name;
  return `${name} ${number}`.replace(/\s+/g, " ").trim();
}

function optionsOf(rows: { id?: string | number | null; name?: string | null }[] | null | undefined): ToOption[] {
  return (rows ?? [])
    .filter((row) => row.id != null && row.name?.trim())
    .map((row) => ({ id: String(row.id), name: row.name!.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function mutate(token: string, query: string, variables: Record<string, unknown>, name: string) {
  await startggQuery(query, variables, name, token);
}

export async function callToSet(token: string, setId: string) {
  await mutate(token, `mutation CallSet($setId: ID!) { markSetCalled(setId: $setId) { id state } }`, { setId }, "CallSet");
}

export async function beginToSet(token: string, setId: string) {
  await mutate(token, `mutation BeginSet($setId: ID!) { markSetInProgress(setId: $setId) { id state } }`, { setId }, "BeginSet");
}

export async function stationToSet(token: string, setId: string, stationId: string) {
  await mutate(token, `mutation StationSet($setId: ID!, $stationId: ID!) { assignStation(setId: $setId, stationId: $stationId) { id } }`, { setId, stationId }, "StationSet");
}

export async function streamToSet(token: string, setId: string, streamId: string) {
  await mutate(token, `mutation StreamSet($setId: ID!, $streamId: ID!) { assignStream(setId: $setId, streamId: $streamId) { id } }`, { setId, streamId }, "StreamSet");
}

export async function reportToSet(
  token: string,
  setId: string,
  winnerId: string,
  score1: number,
  score2: number,
  detail?: { stageId?: string; entrant1?: string; character1?: string; entrant2?: string; character2?: string; dq?: boolean },
) {
  const selections = [
    detail?.entrant1 && detail.character1 ? { entrantId: detail.entrant1, characterId: detail.character1 } : null,
    detail?.entrant2 && detail.character2 ? { entrantId: detail.entrant2, characterId: detail.character2 } : null,
  ].filter(Boolean);
  const gameData = [{
    gameNum: 1,
    entrant1Score: score1,
    entrant2Score: score2,
    winnerId,
    ...(detail?.stageId ? { stageId: detail.stageId } : {}),
    ...(selections.length ? { selections } : {}),
  }];
  const isDQ = Boolean(detail?.dq);
  try {
    await mutate(
      token,
      `mutation ReportSet($setId: ID!, $winnerId: ID!, $isDQ: Boolean, $gameData: [BracketSetGameDataInput]) { reportBracketSet(setId: $setId, winnerId: $winnerId, isDQ: $isDQ, gameData: $gameData) { id state } }`,
      { setId, winnerId, isDQ, gameData },
      "ReportSet",
    );
  } catch {
    await mutate(
      token,
      `mutation ReportSet($setId: ID!, $winnerId: ID!, $isDQ: Boolean) { reportBracketSet(setId: $setId, winnerId: $winnerId, isDQ: $isDQ) { id state } }`,
      { setId, winnerId, isDQ },
      "ReportSet",
    );
  }
}
