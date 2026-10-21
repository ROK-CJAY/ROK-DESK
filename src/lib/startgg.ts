import { blankPlayer, flagOf, type FgcEvent, type FgcPlayer, type FgcSet, type FgcSetState } from "@/lib/fgc-types";

const ENDPOINT = "https://www.start.gg/api/-/gql";

export function startggSlug(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const parts = url.pathname.split("/").filter(Boolean);
    const tournament = parts.indexOf("tournament");
    const event = parts.indexOf("event");
    if (tournament >= 0 && event > tournament && parts[tournament + 1] && parts[event + 1]) {
      return `tournament/${parts[tournament + 1]}/event/${parts[event + 1]}`;
    }
  } catch {
    /* not a url */
  }
  if (/^tournament\/[^/]+\/event\/[^/]+/.test(raw)) return raw.split("?")[0] ?? raw;
  return null;
}

type GqlResponse<T> = { data?: T; errors?: { message: string }[] };

export async function startggQuery<T>(query: string, variables: Record<string, unknown>, operationName: string): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "client-version": "20",
      origin: "https://www.start.gg",
      referer: "https://www.start.gg/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({ operationName, query, variables }),
  });
  const text = await res.text();
  if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
    throw new Error("start.gg blocked the import. Try the event link again in a moment.");
  }
  let body: GqlResponse<T>;
  try {
    body = JSON.parse(text) as GqlResponse<T>;
  } catch {
    throw new Error("start.gg blocked the import. Try the event link again in a moment.");
  }
  if (!res.ok || body.errors?.length) {
    throw new Error(body.errors?.map((err) => err.message).join("; ") || `start.gg returned ${res.status}`);
  }
  if (!body.data) throw new Error("start.gg returned no data");
  return body.data;
}

const EVENT_QUERY = `
  query FgcEvent($slug: String!) {
    event(slug: $slug) {
      id
      name
      slug
      tournament { name slug venueAddress startAt endAt numAttendees }
      numEntrants
      startAt
      endAt
      videogame { name }
      phases {
        id
        name
        phaseGroups(query: { page: 1, perPage: 20 }) {
          nodes { id displayIdentifier }
        }
      }
    }
  }
`;

const SETS_QUERY = `
  query FgcSets($id: ID!, $page: Int!) {
    phaseGroup(id: $id) {
      id
      displayIdentifier
      sets(page: $page, perPage: 16, sortType: ROUND) {
        pageInfo { totalPages }
        nodes {
          id
          fullRoundText
          identifier
          state
          winnerId
          slots {
            standing { stats { score { value } } }
            entrant {
              id
              name
              seeds { seedNum }
              participants {
                id
                gamerTag
                prefix
                user {
                  id
                  name
                  genderPronoun
                  location { country state city }
                  authorizations(types: [TWITTER]) { externalUsername type }
                }
              }
            }
          }
        }
      }
    }
  }
`;

type RawEvent = {
  event: {
    id: string;
    name: string;
    slug: string;
    tournament?: { name?: string; slug?: string; venueAddress?: string | null; startAt?: number | null; endAt?: number | null; numAttendees?: number | null; rules?: string | null } | null;
    numEntrants?: number | null;
    startAt?: number | null;
    endAt?: number | null;
    videogame?: { name?: string } | null;
    phases?: {
      id: string;
      name: string;
      phaseGroups?: { nodes?: { id: string; displayIdentifier?: string | null }[] | null } | null;
    }[];
  } | null;
};

type RawSets = {
  phaseGroup: {
    id: string;
    displayIdentifier?: string | null;
    sets?: {
      pageInfo?: { totalPages?: number | null } | null;
      nodes?: RawSet[] | null;
    } | null;
  } | null;
};

type RawSet = {
  id: string;
  fullRoundText?: string | null;
  identifier?: string | null;
  state?: number | null;
  winnerId?: number | string | null;
  slots?: {
    standing?: { stats?: { score?: { value?: number | null } | null } | null } | null;
    entrant?: {
      id: string;
      name?: string | null;
      seeds?: { seedNum?: number | null }[] | null;
      participants?: {
        id?: string;
        gamerTag?: string | null;
        prefix?: string | null;
        user?: {
          id?: string | number | null;
          name?: string | null;
          genderPronoun?: string | null;
          location?: { country?: string | null; state?: string | null; city?: string | null } | null;
          authorizations?: { externalUsername?: string | null; type?: string | null }[] | null;
        } | null;
      }[] | null;
    } | null;
  }[] | null;
};

function setState(value: number | null | undefined): FgcSetState {
  if (value === 2) return "live";
  if (value === 3) return "done";
  return "pending";
}

function playerOf(slot: NonNullable<RawSet["slots"]>[number] | undefined): FgcPlayer | null {
  const entrant = slot?.entrant;
  if (!entrant) return null;
  const person = entrant.participants?.[0];
  const user = person?.user;
  const country = user?.location?.country?.trim() || "";
  const twitter = user?.authorizations?.find((row) => row.externalUsername)?.externalUsername ?? "";
  return {
    id: entrant.id,
    profileId: user?.id == null ? "" : String(user.id),
    tag: person?.gamerTag?.trim() || entrant.name?.trim() || "TBD",
    prefix: person?.prefix?.trim() || "",
    realName: user?.name?.trim() || "",
    country,
    flag: flagOf(country),
    region: [user?.location?.city, user?.location?.state].filter(Boolean).join(", "),
    twitter: twitter.replace(/^@/, ""),
    pronouns: user?.genderPronoun?.trim() || "",
    character: "",
    skin: 0,
    character2: "",
    skin2: 0,
    seed: entrant.seeds?.[0]?.seedNum ?? null,
  };
}

function normalizeSet(raw: RawSet, phase: string, group: string): FgcSet {
  const slots = raw.slots ?? [];
  return {
    id: raw.id,
    phase,
    group,
    round: raw.fullRoundText?.trim() || "Set",
    identifier: raw.identifier?.trim() || "",
    bestOf: 3,
    stage: "",
    losers1: false,
    losers2: false,
    state: setState(raw.state),
    winnerId: raw.winnerId == null ? null : String(raw.winnerId),
    p1: playerOf(slots[0]),
    p2: playerOf(slots[1]),
    p1b: blankPlayer(),
    p2b: blankPlayer(),
    playersPerTeam: 1,
    charactersPerPlayer: 1,
    score1: slots[0]?.standing?.stats?.score?.value ?? 0,
    score2: slots[1]?.standing?.stats?.score?.value ?? 0,
  };
}

function when(value: number | null | undefined): string {
  if (!value) return "";
  const date = new Date(value < 10_000_000_000 ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export async function searchStartggPlayers(name: string): Promise<{ profileId: string; name: string; twitter: string; pronouns: string }[]> {
  const query = name.trim();
  if (query.length < 2) return [];
  const data = await startggQuery<{
    players?: {
      nodes?: {
        gamerTag?: string | null;
        user?: {
          id?: string | number | null;
          name?: string | null;
          genderPronoun?: string | null;
          authorizations?: { externalUsername?: string | null }[] | null;
        } | null;
      }[] | null;
    } | null;
  }>(
    `query PlayersSearch($query: String!) {
      players(query: { filter: { gamerTag: $query }, perPage: 6 }) {
        nodes {
          gamerTag
          user { id name genderPronoun authorizations(types: [TWITTER]) { externalUsername } }
        }
      }
    }`,
    { query },
    "PlayersSearch",
  );
  return (data.players?.nodes ?? [])
    .map((player) => ({
      profileId: player.user?.id == null ? "" : String(player.user.id),
      name: player.gamerTag?.trim() || player.user?.name?.trim() || "",
      twitter: (player.user?.authorizations?.find((row) => row.externalUsername)?.externalUsername ?? "").replace(/^@/, ""),
      pronouns: player.user?.genderPronoun?.trim() || "",
    }))
    .filter((player) => player.name);
}

export async function importStartggEvent(url: string): Promise<{ event: FgcEvent; sets: FgcSet[] }> {
  const slug = startggSlug(url);
  if (!slug) throw new Error("Paste a start.gg event link, like start.gg/tournament/name/event/singles");
  const eventData = await startggQuery<RawEvent>(EVENT_QUERY, { slug }, "FgcEvent");
  const event = eventData.event;
  if (!event) throw new Error("No event found at that link");

  const groups = (event.phases ?? []).flatMap((phase) =>
    (phase.phaseGroups?.nodes ?? []).map((group) => ({
      id: group.id,
      phase: phase.name,
      group: group.displayIdentifier?.trim() || phase.name,
    })),
  );
  const sets: FgcSet[] = [];
  for (const group of groups) {
    let page = 1;
    let pages = 1;
    while (page <= pages && page <= 12) {
      const data = await startggQuery<RawSets>(SETS_QUERY, { id: group.id, page }, "FgcSets");
      const block = data.phaseGroup?.sets;
      pages = block?.pageInfo?.totalPages ?? 1;
      for (const node of block?.nodes ?? []) sets.push(normalizeSet(node, group.phase, group.group));
      page += 1;
    }
  }

  return {
    event: {
      id: event.id,
      name: event.name,
      slug: event.slug,
      tournamentName: event.tournament?.name?.trim() || event.name,
      game: event.videogame?.name?.trim() || "Fighting game",
      url: `https://www.start.gg/${slug}`,
      venue: event.tournament?.venueAddress?.trim() || "",
      ruleset: "",
      entrants: event.numEntrants ?? event.tournament?.numAttendees ?? 0,
      startAt: when(event.startAt ?? event.tournament?.startAt),
      endAt: when(event.endAt ?? event.tournament?.endAt),
    },
    sets,
  };
}

const STREAM_QUERY = `
  query FgcStream($slug: String!) {
    event(slug: $slug) {
      tournament {
        streamQueue { sets { id } }
      }
      sets(page: 1, perPage: 8, filters: { state: 2 }) {
        nodes { id }
      }
    }
  }
`;

export async function currentStreamSetId(url: string): Promise<string | null> {
  const slug = startggSlug(url);
  if (!slug) throw new Error("Import the event first");
  const data = await startggQuery<{
    event?: {
      tournament?: { streamQueue?: { sets?: { id: string }[] | null } | null } | null;
      sets?: { nodes?: { id: string }[] | null } | null;
    } | null;
  }>(STREAM_QUERY, { slug }, "FgcStream");
  return data.event?.tournament?.streamQueue?.sets?.[0]?.id ?? data.event?.sets?.nodes?.[0]?.id ?? null;
}
