import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { DeckCard } from "@/lib/decklist";
import { printedSetCode } from "@/lib/ptcg-deck-match";
import {
  isStandardFormat,
  printAgeDivision as printPtcgAge,
  regulationOf,
  splitPtcgDeck,
} from "@/lib/ptcg-deck-list";
import {
  battleTeamOf,
  monRows,
  printAgeDivision as printVgcAge,
  printSlug,
  switchProfileOf,
  trainerNameOf,
} from "@/lib/vg-team-list";
import type { AgeDivision, Entrant, TournamentState } from "@/lib/tournament-types";
import { DECK_LIST_PDF, VG_TEAM_LIST_PDF } from "@/lib/play-pokemon-pdf-bytes";
import deckTemplateUrl from "./play-pokemon-assets/deck-list-85x11.pdf?url";
import teamTemplateUrl from "./play-pokemon-assets/vg-team-list.pdf?url";

const INK = rgb(0.08, 0.08, 0.1);
const TEMPLATE_FILE = {
  deck: "deck-list-85x11.pdf",
  team: "vg-team-list.pdf",
} as const;
const TEMPLATE_URL = {
  deck: deckTemplateUrl,
  team: teamTemplateUrl,
} as const;

export async function officialPlayPdf(
  tournament: TournamentState,
  kind: "deck" | "team",
  players: Entrant[],
  request?: Request,
): Promise<{ bytes: Uint8Array; filename: string }> {
  const template = await loadTemplate(kind, request);
  const out = await PDFDocument.create();
  const src = await PDFDocument.load(template);
  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);

  for (const player of players) {
    const copied = await out.copyPages(src, src.getPageIndices());
    if (kind === "deck") {
      fillDeck(copied[0]!, tournament, player, font, bold);
      out.addPage(copied[0]!);
    } else {
      const staff = copied[0];
      const foes = copied[1];
      if (!staff || !foes) throw new Error("VGC team list template is missing a page.");
      fillTeam(staff, foes, tournament, player, font, bold);
      out.addPage(staff);
      out.addPage(foes);
    }
  }

  const slug = players.length === 1 ? printSlug(players[0]!) : `${players.length}-players`;
  const filename = kind === "deck" ? `${slug}-play-pokemon-deck-list.pdf` : `${slug}-play-pokemon-team-list.pdf`;
  return { bytes: await out.save(), filename };
}

function fillDeck(page: PDFPage, tournament: TournamentState, player: Entrant, font: PDFFont, bold: PDFFont) {
  const division = printPtcgAge(player, tournament.gameId);
  const standard = isStandardFormat(tournament.formatName);
  const [poke, trainer, energy] = splitPtcgDeck(player.decklist);
  const [mm, dd, yyyy] = dobParts(player.birthDate);

  write(page, font, 7.4, 91.4, 713.2, player.name, 140);
  write(page, font, 7.4, 280, 713.2, player.playerId, 88);
  write(page, font, 7.4, 493.2, 713.2, mm, 18);
  write(page, font, 7.4, 520.6, 713.2, dd, 18);
  write(page, font, 7.4, 548.2, 713.2, yyyy, 28);

  mark(page, bold, standard ? 156.2 : 206.0, 738.6);
  if (division === "juniors") mark(page, bold, 375.6, 675.9);
  if (division === "seniors") mark(page, bold, 375.6, 662.4);
  if (division === "masters") mark(page, bold, 375.6, 648.9);

  fillTable(page, font, poke?.cards ?? [], 18, 590.4, 8.18, true);
  fillTable(page, font, trainer?.cards ?? [], 25, 413.2, 9.95, false);
  fillTable(page, font, energy?.cards ?? [], 8, 132.4, 7.20, false);

  const marks = new Set(
    (poke?.cards ?? [])
      .concat(trainer?.cards ?? [])
      .concat(energy?.cards ?? [])
      .map((card) => regulationOf(card)),
  );
  if (marks.has("H")) mark(page, bold, 45.2, 99.4, 7.5);
  if (marks.has("I")) mark(page, bold, 56.0, 99.4, 7.5);
  if (marks.has("J")) mark(page, bold, 66.8, 99.4, 7.5);
}

function fillTable(page: PDFPage, font: PDFFont, cards: DeckCard[], rows: number, firstY: number, step: number, withPrint: boolean) {
  const shown = cards.slice(0, rows);
  shown.forEach((card, i) => {
    const y = firstY - i * step;
    write(page, font, 6.6, 270, y, String(card.qty), 22);
    write(page, font, 6.4, 300, y, card.name, withPrint ? 172 : 250);
    if (withPrint) {
      write(page, font, 6.2, 478, y, printedSetCode(card.set, card.id), 28);
      write(page, font, 6.2, 510, y, card.number, 36);
      write(page, font, 6.4, 553, y, regulationOf(card), 16);
    }
  });
}

function fillTeam(
  staff: PDFPage,
  foes: PDFPage,
  tournament: TournamentState,
  player: Entrant,
  font: PDFFont,
  bold: PDFFont,
) {
  const division = printVgcAge(player, tournament.gameId);
  const mons = monRows(player);
  fillTeamHeader(staff, player, division, font, bold, true);
  fillTeamHeader(foes, player, division, font, bold, false);
  fillTeamMons(staff, mons, font, true);
  fillTeamMons(foes, mons, font, false);
}

function fillTeamHeader(
  page: PDFPage,
  player: Entrant,
  division: AgeDivision,
  font: PDFFont,
  bold: PDFFont,
  staff: boolean,
) {
  const yName = staff ? 706.4 : 708.2;
  write(page, font, 9, 142, yName, player.name, 220);
  const yAge = staff ? 707.5 : 709.3;
  if (division === "juniors") mark(page, bold, 474.6, yAge, 8);
  if (division === "seniors") mark(page, bold, 530.4, yAge, 8);
  if (division === "masters") mark(page, bold, 579.8, yAge, 8);

  const yTrainer = staff ? 684.3 : 686.1;
  write(page, font, 8.5, 142, yTrainer, trainerNameOf(player), 220);
  const yBattle = staff ? 664.4 : 664.8;
  write(page, font, 8.5, 142, yBattle, battleTeamOf(player), 220);
  const ySwitch = staff ? 639.9 : 641.7;
  write(page, font, 8.5, 142, ySwitch, switchProfileOf(player), 220);

  if (staff) {
    write(page, font, 8.5, 448, 684.3, player.playerId, 128);
    const [mm, dd, yyyy] = dobParts(player.birthDate);
    write(page, font, 8, 452, 663.6, mm, 22);
    write(page, font, 8, 498, 663.6, dd, 22);
    write(page, font, 8, 545, 663.6, yyyy, 36);
  }
}

function fillTeamMons(page: PDFPage, mons: ReturnType<typeof monRows>, font: PDFFont, staff: boolean) {
  const origins = staff ? [610.7, 409.3, 207.9] : [612.9, 411.6, 210.1];
  const left = { species: 128, stat: 112, field: 96 };
  const right = { species: 420, stat: 404, field: 388 };
  const statLeft = 270;
  const statRight = 562;
  const dy = staff
    ? { stat: -26.1, hp: -52.8, ability: -50.9, atk: -76.0, item: -74.1, def: -99.2, m1: -97.3, spa: -122.4, m2: -120.4, spd: -145.5, m3: -143.6, spe: -168.7, m4: -166.8 }
    : { stat: -26.0, ability: -50.8, item: -74.0, m1: -97.2, m2: -120.3, m3: -143.5, m4: -166.7 };

  for (let i = 0; i < 6; i++) {
    const mon = mons[i];
    if (!mon?.species) continue;
    const y = origins[Math.floor(i / 2)]!;
    const col = i % 2 === 0 ? left : right;
    const sx = i % 2 === 0 ? statLeft : statRight;
    write(page, font, 8, col.species, y, mon.species, 150);
    write(page, font, 7.5, col.stat, y + dy.stat, mon.nature, 118);
    write(page, font, 7.5, col.field, y + dy.ability, mon.ability, 140);
    write(page, font, 7.5, col.field, y + dy.item, mon.item, 140);
    write(page, font, 7.5, col.field, y + dy.m1, mon.moves[0]?.name ?? "", 140);
    write(page, font, 7.5, col.field, y + dy.m2, mon.moves[1]?.name ?? "", 140);
    write(page, font, 7.5, col.field, y + dy.m3, mon.moves[2]?.name ?? "", 140);
    write(page, font, 7.5, col.field, y + dy.m4, mon.moves[3]?.name ?? "", 140);
    if (staff) {
      const s = dy as typeof dy & { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
      write(page, font, 7, sx, y + s.hp, mon.hp, 36);
      write(page, font, 7, sx, y + s.atk, mon.atk, 36);
      write(page, font, 7, sx, y + s.def, mon.def, 36);
      write(page, font, 7, sx, y + s.spa, mon.spa, 36);
      write(page, font, 7, sx, y + s.spd, mon.spd, 36);
      write(page, font, 7, sx, y + s.spe, mon.spe, 36);
    }
  }
}

function write(page: PDFPage, font: PDFFont, size: number, x: number, y: number, value: string, maxWidth: number) {
  const text = fit(font, value, size, maxWidth);
  if (!text) return;
  try {
    page.drawText(text, { x, y, size, font, color: INK });
  } catch {
    const fallback = fit(font, text.replace(/[^\x20-\x7E]/g, ""), size, maxWidth);
    if (fallback) page.drawText(fallback, { x, y, size, font, color: INK });
  }
}

function mark(page: PDFPage, font: PDFFont, x: number, y: number, size = 9) {
  page.drawText("X", { x, y, size, font, color: INK });
}

function fit(font: PDFFont, value: string, size: number, maxWidth: number): string {
  let text = winAnsi(value).replace(/\s+/g, " ").trim();
  try {
    while (text && font.widthOfTextAtSize(text, size) > maxWidth) text = text.slice(0, -1);
    return text;
  } catch {
    text = text.replace(/[^\x20-\x7E]/g, "");
    while (text && font.widthOfTextAtSize(text, size) > maxWidth) text = text.slice(0, -1);
    return text;
  }
}

function winAnsi(value: string): string {
  return value
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, "");
}

function dobParts(raw: string): [string, string, string] {
  const text = raw.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return [iso[2] ?? "", iso[3] ?? "", iso[1] ?? ""];
  const us = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!us) return ["", "", ""];
  const year = (us[3] ?? "").length === 2 ? `20${us[3]}` : (us[3] ?? "");
  return [(us[1] ?? "").padStart(2, "0"), (us[2] ?? "").padStart(2, "0"), year];
}

async function loadTemplate(kind: "deck" | "team", request?: Request): Promise<Uint8Array> {
  const bundled = kind === "deck" ? DECK_LIST_PDF : VG_TEAM_LIST_PDF;
  if (bundled?.byteLength > 1000) return new Uint8Array(bundled);

  const name = TEMPLATE_FILE[kind];
  const files: string[] = [];
  try {
    files.push(fileURLToPath(new URL(`./play-pokemon-assets/${name}`, import.meta.url)));
  } catch {
    /* import.meta.url may be virtual in some bundles */
  }
  files.push(
    path.join(process.cwd(), "public/play-pokemon", name),
    path.join(process.cwd(), "src/lib/play-pokemon-assets", name),
    `/workspace/public/play-pokemon/${name}`,
    `/workspace/src/lib/play-pokemon-assets/${name}`,
  );
  for (const file of files) {
    try {
      return new Uint8Array(await readFile(file));
    } catch {
      /* try the next location */
    }
  }

  const urls: string[] = [];
  const asset = TEMPLATE_URL[kind];
  if (asset) urls.push(asset);
  urls.push(`/play-pokemon/${name}`);
  if (request) {
    try {
      urls.push(new URL(`/play-pokemon/${name}`, request.url).href);
      if (asset && !/^https?:\/\//i.test(asset)) urls.push(new URL(asset, request.url).href);
    } catch {
      /* ignore bad request url */
    }
  }
  urls.push(`http://127.0.0.1:8080/play-pokemon/${name}`, `http://localhost:8080/play-pokemon/${name}`);

  for (const url of urls) {
    try {
      const href = /^https?:\/\//i.test(url) ? url : request ? new URL(url, request.url).href : url;
      if (!/^https?:\/\//i.test(href)) continue;
      const res = await fetch(href);
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > 1000 && bytes[0] === 0x25 && bytes[1] === 0x50) return bytes;
    } catch {
      /* try the next URL */
    }
  }

  throw new Error("Official PDF template is missing from this build.");
}
