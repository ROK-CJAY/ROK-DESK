# ROK Desk

**v0.3.0 beta** — Lorcana broadcast layout. Broadcast production desk for ROK Esports.

One control app drives tournament operations and 1920×1080 browser-source overlays for Pokémon VGC, Pokémon TCG, One Piece, Yu-Gi-Oh!, Magic: The Gathering (constructed and Commander), Lorcana, Star Wars Unlimited, and Riftbound.

Versioning while the desk is in beta: **v0.MAJOR.PATCH**  
`MAJOR` is a development milestone. `PATCH` is a fix or small follow-up inside that milestone.

Overlays are **per event**. Use `/{game}/overlay/{source}` (for example `/ptcg/overlay/scorebug` and `/vgc/overlay/scorebug`) so two streams on the same host do not mix bugs.

---

## Updates

### v0.3.0 — 18 Aug 2026 · Lorcana

Lorcana gets a stream layout that matches how the title is actually broadcast, plus table and signup fields to feed it.

#### Added
- **ROK Layout** — Lorcana scorebug style: camera wells, official ink emblems (up to two), W/L/D under each name, best-of-3 game diamonds, lore ladder 0–20, featured-match round, stream clock, official card back (or a judged card when shown on stream)
- **Lorcana player tablet** — table pad at `/{game}/tablet?role=player`. Split lore pads, + / − and +8 / −8 chips, game diamonds, match clock. Dark ROK Desk look
- **Ink picker** on Production, the Tournament roster, and walk-up signup (tap up to two official inks)
- W/L/D record fields on Production (live match record on the ROK Layout)

#### Changed
- Lorcana signup extra field is **Deck**; inks are their own control
- Sending a match to stream carries the player's inks onto the overlay
- Camera wells on ROK Layout are black frames for player cameras
- Round label on ROK Layout is the featured match round — no generic “ROUND” fallback

### HOTFIX — 18 Aug 2026 · VGC signup & team list

- **VGC walk-up sign-up** scrolls again. The long official team list was locked in the tablet shell (`overflow: hidden`), so Pokémon 2–6 and Submit were clipped.
- **Printed VG team list** matches the Play! Pokémon two-page form: staff page (IDs, DOB, Support ID, age division, six Pokémon with stats) and opponent page (no numeric stats). Tera type prints next to the species name.

### HOTFIX — 17 Aug 2026 · player tablet

- **MTG player tablet** is back for Commander, cEDH, and Duel Commander. Production and Tournament have **Open player tablet** — a face-out table pad for life, poison, and commander damage. The judge tablet stays for Scryfall and match report.
- **PTCG card lookup** now loads TCGdex art (`/high.webp` / `/low.webp`) instead of a broken folder URL.

### HOTFIX — 17 Aug 2026

- **Test mode** stays on after you turn it on. A leftover-demo cleanup was running on every refresh and flipping the switch back off after a second. That wipe now runs only once at boot.

### v0.2.2 — 17 Aug 2026 · patch

#### Added
- **Lorcana judge tablet** — lore 0–20 (+ / − or tap a number), Game / Match, stream clock
- **Lorcast** card search on the Lorcana pad (Show on stream / Clear). URL: `/lorcana/tablet`

### v0.2.1 — 17 Aug 2026 · patch

Riftbound on the desk, and judge tablets that stay with their event.

#### Added
- **Riftbound** — first-to-8 points, Standard / Limited Bo3, Pre-release and Bo1 Swiss, Riot ID on signup
- Riftbound **judge tablet** — point pad, Game / Match, stream clock, and **Riftcodex** card search (Show on stream / Clear)
- Per-game tablet URLs: `/{game}/tablet` (for example `/rb/tablet`). `/tablet` opens the current title, then stays there

#### Changed
- Judge tablet no longer follows Production when you switch games — score, clock, and cards write only to that event
- Title list is VGC, PTCG, One Piece, Yu-Gi-Oh!, MTG, Lorcana, SWU, and Riftbound (FaB, Union Arena, and Tabletop are off the picker for now)

### v0.2.0 — 17 Aug 2026 · tournament ops

Everything between the first beta and v0.2.1: IDs, archive, staff, landing, and Swiss close.

#### Added
- **Home / Get Started** landing at `/` — how a show runs, doors into Tournament and Production
- Per-game **Player ID** on walk-up signup and the Tournament roster, with a required privacy checkbox and publisher policy link
- Per-event **staff list** — Head Judge, Judge, Feature Match Judge, Producer, Scorekeeper, Staff, Other (archive only, not on stream)
- **Export tournament** — one zip of JSON plus CSVs (players, matches, standings, staff, VGC teams), including in test mode
- **Complete tournament** — lock Swiss (and any event) without a grand final; 1st is standings (points / OMW%). Top 3 on the result card. **Reopen** if you still need to fix a result
- **Pre-release** format on every title (OP keeps Pre-release / Sealed)

#### Changed
- Production Control lives at `/production`. Header: Home · Production · Tournament
- One Piece defaults to **Bo1**. Formats: Standard, Extra (all cards), Pre-release / Sealed, Championship top cut (Bo3)
- Swiss overlay says Champion after the event is complete (Leader while it is running)
- Official VGC team list and TO roster show the Play! Pokémon ID label
- Standings list the player ID under the name for staff checks
- Export is always available, not only after a match winner

### v0.1.0 — 17 Aug 2026 · first beta

First tagged beta. This is the desk as it stands for venue use: Production, Tournament, judge tablets, walk-up signup, and per-game overlays.

#### Added
- Judge tablets for **Star Wars Unlimited**, **Yu-Gi-Oh!**, and **One Piece TCG**, in addition to VGC, PTCG, and MTG
- **SWU initiative** — Production and the SWU tablet set who has initiative; the scorebug shows a gold Init token, name tint, side wash, and edge stripe
- Card lookup on stream for SWU (SWU-DB), YGO (YGOPRODeck), and OP (official English art + printed text)
- Per-game walk-up signup, including VGC team sheets and commander fields
- Official Play! Pokémon VGC team-list print (2 pages per player)
- Independent **stream clock** vs **floor clock**, plus a full-screen floor clock
- Per-overlay look (colors, fonts, scale) and Arrange
- Sponsors (rotating logos) and event logo on HUD, Versus, slates, and floor clock
- Test mode (8 demo players, toggle off restores the real field)
- Custom tournament size (2–128) and PTCG prize count
- Tournament feedback button (Google Form)
- OBS and vMix setup notes on overlay preview

#### Changed
- Bar scorebug type, contrast, and clock placement so names, score, and time read on 1080p
- Tablet card detail sits above the search list so art and text are visible when a card is selected
- Overlay paths are game-scoped (`/swu/overlay/scorebug`, `/yugioh/signup`, …)

#### Fixed
- OP card thumbnails and text (art is proxied; query-string image URLs no longer get a broken `.webp` suffix)
- VGC remaining icons follow the submitted team, not a left-to-right count
- Default desk starts as a reset match (0–0, no prizes taken)
- Test mode reaches the judge tablet
- Each game keeps its own roster

---

## Surfaces

| Surface | Path | Role |
| --- | --- | --- |
| Home | `/` | Landing, Get Started, doors into Production and Tournament |
| Production | `/production` | Featured match, scorebug, casters, overlays, look, arrange |
| Tournament | `/tournament` | Roster, bracket, floor clock, team sheets, signup links |
| Judge tablet | `/{game}/tablet` | Floor device for that game’s event. `/tablet` opens the current title |
| Player tablet | `/{game}/tablet?role=player` | Table pad — Commander life / Lorcana lore |
| Walk-up signup | `/{game}/signup` | In-person player check-in for that game |
| VGC team-list print | `/print/team-list` | Official 2-page Play! Pokémon VG team list |
| Overlay index | `/overlay` | Browser-source list |

## Production

- Featured match: names, score, resources (prizes / remaining Pokémon / life / lore / base HP), casters, queue
- **Game win** and **Match win** — match win also reports into the live bracket when the pair is linked
- Independent **stream clock** (Production) vs **floor clock** (Tournament). Judge tablets follow the stream clock
- **PTCG prizes** — 6 / 4 / 3 / 2 / 1 per match (Pocket format still defaults to 3)
- **VGC team** on the scorebug uses the player's submitted team
- **SWU initiative** on the scorebug when a player is marked
- **Lorcana ROK Layout** — camera wells, inks, W/L/D, lore ladder, game diamonds, official card back
- **Test mode** toggle — 8 demo players. Off restores the last real field. Production and Tournament stay in sync with the judge tablet
- **Sponsors** — upload marks; they rotate on the Sponsors overlay, HUD pack, and floor clock
- **Event logo** — tournament mark on Versus, slates, HUD, Event logo overlay, and the floor clock
- Per-overlay **look** (colors, fonts, scale) and **Arrange** (drag, undo/redo, reset)
- OBS and vMix setup notes live on the overlay preview

## Tournament

- Single elim, double elim, and Swiss (pairings, standings, OMW%)
- Size presets 4 / 8 / 16 / 32 plus **Custom** (2–128). Elim brackets pad to the next power of two with byes
- Per-game roster — switching titles does not share players
- Send a match to stream from the bracket (Lorcana inks travel with the player)
- Per-event **staff list** — Head Judge, judges, feature match judges, producer, scorekeeper, staff (archive only, not on stream)
- VGC official team-list export (2 pages per player)
- **Export tournament** — JSON archive plus CSVs (players, matches, standings, staff, VGC teams). Includes player IDs; keep it with event staff.
- Commander / cEDH / Duel Commander signup asks for commander
- Lorcana roster and signup ask for deck plus up to two inks

## Judge tablet

Open `/tablet` on a floor device. It follows the Production game.

- **VGC** — remaining Pokémon from the player's team, game / match report, clock
- **PTCG** — prize balls, game / match report, clock, **TCGdex card search** with Show on stream / Clear (On Stream is red; empty card overlay stays transparent)
- **MTG** (all formats) — life, poison, commander damage with typed deltas, clock, **Scryfall card search** with the same Show / Clear flow
- **SWU** — base HP, initiative, game / match report, clock, **SWU-DB card search**
- **YGO** — 8000 LP with typed ticks, game / match report, clock, **YGOPRODeck card search**
- **OP** — life circles, DON!!, game / match report, clock, official English card search
- **Lorcana** — lore 0–20, game / match report, clock, **Lorcast card search**
- How-to guide on open, plus a card-search how-to next to lookup
- Start / pause / add or remove time / reset clock (stream clock)

## Player tablet

Open `/{game}/tablet?role=player` (Production and Tournament have the button).

- **MTG Commander / cEDH / Duel Commander** — face-out life, poison, and commander damage
- **Lorcana** — split lore pads, game diamonds, +8 / −8 chips, streamed match clock

## Signup

Walk-up kiosk at `/{game}/signup`. Fields follow the game (VGC team sheet, PTCG deck, MTG commander when needed, Lorcana deck + inks) plus the organized-play **Player ID** for that title (Play! Pokémon, Bandai TCG+, KONAMI, PlayMTG, GEM, PlayHub, SWU-Stats). Entering an ID requires a privacy checkbox: IDs stay on this event roster, never on stream. Each field links the publisher’s official policy. Sign-in is off until accounts land.

## Overlays

Add as OBS or vMix **Browser** sources: 1920×1080, transparent, no custom CSS. Prefer the **per-game** URL.

| Source | Path |
| --- | --- |
| HUD pack | `/{game}/overlay/hud` |
| Scorebug | `/{game}/overlay/scorebug` |
| Versus | `/{game}/overlay/versus` |
| Hold slate | `/{game}/overlay/slate` |
| Casters | `/{game}/overlay/casters` |
| Lower third | `/{game}/overlay/lower-third` |
| Match win | `/{game}/overlay/winner` |
| Game win | `/{game}/overlay/game-win` |
| Round clock | `/{game}/overlay/timer` |
| Resource plates | `/{game}/overlay/resource` |
| Up next | `/{game}/overlay/upcoming` |
| Bracket | `/{game}/overlay/bracket` |
| Floor clock | `/{game}/overlay/floor-clock` |
| VGC roster | `/{game}/overlay/roster` |
| Card | `/{game}/overlay/card` |
| Sponsors | `/{game}/overlay/sponsors` |
| Event logo | `/{game}/overlay/event-logo` |

Game slugs: `vgc`, `ptcg`, `op`, `ygo`, `mtg`, `lorcana`, `swu`, `rb`.

On Lorcana, set **Scorebug style** to **ROK Layout** to get the camera / ink / lore broadcast frame. Empty card / sponsor / event-logo sources stay fully transparent.

## Run it

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
```

Production build is Vercel-ready (`nitro` preset). Local persistence uses PGLite; set a Postgres URL if you deploy.

One host PC is one event. Two titles at once means two hosts (or two accounts once login ships). Overlay paths are already game-scoped so a single host can keep PTCG and VGC bugs from colliding.

## Notes

Overlay pages are chromeless and transparent so OBS / vMix can key them. Production and Tournament stay opaque. The tablet writes the same live desk the stream bugs read. The floor clock is the rest of the room — it does not follow the featured-match timer.

This build is **beta**. Expect layout and game coverage to move under `v0.x.x` until a 1.0 cut.
