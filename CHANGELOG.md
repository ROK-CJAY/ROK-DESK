# Changelog

All notable changes to **ROK Desk** are listed here.

The project follows [Semantic Versioning](https://semver.org/) while in beta (`x.y.z-beta`). Desktop installers attach to the matching GitHub [release](https://github.com/ROK-CJAY/ROK-DESK/releases).

## Unreleased

Not tagged. Use the build on `main` until the next beta.

### Fixed

- **TOM Game Type** — PTCG only imports Trading Card Game reports. VGC only imports Video Game. Pokémon GO is skipped. The tournament list tags TCG / VG from the report or TDF `gametype`.

## v1.2.11-beta — 2026-09-04

Hotfix. Seniors and Juniors can watch a TOM folder. Tournament picker always shows. VG cup reports stay on VGC.

### Fixed

- **TOM folder watch** — Seniors and Juniors can pick a reports folder (Chromium id length). The tournament dropdown always shows while watching. VG cup reports land on VGC, TCG reports on PTCG; watching the same TOM_DATA folder no longer copies one roster onto every title.

## v1.2.10-beta — 2026-09-04

TOM reports watch no longer duplicates players or imports the event title as a player. Pick which tournament to pull while watching a folder.

### Fixed

- **TOM reports watch** — pairings that print `Name (W/L/T (pts) - MA)` no longer add a second copy of that player. The event title is not imported as a player. While watching a folder, pick which tournament to pull if more than one report set is in that tree. TOM only writes HTML for the event that is open.

## v1.2.9-beta — 2026-09-02

Play! Pokémon age divisions. Official PDFs. TOM companion. PTCG lookup stays on the right game and age division.

### Added

- **Official Play! Pokémon PDFs** — PTCG and VGC roster printers keep the in-app sheets and add **Official PDF**, which fills the published Play! Pokémon deck list / VGC team list from sign-up data. Age division follows the event (Masters / Seniors / Juniors). Form templates are bundled with the app so filling does not depend on `public/` files on disk.

- **Play! Pokémon age divisions** — PTCG and VGC each run **Masters, Seniors, and Juniors** as three concurrent events on one host. Tournament Control picks the division (chips + player counts). Production shows **PTCG** or **VGC**, then Masters / Seniors / Juniors, each with Stream / Floor 1 / Floor 2. Walk-up kiosks: `/ptcg/signup`, `/ptcg-seniors/signup`, `/ptcg-juniors/signup`, `/vgc/signup`, `/vgc-seniors/signup`, `/vgc-juniors/signup` (age division locked). Overlay / tablet URLs follow the same slugs. TOM is PTCG | VGC, then Masters / Seniors / Juniors, with a separate folder watch per event. A TDF named for a division lands on that title.

- **PTCG Limitless / PTCGL deck import** — when a decklist is required (or on the roster editor), paste PTCGL export, Limitless Copy as Text, a public Limitless deck URL, or a **my.limitlesstcg.com/shared/…** link. `{P}` / `{R}` energy glyphs expand to Psychic / Fire. Matching requires the printed name (or set + number on shared lists). Unmatched lines stay listed for the ROK Desk search builder.
- **PTCG deck-list print** — Tournament roster printer and **Print all lists** fill the Play! Pokémon 8.5×11 TCG deck list (player name / ID / DOB, age division, Standard or Expanded, Pokémon with set + collector number, Trainer, Energy, 60-card total).
- **TOM companion (PTCG and VGC)** — Tournament Control has a TOM card. Pick PTCG or VGC, then:
  - Sign up in Desk and **Export TDF** (TOM File → Open). PTCG writes `TRADING_CARD_GAME`; VGC writes `VIDEO_GAME` plus in-game trainer names. Organizer name, Player ID, city, state, country, start date go on the card. Players without a Player ID are skipped.
  - Drop a `.tdf` to load that roster onto the matching title.
  - Drop TOM `roster.html` / `pairings.html` / `standings.html` (from `TOM_DATA/data/reports`) to fill tables and send a match to stream.
  - **Watch TOM reports folder** (Chrome, Edge, or ROK Desk desktop) — pick `TOM_DATA` or `data/reports` once per title. Desk pulls the newest pairings / standings when TOM writes them. Drop files if folder watch is unavailable.
  - PTCG and VGC TOM cards are separate: organizer, TDF, reports, and folder watch do not copy across titles.
  - **Load sample** / **Clear sample** (or **Clear TOM tables** / **Clear roster**).
  - TOM stays the official book. Desk does not write match results back.
  - PTCG and VGC each have three TOM cards (Masters / Seniors / Juniors). Drop a TDF whose event name includes a division to land on that title.

### Changed

- **PTCG deck import** — `my.limitlesstcg.com/shared/…` works with or without `https://`. Limitless printed codes map to catalog sets (`PBL` → Pitch Black, `POR` → Perfect Order, `CRI` → Chaos Rising, `MEE` → Mega Evolution Energy). Named PTCGL lines keep the **card name** when the collector number is from another print (`Charmander PAF 26` stays Charmander, not Xatu). Parenthetical catalog names (`Boss's Orders (Ghetsis)`) still match. Art uses PNG/WebP via the card proxy (Limitless scans when needed), not AVIF.
- **Layout look** — Overlay preview Look drives Play Layout, ROK Layout, Versus, HUD, and bar/split scorebugs. Each title keeps its own look. **Apply to all** copies it onto every overlay of that game.
- **Game win / Match win look** — Overlay preview → Game win or Match win: name color, kicker color, fonts, size, and tracking apply on the dedicated source and on HUD pack.

### Fixed

- **PTCG card lookup / submitted lists** — catalog search stays local and fast. Live is Standard (regulation H+) only; All printings is every set. Tapping a sign-up list card fills HP, attacks, abilities, and trainer text from the catalog (the same path as search). Sending a match to stream keeps P1 and P2 lists separate so P2 Pokémon are not replaced by Energy. Printed codes such as BRS / PBL / TWM map onto the matching catalog print.
- Official Play! Pokémon PDFs — VGC species names sit after the **Pokémon** label, stat numbers sit in the boxes, and the age **X** is in the checkbox to the **right** of Juniors / Seniors / Masters (event division, not a stale player field). PTCG rows sit on the printed lines, and H/I/J marks go in the checkboxes above the letters.
- PTCG Limitless import — a stalled import no longer shows a raw JSON / `<!DOCTYPE` error; unmatched cards skip the slow TCGdex wait and resolve in parallel. Trainer pages such as Night Stretcher and Lana's Aid keep **Trainer**. HTML names decode (`Lana&#039;s Aid` → Lana's Aid).
- PTCG card lookup no longer depends on TCGdex (currently down). Search goes catalog → pokemontcg.io (HTTP/1.1, retries, short cache) → TCGdex as a last backup. Art tries pokemontcg.io / Pokémon.com first, then TCGdex, and times out dead CDNs instead of hanging.
- PTCG deck import no longer substitutes a random Energy, an old `N` printing, Temporal Forces, or Xatu/Ralts/Miriam when the paste has a name plus a mismatched number. Shared Limitless lists (`3xi:PBL~39`) match that set and number, or they stay unmatched.
- **PTCG list isolation** — submitted PTCG decks stay on that title. Yu-Gi-Oh, MTG, Lorcana, and other tablets no longer show those lists in card lookup.
- **Age-division lists** — Seniors and Juniors tablets only show that division's submitted decks. Switching PTCG → Seniors / Juniors starts with empty seats.
- **Lorcana player tablet (extended)** — on smaller tablets, P1 and P2 seats stay visible under the clock and card lookup.

## v1.2.8-beta — 2026-08-28

Commander is its own title. Browser profiles. MTG combo stack. Arrange the overlay you picked.

### Added

- **Match deck search** — when a submitted decklist is on the table, card lookup defaults to those cards (This match / Catalog). List shows five rows, then scrolls.
- **Swiss top cut** — after Swiss rounds, cut to Top 4 / 6 / 8 / 16 / 32 or a custom size in single or double elim. Standings seed the cut.
- **Import JSON** — restore a past event from `tournament.json` (export zip or saved desk state)
- **Stream channel** — handle or URL on Event. Live badge, starting-soon slate, and floor clock show it
- Overlay preview: backdrop (slate / checker / black / playmat), title-safe guides, scorebug style on the stage. Look adds panel opacity, corners, name tracking, all-caps, ROK preset, apply-to-all
- **Pairings preview** — before Start, TO and the bracket overlay show Round 1 / the seeded tree from current seeds. Drag the roster to reshuffle. Empty field still says waiting.
- **Tiebreakers** — Swiss order is points, OMW%, GW%, OGW%. Remaining ties can be ranked with arrows; that order seeds the top cut
- **TO tiebreakers** — settle panel plus **TO ranks after points** when the math should not decide (playoff, judge call)
- **Browser session** — tabs, bookmarks, history, and settings persist when you leave Browser and come back (continue where you left off)
- **Browser profiles** — Desk by default; add named profiles with isolated bookmarks/tabs. Desktop also isolates cookies and logins per profile. Chip is an avatar + name, not a native select
- **Browser data survives uninstall** — profiles, cookies, and bookmarks live in a `ROK Desk Browser` folder outside the app install
- **MTG combo stack** — Show a card, then Layer the next one on stream. Up to 5 cards, same size as the card back; cascade only after the second card. Replace / Pop last / Clear
- **Arrange the selected overlay** — Arrange opens Casters, Clock, etc., not always the HUD pack
- **MTG vs Commander** — Constructed (`/mtg`) and Commander / cEDH (`/edh`) are separate titles with their own overlays, lanes, and tournaments. Run both on one host.

### Fixed

- Tournament name is per game. Switching titles no longer carries the last show name
- Export zip writes every CSV (event, staff, decklists, judge notes, full VGC teams) and includes other games that have a field
- Arrange grid has a right/bottom edge. Widgets clamp to the canvas so they cannot hang off the right
- Lorcana Play Layout camera wells are transparent (silver frame only). Player cams sit under them in OBS

## v1.2.7-beta — 2026-08-27

Hotfix: clock pop-outs keep their own show title.

### Fixed

- Opening a floor or featured-match clock no longer caches the first show title across other clocks, tables, and games

## v1.2.6-beta — 2026-08-26

Play Layouts for VGC, One Piece, and Lorcana. YGO player tablet. Overlay score fades.

### Added

- **Play Layout** for Yu-Gi-Oh! — table-cam overlay (rounded transparent player cams, deck type, card well, LP / games / clock bar) in ROK colors. Default YGO scorebug.
- **Show P1 / Show P2** on YGO card lookup — each Play Layout well holds its own card
- **YGO player tablet** — life points (typed ticks + −100 / −500 / −800 / −1000 / −2000), games, match clock
- Overlay scores, LP, and resource ticks fade instead of snapping (game 0→1, life, prizes)
- **VGC Versus** — split player cams, both teams beside VS, event logo in the spine (ROK mark until you upload one)
- **VGC Play Layout** (default VGC scorebug) — names, games, and W/L/D on top, both teams underneath, side cams, event logo in the spine. Sits at the top of the frame.
- **OP Play Layout** (default OP scorebug) — table cam, side player cams, life / DON!! / games, official card-back wells, sponsors bottom left, event logo bottom right
- **Show P1 / Show P2** on OP card lookup — each Play Layout well holds its own card
- **Lorcana Play Layout** (default Lorcana scorebug) — square rails, player cams, reserved ink slots, diamonds, W/L/D, lore track 20–1, official card-back wells. Phase next to round. Show P1 / Show P2

## v1.2.5-beta — 2026-08-25

Hotfix: judge and commentary tablets scroll.

### Fixed

- Judge and commentary tablets were locked to the screen height, so the board, card lookup, and notes sat below the fold with no way to reach them

## v1.2.4-beta — 2026-08-25

Hotfix: PTCG card art, lookup reset, judge board.

### Added

- PTCG judge tablet now has the full **PTCG board** card from Production (Active / bench / HP / Swap / KO / Clear)
- `/api/ptcg-art` proxy — walks TCGdex → Pokémon.com → pokemontcg.io and only returns a real 200 image

### Fixed

- Card lookup (search, selected card, on-stream spotlight) clears when you switch games in Production
- Blank PTCG card art when TCGdex had no file (SVP / MEP promos and other printings). A failed load no longer sticks on the next card

## v1.2.3-beta — 2026-08-25

Per-table match clocks. Desktop browser and overlay polling smoothness pass.

### Added

- Independent **match clock** per table — Stream / Floor 1 / Floor 2 each keep their own time, judge tablet, scorebug, and pop-out monitor
- Desktop **New window** opens a real OS browser window (offset and focused). Site popups do the same instead of replacing the current tab

### Changed

- Production clock label follows the selected table (Stream clock / Floor 1 clock / Floor 2 clock)
- Overlay clocks tick fast only while a timer is running; control-panel polling pauses when the window is in the background
- Desktop build turns on GPU rasterization and stops Windows from throttling an “occluded” window

### Fixed

- Switching Stream / Floor 1 / Floor 2 left the typed clock display stuck on the previous table
- Overlay pages re-rendered the HUD on every poll even when nothing changed

## v1.2.2-beta — 2026-08-25

Commentary pad, saved decklists, per-player judge notes, and a Production crash fix.

### Added

- **Commentary / casting tablet** (`/{game}/tablet?role=caster`) — read-only names, decks, teams, board, clock, bracket path, H2H, staff, and up-next
- **Request decklist** on Tournament setup — walk-up and roster search/add cards with qty; judge lookup lists those cards first; export writes `decklists.csv`
- **Judge notes** per player on every judge tablet (and Production) — stay with the player, show on the caster pad, export as `judge-notes.csv`
- Completing a tournament downloads the export zip
- Stream-match **full-screen clock** (`/{game}/overlay/stream-clock`) like the floor clock
- Commander / Partner **Scryfall search** on sign-up, roster, and Production
- **ROK Layout** for One Piece TCG (life pips, DON!!, official card back) — now the default OP scorebug

### Changed

- Format dropdown follows the selected game
- Overlay preview sits in a fixed 16:9 box so it cannot fight the page scrollbar

### Fixed

- Production Control crashed on open (`Maximum update depth exceeded`) — card lookup was rebuilding desk state every render
- Format staying on the previous title after a game change

## v1.2.1-beta — 2026-08-25

Graphical pass on the PTCG Play Layout and Production resource numbers.

### Changed

- Play Layout uses ROK colors (charcoal rails, silver borders, red Energy / Supporter / Retreat, gold ability labels)
- Prize balls sit horizontal, inline with the player name, on the inner edge of each rail
- Larger player name, country, and W/L/D on Play Layout
- Production life / HP / LP totals are a bit larger

## v1.3.0-beta — 2026-08-25

Three independent tables on every title, including VGC.

### Added

- **Floor Match 2** (`/{game}/3/overlay/…`, `/{game}/3/tablet`)
- VGC now has the same three tables as the TCG titles

### Changed

- Match 1 / Match 2 renamed to **Stream Match**, **Floor Match 1**, **Floor Match 2**
- Production chips: Stream · Floor 1 · Floor 2
- Tournament send / remove / tablet links follow those names
- Existing Match 2 data stays on Floor Match 1 (`/2/`)

## v1.2.0-beta — 2026-08-21

Play! Pokémon-style table-cam overlay for Pokémon TCG, plus the board tools to drive it.

### Added

- **Play Layout** scorebug (default for PTCG): full-height rails, cropped card illustrations, Active + 5 bench, prizes, W/L/D, country
- Energy / Supporter / Retreat chips (start ON; punch to turn off) on Production and the judge tablet
- Dual **Show P1 / Show P2** card overlay over that player’s bench, plus Set Active / Set Bench from card search
- Production **PTCG board** — typed HP (−10 / +10) on Active and every bench slot
- **Swap** (retreat / switch) and **KO in** (promote a benched Pokémon, remove Active) on Production and the judge tablet
- HP bars: green → orange at 30% → red at 10%
- Solid show-title · phase · round + stream clock bar, centered between the rails

### Changed

- ROK Layout remains available on PTCG; Play Layout is the default scorebug
- Overlay card images load eagerly so OBS browser sources show bench art

## v1.1.0-beta — 2026-08-21

In-app Chromium so pairings, donations, feedback, and card databases stay next to the desk.

### Added

- `/browser` and a **Browser** control next to Donate / Feedback
- Persistent session (cookies, cache, logins) in the desktop app
- Tabs, new window, bookmark bar + manager (rename / remove), history
- Chrome-style ⋮ menu: zoom, bookmarks, history, downloads, print, settings
- Settings: clear browsing data, search engine, startup, print, downloads folder
- Page zoom (saved; Ctrl/⌘ +, −, 0)

### Changed

- ROK Layout scorebug called out for Star Wars Unlimited as well as the other TCG frames

## v1.0.0-beta — 2026-08-20

Two live TCG tables on one host, plus the production/TO polish that landed after v0.3.

### Added

- Match 1 / Match 2 on Production for every TCG title (not VGC), with slot-scoped overlay and tablet URLs
- Tournament send targets Match 1 (A) / Match 2 (B), and **Remove from stream**
- Production **Reset info**
- Production card search under Live Match
- Lorcana player tablet **+ / −** for game count
- ROK Layout scorebugs for MTG constructed, YGO, PTCG, Riftbound, and SWU

### Changed

- Match win also awards a game win (no double-count if Game was already punched)
- Reset restores starting life for YGO (8000) and MTG (20 / 40 Commander), not the cap
- Lorcana lore resets to 0
- Overlay preview / tablet copy URLs follow the selected match slot

### Fixed

- Reset Match / Reset Game on Lorcana sets lore to 0. Prize-style remaining (PTCG, VGC) still reset to the match cap

## v0.3.0 — 2026-08-18

ROK Layout for Lorcana (camera wells, inks, W/L/D, lore ladder, game diamonds, official card back), player tablet, ink picker on Production / roster / signup.

### Fixed

- VGC walk-up sign-up scrolls. Printed VG team list matches the Play! Pokémon two-page form
- MTG player tablet restored for Commander / cEDH / Duel Commander
- PTCG card lookup loads TCGdex art

## v0.2.2 — 2026-08-17

Lorcana judge tablet and Lorcast card search.

### Fixed

- Test mode stays on after you turn it on (demo cleanup no longer flips it off on refresh)

## v0.2.1 — 2026-08-17

Riftbound on the desk. Per-game tablet URLs. Judge tablet stays with its event.

## v0.2.0 — 2026-08-17

Landing, player IDs, staff list, export, complete/reopen Swiss, Pre-release formats, Production at `/production`.

## v0.1.0 — 2026-08-17

First beta. Production, Tournament, judge tablets, walk-up signup, per-game overlays, stream vs floor clocks, overlay look, sponsors, test mode.
