# ROK Desk

**v0.3.0 beta** — landing and Swiss close. Broadcast production desk for ROK Esports.

One control app drives tournament operations and 1920×1080 browser-source overlays for Pokémon VGC, Pokémon TCG, One Piece, Yu-Gi-Oh!, Magic: The Gathering (constructed and Commander), Lorcana, Flesh and Blood, Star Wars Unlimited, Union Arena, and generic tabletop.

Versioning while the desk is in beta: **v0.MAJOR.PATCH**  
`MAJOR` is a development milestone. `PATCH` is a fix or small follow-up inside that milestone.

Overlays are **per event**. Use `/{game}/overlay/{source}` (for example `/ptcg/overlay/scorebug` and `/vgc/overlay/scorebug`) so two streams on the same host do not mix bugs.

---

## Updates

### v0.3.0 — 17 Aug 2026 · landing & Swiss close

Home screen, a real Swiss finish, and format cleanup so a TO can open the desk and close a Swiss event.

#### Added
- **Home / Get Started** landing at `/` — what the desk is, how a show runs, doors into Tournament and Production
- **Complete tournament** — lock Swiss (and any event) without a grand final; 1st is standings (points / OMW%). Top 3 on the result card. **Reopen** if you still need to fix a result
- **Pre-release** format on every title (OP keeps Pre-release / Sealed). PTCG 4 prizes, FaB 20 life, MTG sealed Bo1
- Tournament export as a **single zip** (JSON + CSVs), including in test mode

#### Changed
- Production Control lives at `/production`. Header: Home · Production · Tournament
- One Piece defaults to **Bo1**. Formats: Standard, Extra (all cards), Pre-release / Sealed, Championship top cut (Bo3)
- Swiss overlay says Champion after the event is complete (Leader while it is running)
- Export button is always available, not only after a match winner

### v0.2.1 — 17 Aug 2026 · patch

#### Added
- Per-event **staff list** on Tournament Control — Head Judge, Judge, Feature Match Judge, Producer, Scorekeeper, Staff, Other
- Staff rides with the game’s event (not shared across titles) and is archive-only — not shown on stream
- **Export tournament** now includes a staff CSV and staff names in the JSON archive

### v0.2.0 — 17 Aug 2026 · tournament ops

Signup IDs, privacy consent, and a full event export so a TO can close a show with the paper trail.

#### Added
- Per-game **Player ID** on walk-up signup and the Tournament roster (Play! Pokémon, Bandai TCG+, KONAMI, PlayMTG, PlayHub, GEM, SWU-Stats / OP)
- **Player ID privacy** notice and required checkbox when an ID is entered — staff roster only, never on stream, publisher policy link, guardian note for minors
- **Export tournament** — JSON archive plus CSVs for players, matches, standings, and VGC teams (header, Event card, Champion card)

#### Changed
- Official VGC team list and TO roster show the Play! Pokémon ID label
- Standings list the player ID under the name for staff checks

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
| Judge tablet | `/tablet` | Floor device for the featured match |
| Walk-up signup | `/{game}/signup` | In-person player check-in for that game |
| VGC team-list print | `/print/team-list` | Official 2-page Play! Pokémon VG team list |
| Overlay index | `/overlay` | Browser-source list |

## Production

- Featured match: names, score, resources (prizes / remaining Pokémon / life / base HP), casters, queue
- **Game win** and **Match win** — match win also reports into the live bracket when the pair is linked
- Independent **stream clock** (Production) vs **floor clock** (Tournament). Judge tablets follow the stream clock
- **PTCG prizes** — 6 / 4 / 3 / 2 / 1 per match (Pocket format still defaults to 3)
- **VGC team** on the scorebug uses the player's submitted team
- **SWU initiative** on the scorebug when a player is marked
- **Test mode** toggle — 8 demo players. Off restores the last real field. Production and Tournament stay in sync with the judge tablet
- **Sponsors** — upload marks; they rotate on the Sponsors overlay, HUD pack, and floor clock
- **Event logo** — tournament mark on Versus, slates, HUD, Event logo overlay, and the floor clock
- Per-overlay **look** (colors, fonts, scale) and **Arrange** (drag, undo/redo, reset)
- OBS and vMix setup notes live on the overlay preview

## Tournament

- Single elim, double elim, and Swiss (pairings, standings, OMW%)
- Size presets 4 / 8 / 16 / 32 plus **Custom** (2–128). Elim brackets pad to the next power of two with byes
- Per-game roster — switching titles does not share players
- Send a match to stream from the bracket
- Per-event **staff list** — Head Judge, judges, feature match judges, producer, scorekeeper, staff (archive only, not on stream)
- VGC official team-list export (2 pages per player)
- **Export tournament** — JSON archive plus CSVs (players, matches, standings, staff, VGC teams). Includes player IDs; keep it with event staff.
- Commander / cEDH / Duel Commander signup asks for commander

## Judge tablet

Open `/tablet` on a floor device. It follows the Production game.

- **VGC** — remaining Pokémon from the player's team, game / match report, clock
- **PTCG** — prize balls, game / match report, clock, **TCGdex card search** with Show on stream / Clear (On Stream is red; empty card overlay stays transparent)
- **MTG** (all formats) — life, poison, commander damage with typed deltas, clock, **Scryfall card search** with the same Show / Clear flow
- **SWU** — base HP, initiative, game / match report, clock, **SWU-DB card search**
- **YGO** — 8000 LP with typed ticks, game / match report, clock, **YGOPRODeck card search**
- **OP** — life circles, DON!!, game / match report, clock, official English card search
- How-to guide on open, plus a card-search how-to next to lookup
- Start / pause / add or remove time / reset clock (stream clock)

## Signup

Walk-up kiosk at `/{game}/signup`. Fields follow the game (VGC team sheet, PTCG deck, MTG commander when needed) plus the organized-play **Player ID** for that title (Play! Pokémon, Bandai TCG+, KONAMI, PlayMTG, GEM, PlayHub, SWU-Stats). Entering an ID requires a privacy checkbox: IDs stay on this event roster, never on stream. Each field links the publisher’s official policy. Sign-in is off until accounts land.

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

Game slugs: `vgc`, `ptcg`, `one-piece`, `yugioh`, `mtg`, `lorcana`, `fab`, `swu`, `union-arena`, `generic`.

Empty card / sponsor / event-logo sources stay fully transparent.

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
