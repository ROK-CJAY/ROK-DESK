import { COUNTRIES } from "@/lib/countries";
import { inferPlayAgeDivision, isPtcgTitle, isVgcTitle, ptcgGameIdFor, vgcGameIdFor, type GameId, type TomTitleId } from "@/lib/games";
import type { Entrant, TournamentState } from "@/lib/tournament-types";
import type { TomPlayer } from "@/lib/tom-reports";

export type TomTdfImport = {
  gameId: TomTitleId;
  name: string;
  city: string;
  state: string;
  country: string;
  organizerName: string;
  organizerPopId: string;
  startDate: string;
  players: TomPlayer[];
};

export function parseTomTdf(xml: string): TomTdfImport {
  if (!/<tournament\b/i.test(xml)) throw new Error("This is not a TOM .tdf file.");
  const gametype = attr(xml, "gametype");
  const data = xml.match(/<data\b[^>]*>([\s\S]*?)<\/data>/i)?.[1] ?? xml;
  const organizer = data.match(/<organizer\b([^>]*)\/?>/i)?.[1] ?? "";
  const name = tag(data, "name");
  const namedDivision = inferPlayAgeDivision(name);
  const gameId: TomTdfImport["gameId"] = /VIDEO_GAME/i.test(gametype)
    ? ((namedDivision ? vgcGameIdFor(namedDivision) : "pokemon-vgc") as TomTitleId)
    : ((namedDivision ? ptcgGameIdFor(namedDivision) : "pokemon-tcg") as TomTitleId);
  const players: TomPlayer[] = [];
  const playerRe = /<player\b([^>]*)>([\s\S]*?)<\/player>/gi;
  let row: RegExpExecArray | null;
  while ((row = playerRe.exec(xml))) {
    const userid = digits(attr(`<x ${row[1] ?? ""}>`, "userid") || attr(row[1] ?? "", "userid"));
    const body = row[2] ?? "";
    const first = tag(body, "firstname");
    const last = tag(body, "lastname");
    const name = [first, last].filter(Boolean).join(" ").trim();
    if (!name && !userid) continue;
    players.push({
      name: name || userid,
      playerId: userid,
      division: "",
      birthDate: toIsoDate(tag(body, "birthdate")),
      trainerName: tag(body, "ingamename") || tag(body, "trainername") || tag(body, "screenname") || tag(body, "gamename"),
    });
  }
  if (!players.length) throw new Error("That TDF has no players.");
  assignTomTdfDivisions(xml, players);
  return {
    gameId,
    name,
    city: tag(data, "city"),
    state: tag(data, "state"),
    country: tag(data, "country"),
    organizerName: attr(`<x ${organizer}>`, "name") || attr(organizer, "name"),
    organizerPopId: digits(attr(`<x ${organizer}>`, "popid") || attr(organizer, "popid")),
    startDate: tag(data, "startdate"),
    players,
  };
}

export function resolveTomTdfGame(file: TomTdfImport, selected: GameId): TomTitleId {
  const named = inferPlayAgeDivision(file.name);
  if (isVgcTitle(file.gameId)) {
    if (named) return vgcGameIdFor(named) as TomTitleId;
    if (isVgcTitle(selected)) return selected as TomTitleId;
    return "pokemon-vgc";
  }
  if (named) return ptcgGameIdFor(named) as TomTitleId;
  if (isPtcgTitle(selected)) return selected as TomTitleId;
  return "pokemon-tcg";
}

function assignTomTdfDivisions(xml: string, players: TomPlayer[]): void {
  const standings = xml.match(/<standings\b[^>]*>([\s\S]*?)<\/standings>/i)?.[1];
  if (!standings) return;
  const byId = new Map(players.filter((p) => p.playerId).map((p) => [p.playerId, p]));
  const podRe = /<pod\b([^>]*)>([\s\S]*?)<\/pod>/gi;
  let pod: RegExpExecArray | null;
  while ((pod = podRe.exec(standings))) {
    const cat = attr(`<x ${pod[1] ?? ""}>`, "category");
    const division: TomPlayer["division"] = cat === "0" ? "juniors" : cat === "1" ? "seniors" : cat === "2" ? "masters" : "";
    if (!division) continue;
    for (const m of (pod[2] ?? "").matchAll(/<player\b([^>]*)\/?>/gi)) {
      const id = digits(attr(`<x ${m[1] ?? ""}>`, "id") || attr(`<x ${m[1] ?? ""}>`, "userid"));
      const row = byId.get(id);
      if (row && !row.division) row.division = division;
    }
  }
}

export function looksLikeTomTdf(name: string, text: string): boolean {
  return /\.tdf$/i.test(name) || /<tournament\b[^>]*gametype=/i.test(text);
}

export type TomTdfResult = {
  xml: string;
  filename: string;
  included: number;
  skipped: { name: string; reason: string }[];
};

export function buildTomTdf(t: TournamentState, now = new Date()): TomTdfResult {
  const skipped: TomTdfResult["skipped"] = [];
  const players: Entrant[] = [];
  for (const e of t.entrants) {
    if (e.dropped) continue;
    const userid = digits(e.playerId);
    if (!userid) {
      skipped.push({ name: e.name || "Unnamed", reason: "missing Player ID" });
      continue;
    }
    players.push(e);
  }

  const stamp = tomDateTime(now);
  const start = tomDate(t.tomStartDate) || tomDate(now);
  const organizerName = xml(t.tomOrganizerName.trim() || staffOrganizer(t) || "");
  const popid = xml(digits(t.tomOrganizerPopId));
  const city = xml(t.tomCity.trim());
  const state = xml(t.tomState.trim());
  const country = xml(countryName(t.tomCountry || "US"));
  const name = xml(t.name.trim() || "Untitled");
  const gametype = isVgcTitle(t.gameId) ? "VIDEO_GAME" : "TRADING_CARD_GAME";

  const playerXml = players
    .map((e) => {
      const { first, last } = splitName(e.name);
      const dob = tomDate(e.birthDate);
      const trainer = e.trainerName.trim() || e.tag.trim();
      const rows = [
        `\t\t<player userid="${xml(digits(e.playerId))}">`,
        `\t\t\t<firstname>${xml(first)}</firstname>`,
        `\t\t\t<lastname>${xml(last)}</lastname>`,
        `\t\t\t<birthdate>${xml(dob)}</birthdate>`,
      ];
      if (isVgcTitle(t.gameId) && trainer) {
        rows.push(`\t\t\t<ingamename>${xml(trainer)}</ingamename>`);
      }
      rows.push(
        `\t\t\t<creationdate>${stamp}</creationdate>`,
        `\t\t\t<lastmodifieddate>${stamp}</lastmodifieddate>`,
        `\t\t</player>`,
      );
      return rows.join("\n");
    })
    .join("\n");

  const xmlDoc = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<tournament type="2" stage="1" version="1.86" gametype="${gametype}" mode="CUSTOM">`,
    `\t<data>`,
    `\t\t<name>${name}</name>`,
    `\t\t<id></id>`,
    `\t\t<city>${city}</city>`,
    `\t\t<state>${state}</state>`,
    `\t\t<country>${country}</country>`,
    `\t\t<roundtime>0</roundtime>`,
    `\t\t<finalsroundtime>0</finalsroundtime>`,
    `\t\t<organizer popid="${popid}" name="${organizerName}"/>`,
    `\t\t<startdate>${start}</startdate>`,
    `\t\t<lessswiss>false</lessswiss>`,
    `\t\t<autotablenumber>true</autotablenumber>`,
    `\t\t<overflowtablestart>0</overflowtablestart>`,
    `\t</data>`,
    `\t<timeelapsed>0</timeelapsed>`,
    `\t<players>`,
    playerXml,
    `\t</players>`,
    `\t<pods>`,
    `\t</pods>`,
    `\t<finalsoptions>`,
    `\t</finalsoptions>`,
    `</tournament>`,
    ``,
  ].join("\n");

  return {
    xml: xmlDoc,
    filename: `${fileBase(t.name)}.tdf`,
    included: players.length,
    skipped,
  };
}

export function downloadTomTdf(t: TournamentState): TomTdfResult {
  const result = buildTomTdf(t);
  const blob = new Blob([result.xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return result;
}

export function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0]!, last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts.at(-1)! };
}

export function tomDate(value: string | Date | undefined): string {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return pad(value.getMonth() + 1) + "/" + pad(value.getDate()) + "/" + value.getFullYear();
  }
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${pad(iso[2]!)}/${pad(iso[3]!)}/${iso[1]}`;
  const us = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (us) return `${pad(us[1]!)}/${pad(us[2]!)}/${us[3]}`;
  return "";
}

function tomDateTime(d: Date): string {
  return `${tomDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function digits(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

function xml(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function pad(n: string | number): string {
  return String(n).padStart(2, "0");
}

function fileBase(name: string): string {
  const slug = name.trim().replace(/[<>:"/\\|?*]+/g, " ").replace(/\s+/g, " ").trim() || "roster";
  return slug.slice(0, 80);
}

function countryName(codeOrName: string): string {
  const raw = codeOrName.trim();
  if (!raw) return "United States";
  const hit = COUNTRIES.find((c) => c.code === raw.toUpperCase() || c.name.toLowerCase() === raw.toLowerCase());
  return hit?.name ?? raw;
}

function staffOrganizer(t: TournamentState): string {
  const head = (t.staff ?? []).find((s) => s.role === "head-judge" && s.name.trim());
  return head?.name.trim() || (t.staff ?? []).find((s) => s.name.trim())?.name.trim() || "";
}

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return decodeXml(m?.[1] ?? "");
}

function attr(xml: string, name: string): string {
  const m = xml.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i")) ?? xml.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, "i"));
  return decodeXml(m?.[1] ?? "");
}

function decodeXml(value: string): string {
  return value
    .replace(/\u0026quot;/g, '"')
    .replace(/\u0026lt;/g, "<")
    .replace(/\u0026gt;/g, ">")
    .replace(/\u0026amp;/g, "&")
    .trim();
}

function toIsoDate(value: string): string {
  const us = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (us) return `${us[3]}-${pad(us[1]!)}-${pad(us[2]!)}`;
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${pad(iso[2]!)}-${pad(iso[3]!)}`;
  return value;
}
