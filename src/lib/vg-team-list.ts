import { emptyTeam, TERA_LABEL, type TeamMon } from "@/lib/pokemon-vgc";
import type { AgeDivision, Entrant } from "@/lib/tournament-types";

export function trainerNameOf(player: Entrant): string {
  return player.trainerName.trim() || player.tag.trim() || player.name.trim();
}

export function battleTeamOf(player: Entrant): string {
  return player.deck.trim();
}

export function switchProfileOf(player: Entrant): string {
  return player.switchProfile.trim() || player.tag.trim();
}

export function ageLabel(division: AgeDivision): string {
  if (division === "juniors") return "Juniors";
  if (division === "seniors") return "Seniors";
  if (division === "masters") return "Masters";
  return "";
}

export function monRows(player: Entrant): TeamMon[] {
  const slots = player.team?.length ? player.team : emptyTeam();
  return emptyTeam().map((slot, i) => slots[i] ?? slot);
}

export function teraLabel(mon: TeamMon): string {
  return mon.tera ? TERA_LABEL[mon.tera] ?? mon.tera : "";
}

export function printSlug(player: Entrant): string {
  const raw = (player.name || player.tag || "player").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return raw.replace(/^-|-$/g, "") || "player";
}
