# ROK Gameplay Scoreboard (compact v2): variants A and B
A 1920x1080 transparent OBS Browser Source. Its size and placement follow the existing ROK Desk Smash overlay, restyled in ROK red and charcoal.

## Camera wells (fully transparent; put the camera sources UNDER this source)
| cam | x | y | w | h |
|---|---|---|---|---|
| P1 cam (bottom-left)  | 28   | 862 | 336 | 189 |
| P2 cam (bottom-right) | 1556 | 862 | 336 | 189 |
The red borders sit just outside each well (4px, plus white corner accents).

## Layout
- **Top bar:** y 40-88. P1 spans x 410-910, the ROK logo sits at center x 960, and P2 spans x 1005-1505. Each side has an icon (`photoUrl`, or a helmet coin if there's none), the tag and name, and a score box. Chips above each name show country, seed and X handle when ROK Desk sends them.
- **Top-left:** a `roundName` label, with an `eventPhase` chip under it. It covers the in-game music title, as in the reference.
- **Top-right** (the in-game timer) and **bottom-center** (the game HUD, x 400-1500) are left clear.
- **Sponsors:** a small plate above the P1 cam at x 24-368, y 806-850, rotating the `sponsors[]` logos and names every `## Files
Two top-bar variants. They share the same footprint, cam wells, sponsor plate and data handling.
- `ROK_Gameplay_Scoreboard_A.html`: clean compact bar (white score boxes, center trapezoid wider at the bottom).
- `ROK_Gameplay_Scoreboard_B.html`: the original big scoreboard's look, scaled down (red score boxes, dark-red end caps, center trapezoid narrower at the bottom, like the original).
- In both, P2 is an exact mirror of P1 about x=960. Each element is a 48px parallelogram (slant 16px) with 4px gaps.
- `*_Frame.png`: static frames. `*_preview.png`: demo over the Smash shot. `*_topbar_2x.png`: 2x zoom of the top bar.
- `ROK_Gameplay_Scoreboard_preview_vs_reference.png`: the earlier layout over the old overlay, for scale.
- `assets/`: keep it next to the HTML.

ext to the HTML.

## Data / params
Polls `GET {api}/api/desk?game=&slot=` every 400 ms (`no-store`) and only re-renders when `version` changes. If a fetch fails, it keeps the last state.
Params: `game` (vgc), `slot` (1), `api`, `demo=1`, `frame=1`, `p1`, `p2`, `s1`, `s2`, `bo`, `round`.
Reads the optional player fields `seed` and `handle` alongside name, tag, country and photoUrl.
The score pulses when it changes. `gameWinnerSide` flashes that player's plate and cam border. `winnerSide` highlights the winner in red.
Serve it from ROK Desk (for example under `/{game}/overlay/gameplay`) to avoid CORS, or run it from a `file:///...?demo=1` URL.
