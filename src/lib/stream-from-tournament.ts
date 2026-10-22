import { hydrateDeckOnClient } from "@/lib/card-lookup";
import { type MatchSlot } from "@/lib/desk-types";
import { useDeskStore } from "@/lib/desk-store";
import { isPtcgTitle, isVgcTitle } from "@/lib/games";
import { emptyTeam, teamHasMons } from "@/lib/pokemon-vgc";
import { isPodMatch } from "@/lib/tournament-types";
import { useTournamentStore } from "@/lib/tournament-store";

export function sendMatchToStream(matchId: string, slot: MatchSlot = 1) {
  const t = useTournamentStore.getState().tournament;
  const match = t.matches.find((m) => m.id === matchId);
  if (!match) return;
  const seat = (entrantId: string | null | undefined) => {
    const e = entrantId ? t.entrants.find((row) => row.id === entrantId) : null;
    const vgc = isVgcTitle(t.gameId);
    return {
      name: e?.name ?? "",
      tag: e?.tag ?? "",
      country: e?.country ?? "US",
      pronouns: e?.pronouns ?? "",
      archetype: e?.deck ?? "",
      extra: e?.extra ?? "",
      photoUrl: e?.photoUrl ?? "",
      note: e?.note ?? "",
      judgeNote: e?.judgeNote ?? "",
      decklist: e?.decklist ?? [],
      team: vgc ? (teamHasMons(e?.team) ? e!.team : emptyTeam()) : undefined,
      ink1: e?.ink1 ?? "",
      ink2: e?.ink2 ?? "",
      inks: e?.inks ?? "",
      recordW: e?.recordW ?? 0,
      recordL: e?.recordL ?? 0,
      recordD: e?.recordD ?? 0,
    };
  };
  const pod = isPodMatch(match);
  useTournamentStore.getState().setStreamMatch(matchId, slot);
  const roundName = match.position > 0 && match.label === `Round ${match.round}`
    ? `Round ${match.round} · Table ${match.position}`
    : match.label;
  void (async () => {
    let p1 = seat(match.p1.entrantId);
    let p2 = seat(match.p2.entrantId);
    let p3 = pod ? seat(match.p3?.entrantId) : undefined;
    let p4 = pod ? seat(match.p4?.entrantId) : undefined;
    if (isPtcgTitle(t.gameId)) {
      const [d1, d2, d3, d4] = await Promise.all([
        hydrateDeckOnClient(p1.decklist ?? []),
        hydrateDeckOnClient(p2.decklist ?? []),
        p3 ? hydrateDeckOnClient(p3.decklist ?? []) : Promise.resolve([]),
        p4 ? hydrateDeckOnClient(p4.decklist ?? []) : Promise.resolve([]),
      ]);
      p1 = { ...p1, decklist: d1 };
      p2 = { ...p2, decklist: d2 };
      if (p3) p3 = { ...p3, decklist: d3 };
      if (p4) p4 = { ...p4, decklist: d4 };
    }
    useDeskStore.getState().loadStreamMatch({
      eventName: t.name,
      streamChannel: t.streamChannel,
      roundName,
      eventPhase:
        match.side !== "swiss" && t.bracketType === "swiss"
          ? "Top cut"
          : t.bracketType === "double"
            ? "Double elimination"
            : t.bracketType === "swiss"
              ? pod
                ? "Swiss pods"
                : "Swiss"
              : "Single elimination",
      bestOf: t.bestOf,
      gameId: t.gameId,
      formatName: t.formatName,
      tableSize: pod ? 4 : 2,
      matchId: match.id,
      matchSlot: slot,
      p1,
      p2,
      p3,
      p4,
    });
  })();
}

export function refreshStreamedMatches() {
  const desk = useDeskStore.getState().desk;
  const t = useTournamentStore.getState().tournament;
  if (desk.gameId !== t.gameId) return;
  const slot = (desk.matchSlot ?? 1) as 1 | 2 | 3;
  const id = slot === 2 ? t.streamMatchId2 : slot === 3 ? t.streamMatchId3 : t.streamMatchId;
  if (id && desk.streamMatchId === id) sendMatchToStream(id, slot);
}
