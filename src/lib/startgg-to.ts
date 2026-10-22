import { startggQuery } from "@/lib/startgg";

export type ToUser = { id: string; name: string; tag: string };
export type ToEvent = { id: string; name: string; slug: string; game: string; entrants: number };
export type ToTournament = { id: string; name: string; slug: string; when: string; city: string; events: ToEvent[] };
export type ToStation = { id: string; number: string };
export type ToStream = { id: string; name: string };
export type ToSet = {
  id: string;
  phase: string;
  round: string;
  identifier: string;
  state: number;
  stationId: string;
  station: string;
  streamId: string;
  stream: string;
  p1: { id: string; name: string };
  p2: { id: string; name: string };
  score1: number;
  score2: number;
};
export type ToBoard = { event: ToEvent; tournament: string; stations: ToStation[]; streams: ToStream[]; sets: ToSet[] };

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
        stations(page: 1, perPage: 80) { nodes { id number } }
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
      sets(page: $page, perPage: 30, sortType: ROUND) {
        pageInfo { totalPages }
        nodes {
          id
          fullRoundText
          identifier
          state
          winnerId
          station { id number }
          stream { id streamName }
          slots {
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
    videogame?: { name?: string | null } | null;
    tournament?: {
      name?: string | null;
      stations?: { nodes?: { id?: string | number | null; number?: number | string | null }[] | null } | null;
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
        identifier?: string | null;
        state?: number | null;
        station?: { id?: string | number | null; number?: number | string | null } | null;
        stream?: { id?: string | number | null; streamName?: string | null } | null;
        slots?: { standing?: { stats?: { score?: { value?: number | null } | null } | null } | null; entrant?: { id?: string | number | null; name?: string | null } | null }[] | null;
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
    while (page <= pages && page <= 8) {
      const block = await startggQuery<SetPage>(SETS_QUERY, { id: group.id, page }, "ToSets", token);
      const pageSets = block.phaseGroup?.sets;
      pages = pageSets?.pageInfo?.totalPages ?? 1;
      for (const node of pageSets?.nodes ?? []) {
        if (!node.id) continue;
        const slots = node.slots ?? [];
        const side = (index: number) => ({
          id: slots[index]?.entrant?.id == null ? "" : String(slots[index]?.entrant?.id),
          name: slots[index]?.entrant?.name?.trim() || "TBD",
        });
        sets.push({
          id: String(node.id),
          phase: group.phase,
          round: [node.fullRoundText?.trim(), group.group].filter(Boolean).join(" · ") || "Set",
          identifier: node.identifier?.trim() || "",
          state: node.state ?? 1,
          stationId: node.station?.id == null ? "" : String(node.station.id),
          station: node.station?.number == null ? "" : String(node.station.number),
          streamId: node.stream?.id == null ? "" : String(node.stream.id),
          stream: node.stream?.streamName?.trim() || "",
          p1: side(0),
          p2: side(1),
          score1: slots[0]?.standing?.stats?.score?.value ?? 0,
          score2: slots[1]?.standing?.stats?.score?.value ?? 0,
        });
      }
      page += 1;
    }
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
    stations: (event.tournament?.stations?.nodes ?? []).filter((station) => station.id != null).map((station) => ({
      id: String(station.id),
      number: station.number == null ? "" : String(station.number),
    })),
    streams: (event.tournament?.streams ?? []).filter((stream) => stream.id != null).map((stream) => ({
      id: String(stream.id),
      name: stream.streamName?.trim() || "Stream",
    })),
    sets,
  };
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

export async function reportToSet(token: string, setId: string, winnerId: string, score1: number, score2: number) {
  const gameData = [{ gameNum: 1, entrant1Score: score1, entrant2Score: score2, winnerId }];
  try {
    await mutate(
      token,
      `mutation ReportSet($setId: ID!, $winnerId: ID!, $gameData: [BracketSetGameDataInput]) { reportBracketSet(setId: $setId, winnerId: $winnerId, gameData: $gameData) { id state } }`,
      { setId, winnerId, gameData },
      "ReportSet",
    );
  } catch {
    await mutate(
      token,
      `mutation ReportSet($setId: ID!, $winnerId: ID!) { reportBracketSet(setId: $setId, winnerId: $winnerId) { id state } }`,
      { setId, winnerId },
      "ReportSet",
    );
  }
}
