# ROK Desk

**v1.2.8-beta** — broadcast production desk for [ROK Esports](https://github.com/ROK-CJAY/ROK-DESK).

ROK Desk is the control room for a live TCG / VGC event. One host machine runs the **tournament** (roster, pairings, floor clock) and the **broadcast** (scorebug, cameras, casters, look) from the same event data. Floor iPads report scores. OBS / vMix pull 1920×1080 transparent browser sources. Players check in on a walk-up kiosk.

It is built for a venue with a stream: a TO laptop, a production PC, tablets on feature tables, and a monitor showing the room clock.

ROK Desk is **free and in beta**. If it saves you a night, [donate via PayPal](https://www.paypal.com/donate/?hosted_button_id=XM6K2Y4MXJZC4). Not affiliated with Pokémon, Wizards, Ravensburger, or the other publishers.

Version history: **[CHANGELOG.md](./CHANGELOG.md)**.

---

## What it does

On a typical show:

1. **Tournament Organizer** names the event, picks the game and format, and takes the field — typed in, imported from walk-up sign-up, or loaded as an 8-player test roster.
2. Pairings go out as **single elim**, **double elim**, or **Swiss** (optional **top cut** into single or double elim). Staff, player IDs, and VGC team sheets stay on this side for the archive — they never hit the overlay.
3. A ready pairing is **sent** onto **Stream Match**, **Floor Match 1**, or **Floor Match 2**. Production receives names, decks, inks, and teams.
4. **Production Control** drives the featured table: games, life / lore / prizes, the stream clock, casters, slates, and overlay look.
5. **Judge tablets** sit with the table. They punch Game / Match, bump the resource, search a card onto the stream, and share **that table’s match clock**. PTCG judges also run the Play Layout board (Active / bench, Energy / Supporter / Retreat, Swap / KO). A **player tablet** is available for Commander, Lorcana, and YGO.
6. OBS / vMix key the **per-game, per-table** overlay URLs. The rest of the room watches the **floor clock**, which is a separate timer from the feature match.

Two TCG (or VGC) tables plus a stream can run on **one host**. Two *titles* at once (PTCG on one side of the hall, Commander on the other) still means two hosts — each machine is one event.

---

## Titles

| Title | Slug | What the desk tracks |
| --- | --- | --- |
| Pokémon VGC | `vgc` | Remaining Pokémon from the submitted team, Bo3 games, **Play Layout** |
| Pokémon TCG | `ptcg` | Prize cards (6 / 4 / 3 / 2 / 1), Bo3, **Play Layout** board |
| One Piece TCG | `op` | Life, DON!!, Bo1 by default, **Play Layout** |
| Yu-Gi-Oh! | `ygo` | 8000 LP, Bo3, **Play Layout** |
| Magic: The Gathering | `mtg` | Life, poison; Standard / Modern / Pioneer / Legacy / Pauper |
| Commander | `edh` | Life, poison, commander damage; Commander / cEDH / Duel. Own overlays, separate from Constructed |
| Disney Lorcana | `lorcana` | Lore 0–20, inks, W/L/D, **Play Layout** |
| Star Wars Unlimited | `swu` | Base HP, initiative |
| Riftbound | `rb` | First-to-8 points |

Each title keeps its **own roster, bracket, desk, overlays, and tablets**. Switching games on Production does not throw away the other event’s live match.

---

## Surfaces

| Surface | Path | Who uses it |
| --- | --- | --- |
| Home | `/` | Landing and Get Started |
| Tournament Organizer | `/tournament` | TO — roster, bracket, floor clock, staff, export |
| Production Control | `/production` | Stream op — featured match, overlays, look |
| Judge tablet | `/{game}/tablet` · Floor 1: `/{game}/2/tablet` · Floor 2: `/{game}/3/tablet` | Floor judge for that table |
| Player tablet | `/{game}/tablet?role=player` | Commander or Lorcana table pad |
| Commentary tablet | `/{game}/tablet?role=caster` | Casters — full player info, read-only |
| Walk-up signup | `/{game}/signup` | Players at the door |
| VGC team-list print | `/print/team-list` | Official 2-page Play! Pokémon form |
| Overlay index | `/overlay` | Browser-source list |
| Floor clock | `/{game}/overlay/floor-clock` | Room monitor |
| Stream clock | `/{game}/overlay/stream-clock` | Monitor at the streamed table |
| Browser | `/browser` | In-app Chromium for pairings, downloads, card DBs |

Header on Production / Tournament: **Home · Production · Tournament**, plus **Browser · Donate · Feedback**. Feedback goes to the [ROK Desk form](https://forms.gle/Re5mt8RXU7qNEN8W9).

---

## Dual matches (tables)

Every title — including VGC — has **three** independent tables:

| | Stream Match | Floor Match 1 | Floor Match 2 |
| --- | --- | --- | --- |
| Scorebug | `/{game}/overlay/scorebug` | `/{game}/2/overlay/scorebug` | `/{game}/3/overlay/scorebug` |
| Judge tablet | `/{game}/tablet` | `/{game}/2/tablet` | `/{game}/3/tablet` |
| Player tablet | `/{game}/tablet?role=player` | `/{game}/2/tablet?role=player` | `/{game}/3/tablet?role=player` |
| Commentary tablet | `/{game}/tablet?role=caster` | `/{game}/2/tablet?role=caster` | `/{game}/3/tablet?role=caster` |

On Production, **Stream | Floor 1 | Floor 2** sits under the game chips. Each slot has its own players, scores, **match clock**, winners, card spotlight, and tablets. Switching slots (or games) keeps the other tables.

**Floor clock** and **bracket** stay per-game (`/{game}/overlay/floor-clock`, `/{game}/overlay/bracket`) — one room overlay, not a copy per table. **Match clocks** are per table (`/{game}/overlay/stream-clock`, `/{game}/2/overlay/stream-clock`, `/{game}/3/overlay/stream-clock`).

From Tournament **Assigned tables**, send a ready pairing to **Stream**, **Floor 1**, or **Floor 2**. Each on-air card has **Remove** if it was sent by mistake. That unassigns the pairing and clears that slot’s names on Production.

---

## Tournament Organizer

`/tournament` is the event of record.

**Event setup**
- Show name (per title), stream channel / handle, game, format (including Pre-release on every title)
- Bracket type: single elim, double elim, Swiss. Swiss can add a **top cut** (Top 4 / 6 / 8 / 16 / 32 or custom) in single or double elim
- Size: 4 / 8 / 16 / 32 or **Custom** 2–128. Elim brackets pad to the next power of two with byes
- Best-of for the event
- **Test mode** — 8 demo players. Off restores the last real field

**Roster**
- Per-game. Switching titles does not share players
- Name, handle, country, pronouns, deck / commander / extra
- Organized-play **Player ID** (Play! Pokémon, Bandai TCG+, KONAMI, PlayMTG, PlayHub, SWU-Stats, Riot ID) with a required privacy checkbox. IDs stay on the roster and export, never on stream
- **Decklists** (optional per event): TO toggles Request decklist; players search/add cards with qty; export includes `decklists.csv` plus a count on `players.csv`
- Lorcana: deck plus up to two official inks
- Commander / cEDH / Duel Commander: searchable commander (Scryfall) plus an optional Partner field
- VGC: full team sheet (species, Tera, ability, item, four moves)

**Pairings & results**
- **Preview** before Start: Round 1 (Swiss) or the seeded tree (elim) from current seeds. Drag the roster to reshuffle. The bracket overlay shows the same view (`Pairings · Not started`)
- Generate bracket or pair the next Swiss round. After the last Swiss round, **Start top cut** seeds the cut from standings
- Report winners and game scores from the match cards
- Swiss standings with OMW%, game-win%, opponents’ game-win%. **Tiebreakers** panel: rank remaining ties, or switch **TO ranks after points** to ignore OMW/GW. That order seeds the top cut. No cut: complete the event from standings. With a cut: the cut bracket decides the champion. **Reopen** if a result still needs a fix
- Champion / Top 3 on the result card

**Stream**
- Ready pairings list with send-to-Stream / Floor 1 / Floor 2
- Remove from stream per slot
- Judge / player tablet links for the right table

**Room**
- Independent **floor clock** — start, pause, add/remove time, reset, or type a time. Opens full-screen for a monitor
- Event logo and rotating sponsors also show on that clock

**Staff & archive**
- Staff roles: Head Judge, Judge, Feature Match Judge, Producer, Scorekeeper, Staff, Other — archive only
- **Export tournament** — zip of JSON plus CSVs (event, players, matches, standings, staff, VGC teams, decklists, judge notes). Other titles with a field go in their own folders. Completing the event also downloads this pack.
- **Import JSON** — load a `tournament.json` from that zip (or a saved desk state) to bring a past event back. Other titles on the machine stay put.
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
- Card search under the live match (same catalogs as the judge tablet): search, **Show on stream** (red while live), **Clear**. Empty card overlay stays fully transparent. PTCG, YGO, OP, and Lorcana have **Show P1 / Show P2** (card in that player’s well / over the bench). PTCG also has **Set Active** and **Set Bench 1–5**. **MTG** can **Layer** a second card on the first for a combo (same size as the card back; cascade after two+)
- PTCG **board** — Active + five bench slots, typed HP with −10 / +10, Energy / Supporter / Retreat (start ON; punch to turn off), **Swap** (retreat / switch) and **KO in** (bench becomes Active, previous Active is removed)
- Lorcana inks and W/L/D on the player cards
- SWU initiative toggle
- PTCG prize count 6 / 4 / 3 / 2 / 1

**Match clock**
- Starts at `00:00`. Type a time, start / pause, + / − while running or paused, reset
- **Stream**, **Floor 1**, and **Floor 2** each have their own timer. Judge tablets on that table follow **that** clock
- Independent from the Tournament **floor clock** (the room timer for every other table)
- **Open clock** pops a full-screen page for a monitor at that table (`/{game}/overlay/stream-clock`, `/{game}/2/overlay/stream-clock`, `/{game}/3/overlay/stream-clock`)

**Show control**
- Hold slates: Starting soon / BRB / Thanks / Tech (hidden = fully transparent)
- Lower third: player, caster, or custom
- Casters (play-by-play and color)
- Up-next queue
- Scorebug style (bar / split / **ROK Layout** where the title supports it / **Play Layout** on VGC, PTCG, YGO, OP, and Lorcana)
- Arrange widgets on the selected overlay (Casters, Clock, HUD pack, …); undo / redo / default look
- Per-overlay **look editor** — colors, fonts, scale. Saves per source, not globally. Instructions for saving sit on the editor
- OBS and vMix setup notes (browser sources as a dropdown)

**Branding**
- Event logo — Versus (VGC spine), VGC / Lorcana / OP Play Layout, slates, HUD, Event logo overlay, floor clock
- Sponsors — rotating logos on Sponsors overlay, HUD, floor clock, and OP Play Layout (bottom left)

**Test mode** matches Tournament: 8 demo players, toggle off restores the real field, tablets see the same data.

---

## Tablets

Open from Production or Tournament so the URL is pinned to that **game and match slot**. `/tablet` redirects to the current Production title.

### Judge tablet

How-to guide on first open. Start / pause / add or remove time / reset **this table’s match clock**. Game / Match report to the desk and, when linked, the bracket. Per-player **judge notes** (warnings, slow play, deck check) stay with that player for the event. PTCG judges get the same **PTCG board** card as Production (Active / bench / HP / Swap / KO / Clear).

| Game | Pad | Lookup |
| --- | --- | --- |
| VGC | Remaining Pokémon from the team sheet (tap to KO) | — |
| PTCG | Prize balls, Energy / Supporter / Retreat, full PTCG board card (Active / bench / HP / Swap / KO) | TCGdex — Show P1 / Show P2 / Clear, Set Active, Set Bench |
| MTG | Life, poison, commander damage (type a delta then + / −) | Scryfall — Show, then Layer for a combo |
| SWU | Base HP, initiative | SWU-DB |
| YGO | 8000 LP, typed ticks | YGOPRODeck — Show P1 / Show P2 / Clear |
| OP | Life circles, DON!! | Official English cards — Show P1 / Show P2 / Clear |
| Lorcana | Lore 0–20 | Lorcast — Show P1 / Show P2 / Clear |
| Riftbound | Points 1–8 | Riftcodex |

Card overlay: **On Stream** is red while a card is up. With nothing selected the source is transparent. If the pair submitted decklists, those cards sit above search so judges can pull them without retyping.

### Player tablet

`/{game}/tablet?role=player` — face-out pad for the table.

- **MTG Commander / cEDH / Duel Commander** — life, poison, commander damage
- **Lorcana** — split lore pads, +8 / −8 chips, game diamonds plus large **+ / −** for games, match clock
- **YGO** — split LP pads, typed ticks (default 100), −100 / −500 / −800 / −1000 / −2000 chips, game diamonds, match clock

### Commentary tablet

`/{game}/tablet?role=caster` — open from Production (**Commentary** card). Read-only cheat sheet for casters on that table.

- Names, handle, country, pronouns, deck / commander + partner, W/L/D, game count, resource
- VGC: six Pokémon with types, Tera, ability, item, moves (grey = KO)
- PTCG: Active, bench, HP, prizes, Energy / Supporter / Retreat
- Stream clock for that table
- Bracket path: seed, record, completed matches, this pairing, Win → / Lose → (Swiss also shows place / match points / OMW)
- Head-to-head if the seats already played in this event
- Player photo, Limitless / notes, and **judge notes** (from the floor pad; read-only here)
- Event staff (head judge, judges, producer) and the Production up-next queue

---

## Walk-up signup

`/{game}/signup` is a kiosk for the door. Fields follow the game:

- Name, handle, country, pronouns
- Deck / leader / commander when that format needs it
- Commander / cEDH / Duel Commander: Scryfall search for the commander, plus an optional Partner (or Background)
- Limitless / notes (optional season record or accomplishments)
- Decklist when the TO turns on **Request decklist** — search a card, tap to add, set quantity. Uses the same APIs as judge lookup (TCGdex, Scryfall, SWU-DB, YGOPRODeck, OP, Lorcast, Riftcodex)
- Lorcana inks (up to two)
- VGC official-style team (six Pokémon: species, types, Tera, ability, item, four moves) — the sheet scrolls
- Player ID + privacy checkbox

Players land on that game’s Tournament roster. Account sign-in is off until multi-user hosting ships.

---

## Overlays

Add as OBS or vMix **Browser** sources: **1920×1080**, **transparent**, no custom CSS. Prefer the **per-game** URL so two titles never share a bug. For a second TCG table, use the `/2/` path.

| Source | Stream | Floor 1 | Floor 2 |
| --- | --- | --- | --- |
| HUD pack | `/{game}/overlay/hud` | `/{game}/2/overlay/hud` | `/{game}/3/overlay/hud` |
| Scorebug | `/{game}/overlay/scorebug` | `/{game}/2/overlay/scorebug` | `/{game}/3/overlay/scorebug` |
| Versus | `/{game}/overlay/versus` | `/{game}/2/overlay/versus` | `/{game}/3/overlay/versus` |
| Hold slate | `/{game}/overlay/slate` | `/{game}/2/overlay/slate` | `/{game}/3/overlay/slate` |
| Casters | `/{game}/overlay/casters` | `/{game}/2/overlay/casters` | `/{game}/3/overlay/casters` |
| Lower third | `/{game}/overlay/lower-third` | `/{game}/2/overlay/lower-third` | `/{game}/3/overlay/lower-third` |
| Match win | `/{game}/overlay/winner` | `/{game}/2/overlay/winner` | `/{game}/3/overlay/winner` |
| Game win | `/{game}/overlay/game-win` | `/{game}/2/overlay/game-win` | `/{game}/3/overlay/game-win` |
| Round clock | `/{game}/overlay/timer` | `/{game}/2/overlay/timer` | `/{game}/3/overlay/timer` |
| Resource plates | `/{game}/overlay/resource` | `/{game}/2/overlay/resource` | `/{game}/3/overlay/resource` |
| Up next | `/{game}/overlay/upcoming` | `/{game}/2/overlay/upcoming` | `/{game}/3/overlay/upcoming` |
| Card | `/{game}/overlay/card` | `/{game}/2/overlay/card` | `/{game}/3/overlay/card` |
| Sponsors | `/{game}/overlay/sponsors` | `/{game}/2/overlay/sponsors` | `/{game}/3/overlay/sponsors` |
| Event logo | `/{game}/overlay/event-logo` | `/{game}/2/overlay/event-logo` | `/{game}/3/overlay/event-logo` |
| VGC roster | `/{game}/overlay/roster` | `/{game}/2/overlay/roster` | `/{game}/3/overlay/roster` |
| Bracket | `/{game}/overlay/bracket` | per game, not per table | per game, not per table |
| Floor clock | `/{game}/overlay/floor-clock` | per game, not per table | per game, not per table |
| Match clock | `/{game}/overlay/stream-clock` | `/{game}/2/overlay/stream-clock` | `/{game}/3/overlay/stream-clock` |
| Stream clock | `/{game}/overlay/stream-clock` | per game, not per table | per game, not per table |

Slugs: `vgc`, `ptcg`, `op`, `ygo`, `mtg`, `edh`, `lorcana`, `swu`, `rb`.

**ROK Layout** (scorebug style) is the camera-well broadcast frame: player name, W/L/D, game diamonds for the event best-of, vertical resource (lore / prizes / life), official card back (or a judged card when shown on stream). Lorcana also shows up to two inks. MTG constructed, YGO, PTCG, One Piece, Riftbound, and SWU have the same frame with their own card backs.

**Play Layout** is the table-cam overlay in **ROK colors** (charcoal rails, silver / red accents, gold clock). Transparent center for the overhead camera. OBS source: `/{game}/overlay/scorebug` (HUD pack is the same frame).

- **VGC** (default): top bar with **names, games, and W/L/D on top** and both teams underneath. Rounded transparent player cams on the ends (put player cams under the overlay in OBS). Event logo in the spine (ROK mark until you upload one), round under the logo. Bar / split remain available.
- **OP** (default): table cam in the middle. Side player cams (transparent wells) with names, life / DON!! / games, and a card well (official card back until **Show P1 / Show P2**). Round and clock in the top corners. **Sponsors** bottom left, **event logo** bottom right. ROK Layout remains available.
- **Lorcana** (default): square full-height rails. **Transparent player cams** (silver frame only — put player cams under the overlay in OBS), name, reserved ink slots (fill when chosen), game diamonds, W/L/D, lore track 20–1 (WIN / START), card well (official back until **Show P1 / Show P2**). Event logo + **phase · round** + clock at the top center. ROK Layout remains available.
- **PTCG** (default): full-height rails with Active illustration, five bench slots, prizes inline with the player name, W/L/D, country. Energy / Supporter / Retreat start ON. HP bars go green → orange at 30% → red at 10%. Show title · phase · round and the stream clock sit in a solid bar at the bottom center. **Show P1 / Show P2** from card search places the full card over that player’s bench.
- **YGO** (default): full-height rails with **Feature Duelist** spine, **rounded transparent player camera wells** (put player cams under the overlay in OBS), deck type, extra-deck-style card well. Top bar is games · LP · clock · LP · games. Bottom ticker is event · format · round. **Show P1 / Show P2** from card search fills that player’s well — the two wells are independent. No music / now-playing chrome. ROK Layout remains available.

**Versus** (`/{game}/overlay/versus`) on **VGC** is the split-cam intro: rounded transparent player wells, both teams in the center spine with **VS**, event logo on top (ROK mark until you upload one), names and round on cream plates. Other titles keep the photo / name intro. Put player cams under the overlay in OBS.

Empty card / sponsor / event-logo sources stay fully transparent.

Overlay pages are chromeless. Production and Tournament stay opaque.

---

## Built-in browser

`/browser` (also **Browser** next to Donate / Feedback) is a Chromium window inside the desk so TOs do not have to leave ROK Desk for pairings, PayPal, feedback, Scryfall, Limitless, or Pokémon DB.

**Desktop `.exe`** is a real browser: cookies, cache, logins, downloads, and print persist on that PC. Data is stored in a **ROK Desk Browser** folder next to (not inside) the app’s install data, so uninstalling the desk does not wipe profiles, bookmarks, or logins. Reinstall and they come back. **Profiles** (Desk by default, add Stream / Personal / etc.) isolate logins, cookies, bookmarks, and tabs. **New tab** / **New window**, back / forward, a bookmark bar (star a page; right-click to rename or remove), history, zoom, and a Chrome-style **⋮** menu. Leave Browser and come back: tabs, bookmarks, history, and the last page restore (**Continue where you left off** is the default).

**⋮ menu**
- New tab, New window
- Zoom − / 100% / + (Ctrl/⌘ +, −, 0)
- Bookmarks manager (Done to close)
- History, Downloads, Print
- Settings — profiles, privacy (clear history / cookies / cache), search engine, startup, printing, downloads

The web preview cannot embed Google (sites block iframes). It still saves bookmarks, history, open tabs, and profiles (local + desk database), and opens pages in a separate tab. Login isolation is desktop-only.

---

## Clocks

There are **two timers** on purpose.

| Clock | Driven from | Shown on | Typical use |
| --- | --- | --- | --- |
| Stream clock | Production (and judge / player tablets) | Scorebug, HUD, tablet, full-screen `/{game}/overlay/stream-clock` | Featured match, which often starts late — put this on a monitor at that table |
| Floor clock | Tournament | Full-screen `/{game}/overlay/floor-clock` | The rest of the round in the room |

Both default to `00:00`. Type the round length, then start. Add or remove time while running or paused. Reset returns to `00:00` (stream) or the last typed floor time.

**Open clock** lives on Production next to that table’s timer. **Open floor clock** lives on Tournament.

---

## Download (venues)

For stores and stream PCs — **no terminal**.

1. Download **v1.2.8-beta** from [Releases](https://github.com/ROK-CJAY/ROK-DESK/releases/tag/v1.2.8-beta) (Windows / macOS / Linux installers attach when **Actions → Desktop** finishes on that tag).
2. Pick **ROK-Desk** for your OS:
   - Windows: portable `.exe` (double-click, nothing to install) or the NSIS installer
   - macOS: `.dmg` (unsigned — right-click → Open the first time)
   - Linux: `.AppImage`
3. Run **ROK Desk**. The desk window opens. Event data is saved on that PC.
4. Home shows **this PC** addresses. OBS on the same computer uses `http://127.0.0.1:8080/{game}/overlay/scorebug`. Tablets use the **LAN** URL on the same Wi‑Fi.
5. Windows Firewall: allow ROK Desk on **private** networks or iPads will not connect.

Keep the app open while you stream. Closing it stops overlays and tablets.

SmartScreen may say “unknown publisher” until the Windows build is code-signed. Use **More info → Run anyway** for this beta.

---

## Hosting model

This build is a **local desk** (TSH-style): one process, one event, devices on the LAN.

- One PC can run **one streamed table plus two floor tables** plus the floor clock
- Overlay URLs are scoped by **game** and **match slot**, so two OBS machines pulling scorebugs from the same host do not mix tables
- Two titles in one venue (PTCG streamed on one PC, Commander on another) = **two hosts**
- Login / multi-account isolation is not in this beta. Do not share one running instance across unrelated organizers

Local persistence uses PGLite on disk in the desktop app. Set a Postgres URL if you deploy the web build. Production web build is Vercel-ready (`nitro` preset).

### From source (developers)

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
```

Desktop bundle:

```bash
npm run build:desktop
npm run dist
```

---

## Changelog

Full history lives in **[CHANGELOG.md](./CHANGELOG.md)**.

### v1.2.8-beta — 28 Aug 2026 · Commander title, browser profiles, MTG combos

**Added**
- Swiss **top cut** after Swiss rounds (Top 4 / 6 / 8 / 16 / 32 or custom, single or double elim)
- **Import JSON** to restore a past tournament from an export
- **Stream channel** (handle or URL) on Event — Live badge, starting-soon, floor clock
- **Browser profiles** (Desk by default) and a session that continues where you left off. Desktop data lives in `ROK Desk Browser` so uninstall does not wipe logins
- **MTG combo stack** — Show, then Layer (up to 5). Same size as the card back until a second card is added
- Arrange opens the overlay you picked, not always the HUD pack
- **MTG vs Commander** — Constructed and Commander are separate titles (`/mtg` vs `/edh`) with their own overlays

**Fixed**
- Tournament name is per game. Switching titles no longer carries the last show name
- Export zip includes event.csv and the rest of the roster/match/team fields; other titles with a field are in their own folders
- Arrange grid closes on the right; widgets stay on the 1920×1080 canvas
- Lorcana Play Layout camera wells are transparent

### v1.2.7-beta — 27 Aug 2026 · hotfix: clock titles

**Fixed**
- Floor and featured-match clocks (Stream, Floor 1, Floor 2) no longer keep the first show title across other clocks, tables, and games

### v1.2.6-beta — 26 Aug 2026 · Play Layouts (VGC, OP, Lorcana)

**Added**
- **Play Layout** for Yu-Gi-Oh! (now the default YGO scorebug): Feature Duelist rails, rounded transparent player camera wells, deck type, extra-deck card well, LP / games / clock bar, event ticker. No now-playing chrome. ROK Layout remains available.
- **Show P1 / Show P2** on YGO, OP, and Lorcana card lookup — each Play Layout well holds its own card
- **YGO player tablet** — life points (typed ticks + damage chips), games, match clock. Judge tablet still looks up cards and reports the match.
- Overlay scores, LP, and resource ticks fade instead of snapping (game 0→1, life, prizes)
- **VGC Versus** — split player cams, both teams beside VS, event logo in the spine (ROK mark until you upload one)
- **VGC Play Layout** (default VGC scorebug) — names / games / W/L/D on top, both teams underneath, side cams, event logo. Sits at the top of the frame.
- **OP Play Layout** (default OP scorebug) — table cam, side player cams, life / DON!! / games, official card-back wells, sponsors bottom left, event logo bottom right. Show P1 / Show P2.
- **Lorcana Play Layout** (default Lorcana scorebug) — square rails, player cams, reserved ink slots, diamonds, W/L/D, lore 20–1, card wells. Phase next to round. Show P1 / Show P2.

### v1.2.5-beta — 25 Aug 2026 · hotfix: tablet scroll

**Fixed**
- Judge and commentary tablets now scroll. The board, card lookup, and notes were clipped below the fold.

### v1.2.4-beta — 25 Aug 2026 · hotfix: PTCG art & judge board

**Added**
- PTCG judge tablet now has the full **PTCG board** card from Production (Active / bench / HP / Swap / KO / Clear)
- `/api/ptcg-art` proxy — TCGdex → Pokémon.com → pokemontcg.io, only a real image is returned

**Fixed**
- Card lookup (search, selected card, on-stream spotlight) clears when you switch games in Production
- Blank PTCG card art when TCGdex had no file (promos, some printings). A failed load no longer sticks on the next card

### v1.2.3-beta — 25 Aug 2026 · hotfix: per-table clocks

Stream, Floor 1, and Floor 2 no longer share one production timer. Desktop browser and overlay polling also get a smoothness pass.

**Added**
- Independent **match clock** per table — Stream / Floor 1 / Floor 2 each keep their own time, judge tablet, scorebug, and pop-out monitor
- Desktop **New window** opens a real OS browser window (offset and focused). Site popups do the same instead of replacing the current tab

**Changed**
- Production clock label follows the selected table (Stream clock / Floor 1 clock / Floor 2 clock)
- Overlay clocks tick fast only while a timer is running; control-panel polling pauses when the window is in the background
- Desktop build turns on GPU rasterization and stops Windows from throttling an “occluded” window

**Fixed**
- Switching Stream / Floor 1 / Floor 2 left the typed clock display stuck on the previous table
- Overlay pages re-rendered the HUD on every poll even when nothing changed

### v1.2.2-beta — 25 Aug 2026 · caster, decklists, judge notes

Ops pass: commentary pad, saved decklists, per-player judge notes, and a Production crash fix.

**Added**
- **Commentary / casting tablet** (`/{game}/tablet?role=caster`) — read-only names, decks, teams, board, clock, bracket path, H2H, staff, and up-next
- **Request decklist** on Tournament setup — walk-up and roster search/add cards with qty; judge lookup lists those cards first; export writes `decklists.csv`
- **Judge notes** per player on every judge tablet (and Production) — stay with the player, show on the caster pad, export as `judge-notes.csv`
- Completing a tournament downloads the export zip
- Stream-match **full-screen clock** (`/{game}/overlay/stream-clock`) like the floor clock
- Commander / Partner **Scryfall search** on sign-up, roster, and Production
- **ROK Layout** for One Piece TCG (life pips, DON!!, official card back) — now the default OP scorebug

**Changed**
- Format dropdown follows the selected game
- Overlay preview sits in a fixed 16:9 box so it cannot fight the page scrollbar

**Fixed**
- Production Control crashed on open (`Maximum update depth exceeded`) — card lookup was rebuilding desk state every render
- Format staying on the previous title after a game change

### v1.2.1-beta — 25 Aug 2026 · Play Layout polish

Graphical pass on the PTCG Play Layout and Production resource numbers.

**Changed**
- Play Layout uses ROK colors (charcoal rails, silver borders, red Energy / Supporter / Retreat, gold ability labels)
- Prize balls sit horizontal, inline with the player name, on the inner edge of each rail
- Larger player name, country, and W/L/D on Play Layout
- Production life / HP / LP totals are a bit larger

### v1.3.0-beta — 25 Aug 2026 · Stream / Floor tables

Three independent tables on every title, including VGC.

**Added**
- **Floor Match 2** (`/{game}/3/overlay/…`, `/{game}/3/tablet`)
- VGC now has the same three tables as the TCG titles

**Changed**
- Match 1 / Match 2 renamed to **Stream Match**, **Floor Match 1**, **Floor Match 2**
- Production chips: Stream · Floor 1 · Floor 2
- Tournament send / remove / tablet links follow those names
- Existing Match 2 data stays on Floor Match 1 (`/2/`)

### v1.2.0-beta — 21 Aug 2026 · PTCG Play Layout

Play! Pokémon-style table-cam overlay for Pokémon TCG, plus the board tools to drive it.

**Added**
- **Play Layout** scorebug (default for PTCG): full-height rails, cropped card illustrations, Active + 5 bench, prizes, W/L/D, country
- Energy / Supporter / Retreat chips (start ON; punch to turn off) on Production and the judge tablet
- Dual **Show P1 / Show P2** card overlay over that player’s bench, plus Set Active / Set Bench from card search
- Production **PTCG board** — typed HP (−10 / +10) on Active and every bench slot
- **Swap** (retreat / switch) and **KO in** (promote a benched Pokémon, remove Active) on Production and the judge tablet
- HP bars: green → orange at 30% → red at 10%
- Solid show-title · phase · round + stream clock bar, centered between the rails

**Changed**
- ROK Layout remains available on PTCG; Play Layout is the default scorebug
- Overlay card images load eagerly so OBS browser sources show bench art

### v1.1.0-beta — 21 Aug 2026 · browser

In-app Chromium so pairings, donations, feedback, and card databases stay next to the desk.

**Added**
- `/browser` and a **Browser** control next to Donate / Feedback
- Persistent session (cookies, cache, logins) in the desktop app
- Tabs, new window, bookmark bar + manager (rename / remove), history
- Chrome-style ⋮ menu: zoom, bookmarks, history, downloads, print, settings
- Settings: clear browsing data, search engine, startup, print, downloads folder
- Page zoom (saved; Ctrl/⌘ +, −, 0)

**Changed**
- ROK Layout scorebug called out for Star Wars Unlimited as well as the other TCG frames

### v1.0.0-beta — 20 Aug 2026 · dual matches

Two live TCG tables on one host, plus the production/TO polish that landed after v0.3.

**Added**
- Match 1 / Match 2 on Production for every TCG title (not VGC), with slot-scoped overlay and tablet URLs
- Tournament send targets Match 1 (A) / Match 2 (B), and **Remove from stream**
- Production **Reset info**
- Production card search under Live Match
- Lorcana player tablet **+ / −** for game count
- ROK Layout scorebugs for MTG constructed, YGO, PTCG, Riftbound, and SWU

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

This build is **v1.2.8-beta**. Dual-match is the 1.0 feature cut; the in-app browser is 1.1; Play Layout is 1.2. Expect polish.
