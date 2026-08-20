# ROK Desk

**v1.0.0-beta** — broadcast production desk for [ROK Esports](https://github.com/ROK-CJAY/ROK-DESK).

ROK Desk is the control room for a live TCG / VGC event. One host machine runs the **tournament** (roster, pairings, floor clock) and the **broadcast** (scorebug, cameras, casters, look) from the same event data. Floor iPads report scores. OBS / vMix pull 1920×1080 transparent browser sources. Players check in on a walk-up kiosk.

It is built for a venue with a stream: a TO laptop, a production PC, tablets on feature tables, and a monitor showing the room clock.

---

## What it does

On a typical show:

1. **Tournament Organizer** names the event, picks the game and format, and takes the field — typed in, imported from walk-up sign-up, or loaded as an 8-player test roster.
2. Pairings go out as **single elim**, **double elim**, or **Swiss**. Staff, player IDs, and VGC team sheets stay on this side for the archive — they never hit the overlay.
3. A ready pairing is **sent to stream** onto **Match 1 (A)** or **Match 2 (B)**. Production receives names, decks, inks, and teams.
4. **Production Control** drives the featured table: games, life / lore / prizes, the stream clock, casters, slates, and overlay look.
5. **Judge tablets** sit with the table. They punch Game / Match, bump the resource, search a card onto the stream, and share the **stream clock**. A **player tablet** is available for Commander and Lorcana.
6. OBS / vMix key the **per-game, per-table** overlay URLs. The rest of the room watches the **floor clock**, which is a separate timer from the feature match.

Two TCG feature tables can run on **one host**. Two *titles* at once (PTCG on one side of the hall, Commander on the other) still means two hosts — each machine is one event.

---

## Titles

| Title | Slug | What the desk tracks | Card lookup |
| --- | --- | --- | --- |
| Pokémon VGC | `vgc` | Remaining Pokémon from the submitted team, Bo3 games | — |
| Pokémon TCG | `ptcg` | Prize cards (6 / 4 / 3 / 2 / 1), Bo3 | TCGdex (Pokémon TCG Live) |
| One Piece TCG | `op` | Life, DON!!, Bo1 by default | Official English art |
| Yu-Gi-Oh! | `ygo` | 8000 LP, Bo3 | YGOPRODeck |
| Magic: The Gathering | `mtg` | Life, poison, commander damage; Constructed or Commander / cEDH | Scryfall |
| Disney Lorcana | `lorcana` | Lore 0–20, inks, W/L/D, ROK Layout | Lorcast |
| Star Wars Unlimited | `swu` | Base HP, initiative | SWU-DB |
| Riftbound | `rb` | First-to-8 points | Riftcodex |

Each title keeps its **own roster, bracket, desk, overlays, and tablets**. Switching games on Production does not throw away the other event’s live match.

---

## Surfaces

| Surface | Path | Who uses it |
| --- | --- | --- |
| Home | `/` | Landing and Get Started |
| Tournament Organizer | `/tournament` | TO — roster, bracket, floor clock, staff, export |
| Production Control | `/production` | Stream op — featured match, overlays, look |
| Judge tablet | `/{game}/tablet` · Match 2: `/{game}/2/tablet` | Floor judge for that table |
| Player tablet | `/{game}/tablet?role=player` | Commander or Lorcana table pad |
| Walk-up signup | `/{game}/signup` | Players at the door |
| VGC team-list print | `/print/team-list` | Official 2-page Play! Pokémon form |
| Overlay index | `/overlay` | Browser-source list |
| Floor clock | `/{game}/overlay/floor-clock` | Room monitor |

Header on Production / Tournament: **Home · Production · Tournament**. Feedback goes to the [ROK Desk form](https://forms.gle/Re5mt8RXU7qNEN8W9).

---

## Dual matches (TCG)

Every TCG title has **Match 1** and **Match 2**. VGC stays a single featured match.

On Production, **Match 1 | Match 2** sits under the game chips. Each slot has its own players, scores, clock, winners, card spotlight, and tablets. Switching slots (or games) keeps the other table.

| | Match 1 (A) | Match 2 (B) |
| --- | --- | --- |
| Scorebug | `/{game}/overlay/scorebug` | `/{game}/2/overlay/scorebug` |
| Judge tablet | `/{game}/tablet` | `/{game}/2/tablet` |
| Player tablet | `/{game}/tablet?role=player` | `/{game}/2/tablet?role=player` |

**Floor clock** and **bracket** stay per-game (`/{game}/overlay/floor-clock`, `/{game}/overlay/bracket`) — one tournament overlay for the room, not a copy per table.

From Tournament **Stream match**, send a ready pairing to **Match 1 · A** or **Match 2 · B**. Each on-air card has **Remove from stream** if it was sent by mistake. That unassigns the pairing and clears that slot’s names on Production.

---

## Tournament Organizer

`/tournament` is the event of record.

**Event setup**
- Show name, game, format (including Pre-release on every title)
- Bracket type: single elim, double elim, Swiss
- Size: 4 / 8 / 16 / 32 or **Custom** 2–128. Elim brackets pad to the next power of two with byes
- Best-of for the event
- **Test mode** — 8 demo players. Off restores the last real field

**Roster**
- Per-game. Switching titles does not share players
- Name, handle, country, pronouns, deck / commander / extra
- Organized-play **Player ID** (Play! Pokémon, Bandai TCG+, KONAMI, PlayMTG, PlayHub, SWU-Stats, Riot ID) with a required privacy checkbox. IDs stay on the roster and export, never on stream
- Lorcana: deck plus up to two official inks
- Commander / cEDH / Duel Commander: commander field
- VGC: full team sheet (species, Tera, ability, item, four moves)

**Pairings & results**
- Generate bracket or pair the next Swiss round
- Report winners and game scores from the match cards
- Swiss standings with OMW%. Complete the event without a grand final; 1st is standings. **Reopen** if a result still needs a fix
- Champion / Top 3 on the result card

**Stream**
- Ready pairings list with send-to-Match 1 / Match 2 (TCG) or a single Send (VGC)
- Remove from stream per slot
- Judge / player tablet links for the right table

**Room**
- Independent **floor clock** — start, pause, add/remove time, reset, or type a time. Opens full-screen for a monitor
- Event logo and rotating sponsors also show on that clock

**Staff & archive**
- Staff roles: Head Judge, Judge, Feature Match Judge, Producer, Scorekeeper, Staff, Other — archive only
- **Export tournament** — zip of JSON plus CSVs (players, matches, standings, staff, VGC teams), including in test mode
- VGC **print team list** — two pages per player in the Play! Pokémon VG team-list layout (staff page with stats, opponent page without)

---

## Production Control

`/production` is the featured table(s).

**Live match**
- Names, handles, countries, pronouns, deck / commander / extra
- Game score (best-of diamonds or count)
- Title resource: prizes, remaining Pokémon, LP, life, lore, base HP, points
- **Game win** — awards a game, resets resources for the next game
- **Match win** — awards a game *and* the match, reports into the live bracket when the pair is linked
- **Swap**, **Reset game** (resources only), **Reset match** (resources + games), **Reset info** (wipe players, decks, W/L/D, teams, spotlight; keep event / format / timer)
- Card search under the live match (same catalogs as the judge tablet): search, **Show on stream** (red while live), **Clear**. Empty card overlay stays fully transparent
- Lorcana inks and W/L/D on the player cards
- SWU initiative toggle
- PTCG prize count 6 / 4 / 3 / 2 / 1

**Stream clock**
- Starts at `00:00`. Type a time, start / pause, + / − while running or paused, reset
- Independent from the Tournament floor clock. Judge tablets follow **this** clock so the feature table can start late

**Show control**
- Hold slates: Starting soon / BRB / Thanks / Tech (hidden = fully transparent)
- Lower third: player, caster, or custom
- Casters (play-by-play and color)
- Up-next queue
- Scorebug style (bar / split / **ROK Layout** where the title supports it)
- Arrange widgets on the HUD pack; undo / redo / default look
- Per-overlay **look editor** — colors, fonts, scale. Saves per source, not globally. Instructions for saving sit on the editor
- OBS and vMix setup notes (browser sources as a dropdown)

**Branding**
- Event logo — Versus, slates, HUD, Event logo overlay, floor clock
- Sponsors — rotating logos on Sponsors overlay, HUD, and floor clock

**Test mode** matches Tournament: 8 demo players, toggle off restores the real field, tablets see the same data.

---

## Tablets

Open from Production or Tournament so the URL is pinned to that **game and match slot**. `/tablet` redirects to the current Production title.

### Judge tablet

How-to guide on first open. Start / pause / add or remove time / reset the **stream clock**. Game / Match report to the desk and, when linked, the bracket.

| Game | Pad | Lookup |
| --- | --- | --- |
| VGC | Remaining Pokémon from the team sheet (tap to KO) | — |
| PTCG | Prize balls | TCGdex — Show on stream / Clear |
| MTG | Life, poison, commander damage (type a delta then + / −) | Scryfall |
| SWU | Base HP, initiative | SWU-DB |
| YGO | 8000 LP, typed ticks | YGOPRODeck |
| OP | Life circles, DON!! | Official English cards |
| Lorcana | Lore 0–20 | Lorcast |
| Riftbound | Points 1–8 | Riftcodex |

Card overlay: **On Stream** is red while a card is up. With nothing selected the source is transparent.

### Player tablet

`/{game}/tablet?role=player` — face-out pad for the table.

- **MTG Commander / cEDH / Duel Commander** — life, poison, commander damage
- **Lorcana** — split lore pads, +8 / −8 chips, game diamonds plus large **+ / −** for games, match clock

---

## Walk-up signup

`/{game}/signup` is a kiosk for the door. Fields follow the game:

- Name, handle, country, pronouns
- Deck / leader / commander when that format needs it
- Lorcana inks (up to two)
- VGC official-style team (six Pokémon: species, types, Tera, ability, item, four moves) — the sheet scrolls
- Player ID + privacy checkbox

Players land on that game’s Tournament roster. Account sign-in is off until multi-user hosting ships.

---

## Overlays

Add as OBS or vMix **Browser** sources: **1920×1080**, **transparent**, no custom CSS. Prefer the **per-game** URL so two titles never share a bug. For a second TCG table, use the `/2/` path.

| Source | Match 1 | Match 2 (TCG) |
| --- | --- | --- |
| HUD pack | `/{game}/overlay/hud` | `/{game}/2/overlay/hud` |
| Scorebug | `/{game}/overlay/scorebug` | `/{game}/2/overlay/scorebug` |
| Versus | `/{game}/overlay/versus` | `/{game}/2/overlay/versus` |
| Hold slate | `/{game}/overlay/slate` | `/{game}/2/overlay/slate` |
| Casters | `/{game}/overlay/casters` | `/{game}/2/overlay/casters` |
| Lower third | `/{game}/overlay/lower-third` | `/{game}/2/overlay/lower-third` |
| Match win | `/{game}/overlay/winner` | `/{game}/2/overlay/winner` |
| Game win | `/{game}/overlay/game-win` | `/{game}/2/overlay/game-win` |
| Round clock | `/{game}/overlay/timer` | `/{game}/2/overlay/timer` |
| Resource plates | `/{game}/overlay/resource` | `/{game}/2/overlay/resource` |
| Up next | `/{game}/overlay/upcoming` | `/{game}/2/overlay/upcoming` |
| Card | `/{game}/overlay/card` | `/{game}/2/overlay/card` |
| Sponsors | `/{game}/overlay/sponsors` | `/{game}/2/overlay/sponsors` |
| Event logo | `/{game}/overlay/event-logo` | `/{game}/2/overlay/event-logo` |
| VGC roster | `/{game}/overlay/roster` | — |
| Bracket | `/{game}/overlay/bracket` | per game, not per table |
| Floor clock | `/{game}/overlay/floor-clock` | per game, not per table |

Slugs: `vgc`, `ptcg`, `op`, `ygo`, `mtg`, `lorcana`, `swu`, `rb`.

**ROK Layout** (scorebug style) is the camera-well broadcast frame: player name, W/L/D, game diamonds for the event best-of, vertical resource (lore / prizes / life), official card back (or a judged card when shown on stream). Lorcana also shows up to two inks. MTG constructed, YGO, PTCG, and Riftbound have the same frame with their own card backs.

Empty card / sponsor / event-logo sources stay fully transparent.

Overlay pages are chromeless. Production and Tournament stay opaque.

---

## Clocks

There are **two timers** on purpose.

| Clock | Driven from | Shown on | Typical use |
| --- | --- | --- | --- |
| Stream clock | Production (and judge / player tablets) | Scorebug, HUD, tablet | Featured match, which often starts late |
| Floor clock | Tournament | Full-screen `/overlay/floor-clock` | The rest of the round in the room |

Both default to `00:00`. Type the round length, then start. Add or remove time while running or paused. Reset returns to `00:00` (stream) or the last typed floor time.

---

## Hosting model

This build is a **local desk** (TSH-style): one process, one event, devices on the LAN.

- One PC can run **two TCG feature tables** plus the floor clock
- Overlay URLs are scoped by **game** and **match slot**, so two OBS machines pulling scorebugs from the same host do not mix tables
- Two titles in one venue (PTCG streamed on one PC, Commander on another) = **two hosts**
- Login / multi-account isolation is not in this beta. Do not share one running instance across unrelated organizers

Local persistence uses PGLite. Set a Postgres URL if you deploy. Production build is Vercel-ready (`nitro` preset).

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
```

---

## Changelog

### v1.0.0-beta — 20 Aug 2026 · dual matches

Two live TCG tables on one host, plus the production/TO polish that landed after v0.3.

**Added**
- Match 1 / Match 2 on Production for every TCG title (not VGC), with slot-scoped overlay and tablet URLs
- Tournament send targets Match 1 (A) / Match 2 (B), and **Remove from stream**
- Production **Reset info**
- Production card search under Live Match
- Lorcana player tablet **+ / −** for game count
- ROK Layout scorebugs for MTG constructed, YGO, PTCG, and Riftbound

**Changed**
- Match win also awards a game win (no double-count if Game was already punched)
- Reset restores starting life for YGO (8000) and MTG (20 / 40 Commander), not the cap
- Lorcana lore resets to 0
- Overlay preview / tablet copy URLs follow the selected match slot

### HOTFIX — 20 Aug 2026 · Lorcana lore reset

Reset Match / Reset Game on Lorcana sets lore to 0. Prize-style remaining (PTCG, VGC) still reset to the match cap.

### v0.3.0 — 18 Aug 2026 · Lorcana

ROK Layout for Lorcana (camera wells, inks, W/L/D, lore ladder, game diamonds, official card back), player tablet, ink picker on Production / roster / signup.

### HOTFIX — 18 Aug 2026 · VGC signup & team list

VGC walk-up sign-up scrolls. Printed VG team list matches the Play! Pokémon two-page form.

### HOTFIX — 17 Aug 2026 · player tablet

MTG player tablet restored for Commander / cEDH / Duel Commander. PTCG card lookup loads TCGdex art.

### HOTFIX — 17 Aug 2026

Test mode stays on after you turn it on (demo cleanup no longer flips it off on refresh).

### v0.2.2 — 17 Aug 2026

Lorcana judge tablet and Lorcast card search.

### v0.2.1 — 17 Aug 2026

Riftbound on the desk. Per-game tablet URLs. Judge tablet stays with its event.

### v0.2.0 — 17 Aug 2026 · tournament ops

Landing, player IDs, staff list, export, complete/reopen Swiss, Pre-release formats, Production at `/production`.

### v0.1.0 — 17 Aug 2026 · first beta

Production, Tournament, judge tablets, walk-up signup, per-game overlays, stream vs floor clocks, overlay look, sponsors, test mode.

This build is **v1.0.0-beta**. Dual-match is the 1.0 feature cut; expect polish.
