import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { blankEntrant, emptyDesk, snapshotDesk } from "@/lib/tournament-types";
import { loadTournament, saveTournament } from "@/lib/tournament-server";
import { mergeTeam } from "@/lib/pokemon-vgc";
import { mergeDecklist } from "@/lib/decklist";
import { gameIdFromSlug } from "@/lib/games";
import { sanitizeInk } from "@/lib/lorcana";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  tag: z.string().trim().max(40).optional().default(""),
  pronouns: z.string().trim().max(40).optional().default(""),
  country: z.string().trim().max(8).optional().default("US"),
  deck: z.string().trim().max(120).optional().default(""),
  extra: z.string().trim().max(120).optional().default(""),
  playerId: z.string().trim().max(40).optional().default(""),
  trainerName: z.string().trim().max(80).optional().default(""),
  switchProfile: z.string().trim().max(80).optional().default(""),
  ageDivision: z
    .string()
    .optional()
    .transform((v) => (v === "juniors" || v === "seniors" || v === "masters" ? v : "")),
  birthDate: z.string().trim().max(20).optional().default(""),
  team: z.unknown().optional(),
  game: z.string().trim().max(40).optional(),
  ink1: z.string().trim().max(20).optional().default(""),
  ink2: z.string().trim().max(20).optional().default(""),
  note: z.string().trim().max(160).optional().default(""),
  photoUrl: z.string().trim().max(400).optional().default(""),
  decklist: z.unknown().optional(),
});

export const Route = createFileRoute("/api/tournament/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400, headers: noStore });
        }
        const parsed = signupSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Name is required" }, { status: 400, headers: noStore });
        }

        const current = await loadTournament();
        const gameId = parsed.data.game ? gameIdFromSlug(parsed.data.game) : current.gameId;
        if (!gameId) {
          return Response.json({ error: "Unknown game" }, { status: 400, headers: noStore });
        }

        const live = current.gameId === gameId;
        const lane = live ? snapshotDesk(current) : (current.desks[gameId] ?? emptyDesk(gameId));
        if (lane.phase === "complete" || (live && current.phase === "complete")) {
          return Response.json({ error: "This tournament is closed" }, { status: 409, headers: noStore });
        }

        if (lane.requireDecklist && mergeDecklist(parsed.data.decklist).length === 0) {
          return Response.json({ error: "Decklist is required for this event" }, { status: 400, headers: noStore });
        }

        const seed = lane.entrants.reduce((max, e) => Math.max(max, e.seed), 0) + 1;
        const entrant = blankEntrant({
          name: parsed.data.name,
          tag: parsed.data.tag,
          pronouns: parsed.data.pronouns,
          country: parsed.data.country || "US",
          deck: parsed.data.deck,
          extra: parsed.data.extra,
          playerId: parsed.data.playerId,
          trainerName: parsed.data.trainerName,
          switchProfile: parsed.data.switchProfile,
          ageDivision: parsed.data.ageDivision,
          birthDate: parsed.data.birthDate,
          seed,
          team: mergeTeam(parsed.data.team),
          ink1: sanitizeInk(parsed.data.ink1),
          ink2: sanitizeInk(parsed.data.ink2),
          note: parsed.data.note,
          photoUrl: parsed.data.photoUrl,
          decklist: mergeDecklist(parsed.data.decklist),
        });
        const nextLane = { ...lane, entrants: [...lane.entrants, entrant] };
        const next = live
          ? {
              ...current,
              version: current.version + 1,
              entrants: nextLane.entrants,
              desks: { ...current.desks, [gameId]: snapshotDesk({ ...current, entrants: nextLane.entrants }) },
            }
          : {
              ...current,
              version: current.version + 1,
              desks: { ...current.desks, [gameId]: nextLane },
            };
        const saved = await saveTournament(next);
        return Response.json(
          {
            ok: true,
            id: entrant.id,
            seed: entrant.seed,
            name: entrant.name,
            count: nextLane.entrants.length,
          },
          { headers: noStore },
        );
      },
    },
  },
});
