# ROK Desk

Broadcast production desk for ROK Esports. One control app drives tournament operations and 1920×1080 browser-source overlays for Pokémon VGC, Pokémon TCG, One Piece, Yu-Gi-Oh!, Magic: The Gathering (constructed and Commander), Lorcana, Flesh and Blood, Star Wars Unlimited, Union Arena, and generic tabletop.

Overlays are **per event**. Use `/{game}/overlay/{source}` (for example `/ptcg/overlay/scorebug` and `/vgc/overlay/scorebug`) so two streams on the same host do not mix bugs.

## Surfaces

| Surface | Path | Role |
| --- | --- | --- |
| Production | `/` | Featured match, scorebug, casters, overlays, look, arrange |
| Tournament | `/tournament` | Roster, bracket, floor clock, team sheets, signup links |
| Judge tablet | `/tablet` | Floor device for the featured match |
| Walk-up signup | `/{game}/signup` | In-person player check-in for that game |
| VGC team-list print | `/print/team-list` | Official 2-page Play! Pokémon VG team list |
| Overlay index | `/overlay` | Browser-source list |

## Production

- Featured match: names, score, resources (prizes / remaining Pokémon / life), casters, queue
- **Game win** and **Match win** — match win also reports into the live bracket when the pair is linked
- Independent **stream clock** (Production) vs **floor clock** (Tournament). Judge tablets follow the stream clock
- **PTCG prizes** — 6 / 4 / 3 / 2 / 1 per match (Pocket format still defaults to 3)
- **VGC team** on the scorebug uses the player's submitted team
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
- VGC official team-list export (2 pages per player)
- Commander / cEDH / Duel Commander signup asks for commander

## Judge tablet

Open `/tablet` on a floor device. It follows the Production game.

- **VGC** — remaining Pokémon from the player's team, game / match report, clock
- **PTCG** — prize balls, game / match report, clock, **TCGdex card search** with Show on stream / Clear (On Stream is red; empty card overlay stays transparent)
- **MTG** (all formats) — life, poison, commander damage with typed deltas, clock, **Scryfall card search** with the same Show / Clear flow
- How-to guide on open, plus a card-search how-to next to lookup
- Start / pause / add or remove time / reset clock (stream clock)

## Signup

Walk-up kiosk at `/{game}/signup`. Fields follow the game (VGC team sheet, PTCG deck, MTG commander when needed). Sign-in is off until accounts land.

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
