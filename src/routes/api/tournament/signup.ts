import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { blankEntrant, snapshotDesk, tournamentSchema } from "@/lib/tournament-types";
import { loadTournament, saveTournament } from "@/lib/tournament-server";
import { mergeTeam } from "@/lib/pokemon-vgc";

const noStore = {
  "cache-control": "no-store, no-cache, must-revalidate",
};

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  tag: z.string().trim().max(40).optional().default(""),
  pronouns: z.string().trim().max(40).optional().default(""),
  country: z.string().trim().max(8).optional().default("US"),
  deck: z.string().trim().max(80).optional().default(""),
  extra: z.string().trim().max(80).optional().default(""),
  playerId: z.string().trim().max(40).optional().default(""),
  trainerName: z.string().trim().max(80).optional().default(""),
  switchProfile: z.string().trim().max(80).optional().default(""),
  ageDivision: z
    .string()
    .optional()
    .transform((v) => (v === "juniors" || v === "seniors" || v === "masters" ? v : "")),
  birthDate: z.string().trim().max(20).optional().default(""),
  team: z.unknown().optional(),
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
        if (current.phase === "complete") {
          return Response.json({ error: "This tournament is closed" }, { status: 409, headers: noStore });
        }

        const seed = current.entrants.reduce((max, e) => Math.max(max, e.seed), 0) + 1;
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
        });
        const next = {
          ...current,
          version: current.version + 1,
          entrants: [...current.entrants, entrant],
        };
        const saved = await saveTournament({
          ...next,
          desks: { ...next.desks, [next.gameId]: snapshotDesk(next) },
        });
        const checked = tournamentSchema.safeParse(saved);
        return Response.json(
          {
            ok: true,
            id: entrant.id,
            seed: entrant.seed,
            name: entrant.name,
            count: checked.success ? checked.data.entrants.length : saved.entrants.length,
          },
          { headers: noStore },
        );
      },
    },
  },
});
