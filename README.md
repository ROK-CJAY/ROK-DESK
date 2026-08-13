# ROK Desk

Broadcast production desk for ROK Esports. One control app drives vMix browser-source overlays for Pokémon VGC/TCG, One Piece, Yu-Gi-Oh!, Magic: The Gathering (including Commander), Lorcana, Flesh and Blood, Star Wars Unlimited, Union Arena, and generic tabletop.

## What you get

- **Production** — scores, life/resources, casters, timer, slates, queue, hotkeys, and a live 16:9 overlay preview
- **Overlays** — transparent 1920×1080 browser sources (HUD pack, versus, slate, casters, lower third, winner, timer, resources, upcoming)
- **Arrange** — drag widgets, undo/redo, reset to the house default
- **Tournament** — single elim, double elim, and Swiss (pairings, standings, OMW%)
- **Commander** — 4-seat pod bugs plus a **tablet pod pad** (`/pod`) for life, poison, and per-opponent commander damage

## Run it

```bash
npm install
npm run dev
```

Open the app, then add these as vMix Browser inputs (1920×1080, transparent):

| Source        | Path                 |
| ------------- | -------------------- |
| HUD pack      | `/overlay/hud`       |
| Versus        | `/overlay/versus`    |
| Slate         | `/overlay/slate`     |
| Casters       | `/overlay/casters`   |
| Lower third   | `/overlay/lower-third` |
| Winner        | `/overlay/winner`    |
| Timer         | `/overlay/timer`     |
| Resources     | `/overlay/resource`  |
| Upcoming      | `/overlay/upcoming`  |
| Bracket       | `/overlay/bracket`   |

Tablet / phone life pad for Commander: `/pod`

## Scripts

```bash
npm run typecheck
npm run build
```

Production build is Vercel-ready (`nitro` preset). Local persistence uses PGLite; set a Postgres URL if you deploy.

## Notes

Overlay pages are chromeless and transparent so vMix can key them. Production and Tournament stay opaque. The pod pad is meant for a device at the table — it writes the same live desk the stream bugs read.
