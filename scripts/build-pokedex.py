#!/usr/bin/env python3
"""Build src/lib/pokedex-national.ts from PokémonDB national dex + VGC formes."""

from __future__ import annotations

import html as htmlmod
import json
import re
from pathlib import Path

ROOT = Path("/workspace")
HTML = Path("/tmp/national.html")
OUT = ROOT / "src/lib/pokedex-national.ts"
SRC = ROOT / "src/lib/pokemon-vgc.ts"

FORMES = [
    {
        "name": "Urshifu",
        "slug": "urshifu-single-strike",
        "dex": 892,
        "types": ["fighting", "dark"],
        "abilities": ["Unseen Fist"],
    },
    {
        "name": "Urshifu Rapid",
        "slug": "urshifu-rapid-strike",
        "dex": 892,
        "spriteDex": 10191,
        "types": ["fighting", "water"],
        "abilities": ["Unseen Fist"],
    },
    {
        "name": "Ogerpon Wellspring",
        "slug": "ogerpon-wellspring",
        "dex": 1017,
        "spriteDex": 10273,
        "types": ["grass", "water"],
        "abilities": ["Water Absorb"],
    },
    {
        "name": "Ogerpon Hearthflame",
        "slug": "ogerpon-hearthflame",
        "dex": 1017,
        "spriteDex": 10274,
        "types": ["grass", "fire"],
        "abilities": ["Mold Breaker"],
    },
    {
        "name": "Ogerpon Cornerstone",
        "slug": "ogerpon-cornerstone",
        "dex": 1017,
        "spriteDex": 10275,
        "types": ["grass", "rock"],
        "abilities": ["Sturdy"],
    },
    {
        "name": "Indeedee F",
        "slug": "indeedee-female",
        "dex": 876,
        "spriteDex": 10186,
        "types": ["psychic", "normal"],
        "abilities": ["Own Tempo", "Synchronize", "Psychic Surge"],
    },
    {
        "name": "Indeedee M",
        "slug": "indeedee-male",
        "dex": 876,
        "types": ["psychic", "normal"],
        "abilities": ["Inner Focus", "Synchronize", "Psychic Surge"],
    },
    {
        "name": "Landorus Therian",
        "slug": "landorus-therian",
        "dex": 645,
        "spriteDex": 10021,
        "types": ["ground", "flying"],
        "abilities": ["Intimidate"],
    },
    {
        "name": "Tornadus Therian",
        "slug": "tornadus-therian",
        "dex": 641,
        "types": ["flying"],
        "abilities": ["Regenerator"],
    },
    {
        "name": "Thundurus Therian",
        "slug": "thundurus-therian",
        "dex": 642,
        "types": ["electric", "flying"],
        "abilities": ["Volt Absorb"],
    },
    {
        "name": "Calyrex Ice",
        "slug": "calyrex-ice-rider",
        "dex": 898,
        "spriteDex": 10193,
        "types": ["psychic", "ice"],
        "abilities": ["As One"],
    },
    {
        "name": "Calyrex Shadow",
        "slug": "calyrex-shadow-rider",
        "dex": 898,
        "spriteDex": 10194,
        "types": ["psychic", "ghost"],
        "abilities": ["As One"],
    },
    {
        "name": "Ursaluna Bloodmoon",
        "slug": "ursaluna-bloodmoon",
        "dex": 901,
        "spriteDex": 10272,
        "types": ["ground", "normal"],
        "abilities": ["Mind's Eye"],
    },
    {
        "name": "Ninetales-A",
        "slug": "ninetales-alolan",
        "dex": 38,
        "spriteDex": 10104,
        "types": ["ice", "fairy"],
        "abilities": ["Snow Cloak", "Snow Warning"],
    },
    {
        "name": "Arcanine-H",
        "slug": "arcanine-hisuian",
        "dex": 59,
        "spriteDex": 10230,
        "types": ["fire", "rock"],
        "abilities": ["Intimidate", "Flash Fire", "Rock Head"],
    },
    {
        "name": "Typhlosion-H",
        "slug": "typhlosion-hisuian",
        "dex": 157,
        "spriteDex": 10233,
        "types": ["fire", "ghost"],
        "abilities": ["Blaze", "Frisk"],
    },
    {
        "name": "Samurott-H",
        "slug": "samurott-hisuian",
        "dex": 503,
        "spriteDex": 10236,
        "types": ["water", "dark"],
        "abilities": ["Torrent", "Sharpness"],
    },
    {
        "name": "Decidueye-H",
        "slug": "decidueye-hisuian",
        "dex": 724,
        "spriteDex": 10244,
        "types": ["grass", "fighting"],
        "abilities": ["Overgrow", "Scrappy"],
    },
    {
        "name": "Lilligant-H",
        "slug": "lilligant-hisuian",
        "dex": 549,
        "spriteDex": 10237,
        "types": ["grass", "fighting"],
        "abilities": ["Chlorophyll", "Hustle", "Leaf Guard"],
    },
    {
        "name": "Electrode-H",
        "slug": "electrode-hisuian",
        "dex": 101,
        "spriteDex": 10232,
        "types": ["electric", "grass"],
        "abilities": ["Soundproof", "Static", "Aftermath"],
    },
    {
        "name": "Goodra-H",
        "slug": "goodra-hisuian",
        "dex": 706,
        "spriteDex": 10242,
        "types": ["steel", "dragon"],
        "abilities": ["Sap Sipper", "Shell Armor", "Gooey"],
    },
]


def parse_existing_abilities(src: str) -> dict[str, list[str]]:
    block = re.search(r"export const SPECIES: SpeciesDef\[\] = \[(.*?)\];", src, re.S)
    if not block:
        return {}
    out: dict[str, list[str]] = {}
    for m in re.finditer(
        r'\{ name: "([^"]+)",.*?abilities: \[([^\]]*)\]',
        block.group(1),
        re.S,
    ):
        name = m.group(1)
        abs_ = re.findall(r'"([^"]+)"', m.group(2))
        out[name.lower()] = abs_
    return out


def parse_national(html: str) -> list[dict]:
    blocks = re.findall(r'<div class="infocard\s*">([\s\S]*?)</div>', html)
    rows = []
    for b in blocks:
        name_m = re.search(r'class="ent-name"[^>]*>([^<]+)', b)
        href_m = re.search(r'href="/pokedex/([a-z0-9-]+)"', b)
        num_m = re.search(r"#(\d+)", b)
        types = re.findall(r'class="itype ([a-z]+)"', b)
        if not (name_m and href_m and num_m):
            continue
        rows.append(
            {
                "name": htmlmod.unescape(name_m.group(1)),
                "slug": href_m.group(1),
                "dex": int(num_m.group(1)),
                "types": types,
                "abilities": [],
            }
        )
    return rows


def ts_str(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def emit_row(row: dict) -> str:
    types = ", ".join(ts_str(t) for t in row["types"])
    abilities = ", ".join(ts_str(a) for a in row.get("abilities") or [])
    extra = ""
    if row.get("spriteDex"):
        extra = f', spriteDex: {row["spriteDex"]}'
    return (
        f'  {{ name: {ts_str(row["name"])}, slug: {ts_str(row["slug"])}, '
        f'dex: {row["dex"]}{extra}, types: [{types}], abilities: [{abilities}] }}'
    )


def main() -> None:
    html = HTML.read_text(errors="replace")
    national = parse_national(html)
    if len(national) < 1000:
        raise SystemExit(f"expected ~1025 national entries, got {len(national)}")

    abilities = parse_existing_abilities(SRC.read_text())
    for row in national:
        known = abilities.get(row["name"].lower())
        if known:
            row["abilities"] = known

    by_name = {row["name"].lower(): row for row in national}
    extras = []
    for forme in FORMES:
        existing = by_name.get(forme["name"].lower())
        if existing:
            existing.update({k: v for k, v in forme.items() if v or k == "abilities"})
        else:
            extras.append(forme)

    species = national + extras
    seen = set()
    unique = []
    for row in species:
        key = row["name"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)

    body = ",\n".join(emit_row(row) for row in unique)
    text = (
        "/* Generated from https://pokemondb.net/pokedex/national — do not edit by hand. */\n\n"
        f"export const SPECIES = [\n{body},\n];\n"
    )
    OUT.write_text(text)
    print(f"wrote {OUT} ({len(unique)} species, {len(extras)} extra formes)")


if __name__ == "__main__":
    main()
