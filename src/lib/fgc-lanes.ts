import { blankRoster, EMPTY_BRACKET_VIEW, type FgcBoard, type FgcCaster, type FgcEvent, type FgcLane, type FgcSet, type FgcState } from "@/lib/fgc-types";

export const PERMANENT_BOARDS = [
  { id: "main", name: "Main" },
  { id: "stream-2", name: "Stream 2" },
  { id: "stream-3", name: "Stream 3" },
] as const;

export function isPermanentBoard(id: string): boolean {
  return PERMANENT_BOARDS.some((board) => board.id === id);
}

export function streamIdOf(board: FgcBoard): string {
  if (isPermanentBoard(board.id)) return board.id;
  const current = board.streamId || board.id;
  if (isPermanentBoard(current)) return current;
  const label = (board.streamName || (board.id === current ? board.name : "")).trim().toLowerCase();
  const match = PERMANENT_BOARDS.find((item) => item.name.toLowerCase() === label);
  return match?.id || current;
}

export function streamTabs(boards: FgcBoard[]): { id: string; name: string }[] {
  const tabs: { id: string; name: string }[] = PERMANENT_BOARDS.map((item) => {
    const named = boards.find((board) => streamIdOf(board) === item.id && board.streamName?.trim());
    return { id: item.id, name: named?.streamName?.trim() || item.name };
  });
  for (const board of boards) {
    const id = streamIdOf(board);
    if (tabs.some((tab) => tab.id === id)) continue;
    const name = board.streamName || (board.id === id ? board.name : "Stream");
    if (PERMANENT_BOARDS.some((item) => item.name.toLowerCase() === name.trim().toLowerCase())) continue;
    tabs.push({ id, name });
  }
  return tabs;
}

export function applyStartggStreamNames(boards: FgcBoard[], names: string[]): FgcBoard[] {
  const labels = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const next = withPermanentBoards(boards);
  PERMANENT_BOARDS.forEach((permanent, index) => {
    const label = labels[index] || "";
    for (const board of next) {
      if (streamIdOf(board) === permanent.id) board.streamName = label || undefined;
    }
  });
  labels.slice(PERMANENT_BOARDS.length).forEach((label, index) => {
    if (next.some((board) => (board.streamName || "").toLowerCase() === label.toLowerCase())) return;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `${index + 4}`;
    const id = next.some((board) => board.id === `stream-${slug}`) ? `stream-${slug}-${index}` : `stream-${slug}`;
    next.push({ id, name: "Scoreboard 1", setId: null, streamId: id, streamName: label });
  });
  return next;
}

export function boardForStreamName(boards: FgcBoard[], streamName: string): FgcBoard | null {
  const label = streamName.trim().toLowerCase();
  if (!label) return boards[0] ?? null;
  const named = boards.find((board) => (board.streamName || "").toLowerCase() === label);
  if (named) {
    const id = streamIdOf(named);
    return boards.find((board) => streamIdOf(board) === id && board.id === id) ?? named;
  }
  const permanent = PERMANENT_BOARDS.find((item) => item.name.toLowerCase() === label);
  if (permanent) {
    return boards.find((board) => streamIdOf(board) === permanent.id && board.id === permanent.id)
      ?? boards.find((board) => streamIdOf(board) === permanent.id)
      ?? boards[0]
      ?? null;
  }
  return boards.find((board) => (board.streamName || "").toLowerCase() === label)
    ?? boards.find((board) => board.name.toLowerCase() === label)
    ?? null;
}

export function defaultBoard(setId: string | null = null): FgcBoard {
  return { id: "main", name: "Scoreboard 1", setId, streamId: "main" };
}

export function withPermanentBoards(boards: FgcBoard[], fallbackSetId: string | null = null): FgcBoard[] {
  const next = boards.map((board) => ({ ...board, streamId: streamIdOf(board) }));
  for (const permanent of PERMANENT_BOARDS) {
    const found = next.find((board) => board.id === permanent.id);
    if (found) {
      found.streamId = permanent.id;
      if (!found.name || found.name === permanent.name) found.name = "Scoreboard 1";
    } else {
      next.push({ id: permanent.id, name: "Scoreboard 1", setId: permanent.id === "main" ? fallbackSetId : null, streamId: permanent.id });
    }
  }
  for (const board of next) {
    if (isPermanentBoard(board.id)) continue;
    const stream = PERMANENT_BOARDS.find((item) => item.id === board.streamId);
    if (!stream || board.name.trim().toLowerCase() !== stream.name.toLowerCase()) continue;
    const count = next.filter((item) => streamIdOf(item) === board.streamId).length;
    board.name = `Scoreboard ${Math.max(2, count)}`;
  }
  const order = new Map<string, number>(PERMANENT_BOARDS.map((board, index) => [board.id, index]));
  return next.sort((a, b) => {
    const byStream = (order.get(streamIdOf(a)) ?? 99) - (order.get(streamIdOf(b)) ?? 99);
    if (byStream) return byStream;
    if (a.id === streamIdOf(a) && b.id !== streamIdOf(b)) return -1;
    if (b.id === streamIdOf(b) && a.id !== streamIdOf(a)) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function laneIdOf(event: { id?: string | number | null; slug?: string | null } | null | undefined): string {
  return String(event?.id || event?.slug || "local");
}

export function laneSnapshot(state: FgcState, id = state.laneId || "local"): FgcLane {
  const boards = withPermanentBoards(state.boards?.length ? state.boards : [defaultBoard(state.streamSetId)], state.streamSetId);
  const activeBoardId = boards.some((board) => board.id === state.activeBoardId) ? state.activeBoardId : boards[0].id;
  return {
    id,
    url: state.url,
    event: state.event,
    sets: state.sets,
    casters: state.casters,
    rulesets: state.rulesets,
    activeRulesetId: state.activeRulesetId,
    importedAt: state.importedAt,
    roster: state.roster,
    bracketView: state.bracketView,
    boards,
    activeBoardId,
    streamSetId: boards.find((board) => board.id === activeBoardId)?.setId ?? state.streamSetId,
    updatedAt: state.lanes?.[id]?.updatedAt || Date.now(),
  };
}

export function applyLane(state: FgcState, lane: FgcLane): FgcState {
  return {
    ...state,
    laneId: lane.id,
    url: lane.url,
    event: lane.event,
    sets: lane.sets,
    casters: lane.casters,
    rulesets: lane.rulesets,
    activeRulesetId: lane.activeRulesetId,
    importedAt: lane.importedAt,
    roster: lane.roster ?? blankRoster(),
    bracketView: lane.bracketView ?? EMPTY_BRACKET_VIEW,
    boards: withPermanentBoards(lane.boards?.length ? lane.boards : [defaultBoard(lane.streamSetId)], lane.streamSetId),
    activeBoardId: lane.activeBoardId || "main",
    streamSetId: lane.streamSetId,
    lanes: { ...(state.lanes || {}), [lane.id]: lane },
  };
}

export function stampLanes(state: FgcState): FgcState {
  const id = state.laneId || laneIdOf(state.event);
  const previous = state.lanes?.[id];
  const lane = { ...laneSnapshot({ ...state, laneId: id }, id), updatedAt: previous?.updatedAt || Date.now() };
  return { ...state, laneId: id, boards: lane.boards, activeBoardId: lane.activeBoardId, streamSetId: lane.streamSetId, lanes: { ...(state.lanes || {}), [id]: lane } };
}

export function touchLane(state: FgcState): FgcState {
  const stamped = stampLanes(state);
  const lane = stamped.lanes[stamped.laneId];
  if (!lane) return stamped;
  return { ...stamped, lanes: { ...stamped.lanes, [stamped.laneId]: { ...lane, updatedAt: Date.now() } } };
}

export function resolveLane(state: FgcState, laneId?: string | null): FgcState {
  if (!laneId || laneId === state.laneId || !state.lanes?.[laneId]) return state;
  return applyLane(state, state.lanes[laneId]);
}

export function setForBoard(state: FgcState, boardId?: string | null): FgcSet | null {
  const boards = state.boards?.length ? state.boards : [];
  const picked = boardId
    ? boards.find((board) => board.id === boardId)
    : boards.find((board) => board.id === state.activeBoardId) ?? boards[0];
  const setId = picked ? picked.setId : state.streamSetId;
  if (!setId) return boardId || boards.length ? null : state.sets[0] ?? null;
  return state.sets.find((set) => set.id === setId) ?? null;
}

export function overlayPin(): { lane: string; board: string } {
  if (typeof window === "undefined") return { lane: "", board: "" };
  const params = new URLSearchParams(window.location.search);
  return { lane: params.get("lane") || "", board: params.get("board") || "" };
}

export function withPin(path: string, laneId: string, boardId: string): string {
  const params = new URLSearchParams(path.split("?")[1] || "");
  if (laneId) params.set("lane", laneId);
  if (boardId) params.set("board", boardId);
  const base = path.split("?")[0] || path;
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function mergeRemoteLanes(local: FgcState, remote: Partial<FgcState> | null): FgcState {
  if (!remote?.lanes) return local;
  const lanes = { ...(local.lanes || {}) };
  for (const [id, lane] of Object.entries(remote.lanes)) {
    const current = lanes[id];
    if (!current || (lane.updatedAt || 0) > (current.updatedAt || 0)) lanes[id] = lane;
  }
  const stamped = stampLanes({ ...local, lanes });
  if (stamped.laneId && lanes[stamped.laneId] && (lanes[stamped.laneId].updatedAt || 0) > (local.lanes?.[stamped.laneId]?.updatedAt || 0) && lanes[stamped.laneId] !== local.lanes?.[stamped.laneId]) {
    return applyLane({ ...stamped, lanes }, lanes[stamped.laneId]);
  }
  return stamped;
}

export function boardsForStreams(boards: FgcBoard[], names: string[], fallbackSetId: string | null): FgcBoard[] {
  const next = withPermanentBoards(boards.length ? boards.map((board) => ({ ...board })) : [defaultBoard(fallbackSetId)], fallbackSetId);
  for (const name of names) {
    const label = name.trim();
    if (!label) continue;
    if (PERMANENT_BOARDS.some((item) => item.name.toLowerCase() === label.toLowerCase())) continue;
    if (next.some((board) => board.name.toLowerCase() === label.toLowerCase() || board.streamName?.toLowerCase() === label.toLowerCase())) continue;
    const id = `stream-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "side"}`;
    next.push({ id: next.some((board) => board.id === id) ? `${id}-${next.length}` : id, name: label, setId: null });
  }
  return next;
}

export function emptyLane(id: string, event: FgcEvent | null, casters: FgcCaster[]): FgcLane {
  return {
    id,
    url: event?.url || "",
    event,
    sets: [],
    casters,
    rulesets: [],
    activeRulesetId: null,
    importedAt: null,
    roster: blankRoster(),
    bracketView: EMPTY_BRACKET_VIEW,
    boards: [
      { id: "main", name: "Scoreboard 1", setId: null, streamId: "main" },
      { id: "stream-2", name: "Scoreboard 1", setId: null, streamId: "stream-2" },
      { id: "stream-3", name: "Scoreboard 1", setId: null, streamId: "stream-3" },
    ],
    activeBoardId: "main",
    streamSetId: null,
    updatedAt: Date.now(),
  };
}
