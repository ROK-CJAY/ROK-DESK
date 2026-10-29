# ROK Desk

Broadcast production desk for [ROK Esports](https://github.com/ROK-CJAY/ROK-DESK).

ROK Desk is the control room for a live TCG / VGC / FGC event. One host machine runs the **tournament** (roster, pairings, floor clock) and the **broadcast** (scorebug, cameras, casters, look) from the same event data. Floor tablets report scores. OBS / vMix pull 1920×1080 transparent browser sources. Players check in on a walk-up kiosk.

It is built for a venue with a stream: a TO laptop, a production PC, tablets on feature tables, and a monitor showing the room clock.

ROK Desk is **free and in beta**. If it saves you a night, [donate via PayPal](https://www.paypal.com/donate/?hosted_button_id=XM6K2Y4MXJZC4). See **[License](#license)** for venue / personal-use terms.

---

## What it does

On a typical show:

1. **Tournament Organizer** (`/tournament`) names the event, picks the game and format, and takes the field — typed in, imported from walk-up sign-up, or loaded as an 8-player test roster.
2. Pairings go out as **single elim**, **double elim**, or **Swiss** (optional **top cut**). A ready pairing is **sent** onto **Stream Match**, **Floor Match 1**, or **Floor Match 2**.
3. **Production Control** (`/production`) drives the featured table: games, life / lore / prizes, the stream clock, casters, slates, and overlay look.
4. **Judge tablets** sit with the table, report Game / Match, and share **that table’s match clock**.
5. OBS / vMix key the **per-game, per-table** overlay URLs. The rest of the room watches the **floor clock**.

### Tournament side

- Bracket: single elim, double elim, Swiss with top cut (Top 4 / 6 / 8 / 16 / 32 or custom). Size 4–32 or custom 2–128; elim pads with byes
- **Preview** pairings before Start; drag the roster to reshuffle
- Swiss standings with OMW%, game-win%, opponents’ game-win%, plus a **Tiebreakers** panel. **Reopen** a result that needs a fix
- Roster per title: name, handle, country, pronouns, deck / commander, organized-play **Player ID** (never on stream), optional **decklists** (PTCGL / Limitless text or links for PTCG), Lorcana inks, Commander + Partner (Scryfall), full VGC team sheet
- Staff roles and judge notes for the archive
- **Export tournament** (zip of JSON + CSVs) and **Import JSON** to bring a past event back
- **TOM (PTCG and VGC)** — Export TDF for TOM, drop a `.tdf` roster, or **Watch TOM reports folder** so pairings / standings import as TOM writes them
- Print the VGC team list and PTCG deck list in-app, or fill the **Official PDF** from sign-up
- **Walk-up signup** kiosk at `/{game}/signup` — fields follow the game: deck / leader / commander, Lorcana inks, VGC team (six Pokémon), decklist when the TO turns on **Request decklist**, and Player ID with a privacy checkbox. PTCG / VGC kiosks lock **Masters / Seniors / Juniors** to the URL. A public sign-up link can be sent out, closed at a set date and time, and pulled back into the desk
- **FGC Tournament** — a TO logs into their own start.gg account: bracket, stations, call a set to a station or stream, call / start clocks, report scores, DQ, characters, and stage

### Broadcast side

- Live match: names, game score, title resource (prizes, remaining Pokémon, LP, life, lore, base HP, points), **Game win** / **Match win** (reports into the bracket when linked), Swap and resets
- Card search with **Show on stream**, **Show P1 / Show P2** (PTCG, YGO, OP, Lorcana), PTCG **Set Active / Bench**, MTG **Layer** for combos
- PTCG **board** — Active + five bench, HP, Energy / Supporter / Retreat, Swap / KO
- Show control: slates (Starting soon / BRB / Thanks / Tech), lower thirds, casters, up-next queue, scorebug style (bar / split / **ROK Layout** / **Play Layout** on VGC, PTCG, YGO, OP, Lorcana), per-overlay **look editor**
- Branding: event logo and rotating sponsors
- **FGC Production** — import a start.gg event or type a set in; player list, bracket tree, scoreboard with characters; start.gg ruleset presets and stage strike; TSH scoreboards, versus, bracket, top 8, and a layer editor that can import a PSD
- **Built-in browser** (`/browser`) — Chromium inside the desk for pairings, PayPal, Scryfall, Limitless, or Pokémon DB. On desktop, cookies, logins, downloads, and print persist in a **ROK Desk Browser** folder that survives an uninstall. **Profiles** (Desk, Stream, Personal, …) isolate logins, bookmarks, and tabs. Login isolation is desktop-only

### Tablets

Open from Production or Tournament so the URL is pinned to that **game and match slot**.

- **Judge** (`/{game}/tablet`) — this table’s match clock, Game / Match report, per-player judge notes, card lookup, PTCG board
- **Player** (`?role=player`) — Commander, Lorcana, YGO face-out pads. Lorcana **extended** (`?role=extended`) runs a self-run table
- **Commentary** (`?role=caster`) — read-only cheat sheet: teams / boards, bracket path, head-to-head, judge notes, staff, up next
- **Android companion** — sideload APK, fullscreen, scans the Home QR. See [android-tablet/README.md](./android-tablet/README.md)

| Game | Judge pad | Card lookup |
| --- | --- | --- |
| VGC | Remaining Pokémon from the team sheet (tap to KO) | — |
| PTCG | Prize balls, Energy / Supporter / Retreat, PTCG board | pokemontcg.io (Download catalog for offline search) |
| MTG | Life, poison, commander damage | Scryfall — Show, then Layer for a combo |
| SWU | Base HP, initiative | SWU-DB |
| YGO | 8000 LP, typed ticks | YGOPRODeck |
| OP | Life circles, DON!! | Official English cards |
| Lorcana | Lore 0–20 | Lorcast |
| Riftbound | Points 1–8 | Riftcodex |

If the pair submitted decklists, those cards sit above search so judges can pull them without retyping. Card overlay: **On Stream** is red while a card is up.

### Supported games

| Title | Slug | What the desk tracks |
| --- | --- | --- |
| Pokémon VGC · Masters / Seniors / Juniors | `vgc`, `vgc-seniors`, `vgc-juniors` | Remaining Pokémon from the team, Bo3, **Play Layout** |
| Pokémon TCG · Masters / Seniors / Juniors | `ptcg`, `ptcg-seniors`, `ptcg-juniors` | Prize cards, Bo3, **Play Layout** board |
| One Piece TCG | `op` | Life, DON!!, Bo1 by default, **Play Layout** |
| Yu-Gi-Oh! | `ygo` | 8000 LP, Bo3, **Play Layout** |
| Magic: The Gathering | `mtg` | Life, poison; Standard / Modern / Pioneer / Legacy / Pauper |
| Commander | `edh` | Life, poison, commander damage; Commander / cEDH / Duel |
| Disney Lorcana | `lorcana` | Lore 0–20, inks, W/L/D, **Play Layout** |
| Star Wars Unlimited | `swu` | Base HP, initiative |
| Riftbound | `rb` | First-to-8 points |
| FGC (start.gg) | `/fgc` (path) | Sets, stations, characters, stage strike |

Each title keeps its **own roster, bracket, desk, overlays, and tablets**. Switching games on Production does not throw away the other event’s live match.

**PTCG and VGC each run Masters, Seniors, and Juniors** as three titles on the same host — each with its own roster, kiosk, Stream / Floor 1 / Floor 2, and overlays. Tap **PTCG** or **VGC**, then **Masters / Seniors / Juniors**. Overlay URLs follow the slug (`/ptcg/overlay/…`, `/vgc-seniors/overlay/…`), and walk-up kiosks lock the age division (`/ptcg/signup`, `/vgc-juniors/signup`, …).

---

## Tables, overlays, and clocks

Every title has **three** independent tables. Floor 1 and Floor 2 add `/2/` or `/3/` to the path:

| | Stream Match | Floor Match 1 | Floor Match 2 |
| --- | --- | --- | --- |
| Scorebug | `/{game}/overlay/scorebug` | `/{game}/2/overlay/scorebug` | `/{game}/3/overlay/scorebug` |
| Judge tablet | `/{game}/tablet` | `/{game}/2/tablet` | `/{game}/3/tablet` |

From Tournament **Assigned tables**, send a ready pairing to **Stream**, **Floor 1**, or **Floor 2**. Each on-air card has **Remove** if it was sent by mistake. Each slot has its own players, scores, match clock, card spotlight, and tablets; switching slots (or games) keeps the other tables.

Add overlays as OBS or vMix **Browser** sources: **1920×1080**, **transparent**, no custom CSS. `/overlay` lists every source. Per-table sources include scorebug, HUD, versus, game win, timer, resource, up next, card, sponsors, event logo, and VGC roster. **Bracket** and **floor clock** are per game, not per table. Empty sources stay fully transparent.

**ROK Layout** is the camera-well broadcast frame: player name, W/L/D, game diamonds for the event best-of, vertical resource (lore / prizes / life), and the official card back (or a judged card when shown on stream).

**Play Layout** is the table-cam overlay in **ROK colors** (charcoal rails, silver / red accents, gold clock) with a transparent center for the overhead camera. It is the default on **VGC** (names, games, and both teams across the top), **PTCG** (Active, five bench, prizes, HP bars), **OP** (life / DON!! and a card well per player), **Lorcana** (lore track, inks, card well), and **YGO** (Feature Duelist spine, extra-deck-style card well). Put player cams under the overlay in OBS.

**Versus** (`/{game}/overlay/versus`) on VGC is the split-cam intro with both teams in the spine; other titles keep the photo / name intro.

There are **two timers** on purpose:

| Clock | Driven from | Shown on |
| --- | --- | --- |
| Stream / match clock | Production and that table’s tablets | Scorebug, HUD, tablet, `/{game}/overlay/stream-clock` |
| Floor clock | Tournament | `/{game}/overlay/floor-clock` — the rest of the room |

Both default to `00:00`. Type the round length, then start. Add or remove time while running or paused. Reset returns to `00:00` (stream) or the last typed floor time. **Open clock** lives on Production next to that table’s timer; **Open floor clock** lives on Tournament.

---

## Download

**Desktop (venues — no terminal).** Get the latest build from [ROK-DESK Releases](https://github.com/ROK-CJAY/ROK-DESK/releases):

- Windows: portable `.exe` (double-click, nothing to install) or the NSIS installer
- macOS: `.dmg` (unsigned — right-click → Open the first time)
- Linux: `.AppImage`

Run **ROK Desk**. Event data is saved on that PC under **ROK Desk** in AppData; uninstalling keeps players and tournament state. Click the version label to check for updates (Windows installer builds can apply them in-app).

Home shows **this PC** addresses. OBS on the same computer uses `http://127.0.0.1:8080/{game}/overlay/scorebug`. Tablets use the **LAN** URL on the same Wi‑Fi, or scan the **Scan onto a tablet** QR. Allow ROK Desk on **private** networks in Windows Firewall or tablets will not connect. Keep the app open while you stream — closing it stops overlays and tablets.

**Web.** [rok-desk.vercel.app](https://rok-desk.vercel.app) is the public host: the remote sign-up sheet and start.gg login. Overlays, the desk, and the show stay on the installed app.

---

## Development

```bash
npm install
npm run dev            # vite dev on 0.0.0.0:8080
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # node --test scripts/**/*.test.mjs
npm run build          # vite build + db migrations
npm run desktop        # build the desktop bundle and open it in Electron
npm run dist           # desktop installers via electron-builder (no publish)
```

Stack: TanStack Start (React 19) on Vite + Nitro, Tailwind, Kysely over PGLite (local) or Postgres, Electron for desktop. Pushing a `v*` tag runs **Actions → Desktop** to attach installers to a release.

### Environment variables

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Postgres for the web build. Unset = PGLite on disk |
| `SIGNUP_DATABASE_URL` | Separate database for the public sign-up sheet |
| `ROK_PUBLIC_HOST` | `1` = serve only the public sign-up host |
| `SIGNUP_PULL_SECRET` | Host secret a desk uses to pull a public sign-up list |
| `STARTGG_CLIENT_ID` | start.gg OAuth app |
| `STARTGG_CLIENT_SECRET` | start.gg OAuth app (stays on the public host, never in a release) |
| `STARTGG_REDIRECT_URI` | Must be exactly `https://rok-desk.vercel.app/api/startgg-oauth/callback` |
| `ROK_DATA_DIR` | Data folder (the desktop app sets this) |
| `ROK_DESKTOP` | `1` = Nitro node-server preset instead of Vercel (set by `build:desktop`) |

**start.gg login:** create an OAuth app in [start.gg developer settings](https://www.start.gg/admin/profile/developer) with the redirect URI above and set the three `STARTGG_*` variables on the Vercel project. Scopes: `user.identity`, `tournament.manager`, `tournament.reporter`.

### Project structure

- `src/routes/` — pages and API routes (`$game`, `overlay`, `fgc`, `tablet`, `signup`, `tournament`, `production`, `api/`)
- `src/components/` — desk, tournament, overlays, tablet, fgc, signup, ui
- `src/lib/` — game rules, stores, start.gg, TOM, catalogs, database
- `electron/` — desktop shell and updater
- `migrations/` — SQL migrations
- `public/` — card backs, slates, fonts, Play! Pokémon PDFs, TSH layouts
- `android-tablet/` — Android companion app

---

## Beta limitations

- One **local desk** per process: one streamed table plus two floor tables plus the floor clock per host
- Two titles worked at the same time by two TOs (PTCG on one PC, Commander on another) = **two hosts**
- Login / multi-account isolation is not in this beta. Do not share one running instance across unrelated organizers
- Builds are not code-signed yet. SmartScreen may say “unknown publisher” — use **More info → Run anyway**. macOS needs right-click → Open
- The web preview cannot embed Google in the built-in browser (sites block iframes)

---

## License

ROK Desk is provided by ROK Esports for **ROK Gaming Lounge** and for **personal, non-commercial** use.

You may run it on your own machine to organize or stream an event you are staffing. You may not sell ROK Desk, bundle it as a paid product, or use it as the licensed software of another business without written permission from ROK Esports.

ROK Desk is provided **as-is**, in beta, with no warranty. ROK Esports is not liable for lost pairings, missed matches, or broadcast downtime.

ROK Desk is not affiliated with Nintendo, The Pokémon Company, Wizards of the Coast, Ravensburger, or other game publishers.

Event data stays on this PC. If a future build sends anonymous usage stats, that will be disclosed in-app.

This copy also appears on Home and behind **License** in the desk header. It is not a substitute for legal advice.

Bundled FGC overlay templates in `public/tsh/layout/` come from [TournamentStreamHelper](https://github.com/joaorb64/TournamentStreamHelper).

---

## Changelog

Full history lives in **[CHANGELOG.md](./CHANGELOG.md)**.
