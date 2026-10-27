import { useEffect, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FgcGuideKind =
  | "home"
  | "tournament"
  | "scoreboard"
  | "roster"
  | "commentary"
  | "info"
  | "bracket"
  | "ruleset"
  | "overlays"
  | "editor"
  | "settings"
  | "assets"
  | "strike";

const STORAGE_KEY = "rok-fgc-guide";

const COPY: Record<FgcGuideKind, { kicker: string; title: string; lead: string; steps: { title: string; body: string }[] }> = {
  home: {
    kicker: "FGC control",
    title: "Two desks, one event",
    lead: "Tournament control runs the floor. Production control runs the stream. They share the event, and they do not overwrite each other.",
    steps: [
      { title: "Tournament is the TO", body: "Log in with the start.gg account that runs the event. Call sets to stations and streams, start them, and report the score." },
      { title: "Production is the stream", body: "Import the same event, pick the game, and run the scoreboard, commentators, bracket, and overlays for that stream." },
      { title: "How to sits on every screen", body: "Each tab has its own How to. Open it again any time. It only introduces itself once." },
    ],
  },
  tournament: {
    kicker: "Tournament desk",
    title: "Run the event from here",
    lead: "This replaces hopping back to start.gg for calling sets. The account you log in with only sees upcoming events it is allowed to run.",
    steps: [
      { title: "Log in with start.gg", body: "You do not paste an API token. The host already has the app. You approve your own account, then pick the event." },
      { title: "Read the bracket, then the stations", body: "The tree is the whole event. Stations sit under it. A set only shows a station or stream after it has been called. Old calls do not stay on the card." },
      { title: "Call from the set or the station", body: "Click a set for the card, or click an empty station. Send it to a station or a stream. The stream it lands on is that start.gg channel, and only that game." },
      { title: "Clocks only while it is live", body: "You get a called timer and a started timer on the set and on the station. They clear when the set is reported." },
      { title: "Report the whole game", body: "Score, characters, and the stage go back to start.gg. DQ is on the same card. The bracket updates from start.gg, so pull again if someone else reported it." },
    ],
  },
  scoreboard: {
    kicker: "Production",
    title: "One scoreboard per stream",
    lead: "Import the event once. Each game keeps its own sets. Each stream keeps its own scoreboards, so two producers can be live at the same time.",
    steps: [
      { title: "Paste the start.gg link and import", body: "A tournament link splits into a tab per game. An event link opens that game. Import again when the bracket has moved and you want a fresh copy." },
      { title: "Streams get their start.gg names", body: "Main, Stream 2, and Stream 3 stay. After import they are renamed to that event’s streams, in order. More than three streams are added. Fewer leave the spare slots as they were." },
      { title: "Add a scoreboard when a stream needs another", body: "Select the stream, then Add scoreboard. The first one cannot be removed. Any you add asks before it is deleted. The scoreboard is always open, even before a match is picked." },
      { title: "Pull any set onto this scoreboard", body: "Select set loads whatever you pick onto the scoreboard you have open. It does not care which start.gg channel that set is queued on. Stream queue lists every channel for this game." },
      { title: "Copy the link while this scoreboard is selected", body: "The overlay URL is pinned to this game and this scoreboard. OBS keeps showing it when someone else changes theirs." },
    ],
  },
  roster: {
    kicker: "Player list",
    title: "Standings for this game",
    lead: "This is the player list for the game you have open, not the whole tournament.",
    steps: [
      { title: "Load standings when you need them", body: "Load tournament standings pulls the current order. It does not poll start.gg in the background." },
      { title: "Pick how many rows", body: "Top 8 is the default. Change the slot count when the graphic needs more or fewer." },
      { title: "Saved players stick", body: "A player’s character and info stay on their start.gg profile, including the next event they enter, until you save over them." },
    ],
  },
  commentary: {
    kicker: "Commentary",
    title: "Who is on the desk",
    lead: "Commentators are part of the scoreboard you are running. Another stream can have a different desk.",
    steps: [
      { title: "Two is the default, four is the max", body: "Change the count before you fill the extra seats. Empty seats stay off the overlay." },
      { title: "Look them up", body: "Type a name. If a start.gg profile matches, pick it and the tag, sponsor, pronouns, and social fill in." },
      { title: "Save commentator", body: "That stores them on this desk. Next time you type the name, they come back without another lookup." },
    ],
  },
  info: {
    kicker: "Tournament info",
    title: "What the graphics read",
    lead: "Import fills this from start.gg. With no import, the fields stay blank and you type them.",
    steps: [
      { title: "Name, game, and link", body: "The event name and game are what the overlays and the versus screen use. The icon replaces the ROK mark when the tournament has one." },
      { title: "Fix it here", body: "A wrong venue, short name, or round label can be typed over. It stays on this game until you import again." },
    ],
  },
  bracket: {
    kicker: "Bracket",
    title: "The graphic, not the TO desk",
    lead: "This view is for the stream. Calling sets and reporting scores stays on Tournament control.",
    steps: [
      { title: "Choose the slice", body: "Pick the phase, the pool, winners, losers, or the full bracket. Top 8 is the usual graphic. Load it when you need the current state." },
      { title: "Clicking a set does not put it on stream", body: "It opens the card, the same as the TO desk. A misclick will not replace the match that is live." },
      { title: "The tree is the picture", body: "Winners run forward. Losers run the same direction. What you see here is what the bracket overlay draws." },
    ],
  },
  ruleset: {
    kicker: "Ruleset",
    title: "Stages, bans, and counterpicks",
    lead: "Presets follow the game you imported. Smash gets Smash rules. Another game gets its own list.",
    steps: [
      { title: "Start from a preset", body: "The dropdown fills starters, counterpicks, and the ban order. Save it under your own name if you change it." },
      { title: "Mark starters and counterpicks", body: "Starters are struck first. Counterpicks open after a game is reported. The strike tablet reads the ruleset on the scoreboard match." },
      { title: "One active ruleset", body: "The selected ruleset is the one stage strike uses. Switching games does not borrow another game’s list." },
    ],
  },
  overlays: {
    kicker: "Overlays",
    title: "What OBS is showing",
    lead: "Pick the layout, then copy the browser source while the right game and scoreboard are selected.",
    steps: [
      { title: "Layouts are grouped by game", body: "Scoreboards, versus screens, brackets, and top 8s from the TSH pack are in the list. Custom layouts you saved show under the group you filed them in." },
      { title: "The link is pinned", body: "Copy browser source after you select the stream and scoreboard. The URL carries that game and that scoreboard, so a second stream does not steal it." },
      { title: "1920 × 1080, transparent", body: "In OBS or vMix, set the browser source to 1920 × 1080 and turn the background off. The preview here is the same frame." },
      { title: "Empty is still a layout", body: "A scoreboard with no set yet still draws. Names show as TBD until you pull a match." },
    ],
  },
  editor: {
    kicker: "Overlay editor",
    title: "Build the layout here",
    lead: "This is the title designer. Layers, text, and pictures stay on a 1920 × 1080 canvas with a checkerboard behind them so you can see what is transparent.",
    steps: [
      { title: "Add type, then bind it", body: "Text, rectangle, circle, and triangle are layers. Rectangles and the other shapes can take a character or a skin, the same as a picture." },
      { title: "Snap while you move and resize", body: "Drag a layer and it snaps to the canvas and to other layers. Width and height snap the same way. The readout is the pixel position." },
      { title: "Fonts", body: "Pick the family. Bold and italic are buttons, not extra names in the list. What you save is what the overlay draws." },
      { title: "Save it into a group", body: "Save asks where it lives: in game, versus, bracket, people, or custom. It then shows in the overlay list with its own browser-source link." },
      { title: "PSD import", body: "Import a PSD to bring the layers in. Check the stack against the file. Hidden layers stay hidden. Text comes in as text when the file has it." },
    ],
  },
  settings: {
    kicker: "Settings",
    title: "What this desk remembers",
    lead: "These apply to the production desk on this computer. Another producer’s desk keeps its own settings.",
    steps: [
      { title: "General", body: "The profanity filter only changes what the stream sees. Strike score control decides if the strike tablet is allowed to write the score. Auto set and auto score follow start.gg when you import." },
      { title: "Hotkeys", body: "Turn them on, then click a box and press the keys. They work in the desk, including the browser, as long as you are not typing in a field. They do not run while Settings is open." },
      { title: "Default display", body: "Uncheck a row to keep it off the overlays: real name, social, seed, location, characters, pronouns. The scoreboard itself can still show it." },
      { title: "API keys", body: "Leave this off. Imports use the event link. Turn on a start.gg token only if you want those pulls to use your own token instead." },
    ],
  },
  assets: {
    kicker: "Assets",
    title: "Characters and stages",
    lead: "Download a game once. It stays on this desk, and only that game’s library is used while the event is set to it.",
    steps: [
      { title: "Pick the game", body: "Search or use the dropdown. Download pulls the character stocks and the stage icons for that game." },
      { title: "Skins sit on the character", body: "The default picture is the stock icon. Extra skins show next to the character when you pick one on the scoreboard." },
      { title: "Your own pack", body: "Upload a pack and tie each file to a character. Mario.png belongs to Mario. It is saved here and does not need another download." },
    ],
  },
  strike: {
    kicker: "Stage strike",
    title: "One tablet per station",
    lead: "This tablet strikes the set that was called to this station. Rock-paper-scissors is played at the table. The tablet only records who won the right to ban.",
    steps: [
      { title: "Pick who won the hand", body: "That player bans first, or picks, the way the ruleset says. The other player follows." },
      { title: "Bans, then the stage", body: "A banned stage gets a cross and stays banned for this game. After the last ban, the remaining starter is the game, or the player picks it." },
      { title: "Gentleman’s pick", body: "Use it when they already agreed on a stage. It skips the rest of the strike for this game." },
      { title: "Report the game", body: "Choose who won. The stage, the characters, and the score go to start.gg. Counterpicks open for the next game." },
      { title: "The set ends itself", body: "In a best of 3, the match stops at two wins. The tablet tells them to wait and not start another game. Undo, redo, restart this game, or restart the set if the strike went wrong." },
    ],
  },
};

function dismissedKey(kind: FgcGuideKind) {
  return `${STORAGE_KEY}:${kind}`;
}

export function useFgcGuide(kind: FgcGuideKind, autoOpen = true) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!autoOpen) return;
    try {
      if (window.localStorage.getItem(dismissedKey(kind)) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [kind, autoOpen]);
  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(dismissedKey(kind), "1");
    } catch {
      /* ignore */
    }
  };
  return { open, openGuide: () => setOpen(true), close };
}

export function FgcGuide({ kind, open, onClose }: { kind: FgcGuideKind; open: boolean; onClose: () => void }) {
  if (!open) return null;
  const copy = COPY[kind];
  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-bg/70 p-3 sm:place-items-center" onClick={onClose}>
      <div role="dialog" aria-labelledby="fgc-guide-title" className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-surface p-5 text-fg shadow-panel" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-muted uppercase">{copy.kicker}</p>
            <h2 id="fgc-guide-title" className="font-display mt-1 text-2xl font-semibold uppercase">{copy.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-md text-muted" aria-label="Close how to">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{copy.lead}</p>
        <ol className="mt-4 space-y-3">
          {copy.steps.map((step, index) => (
            <li key={step.title} className="rounded-lg bg-surface-2 px-3 py-3">
              <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">{String(index + 1).padStart(2, "0")}</p>
              <p className="font-display mt-0.5 text-lg font-semibold uppercase">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <Button className="mt-4 w-full" onClick={onClose}>Got it</Button>
      </div>
    </div>
  );
}

export function FgcGuideButton({ kind, autoOpen = true, className = "" }: { kind: FgcGuideKind; autoOpen?: boolean; className?: string }) {
  const guide = useFgcGuide(kind, autoOpen);
  return (
    <>
      <Button variant="ghost" size="sm" className={className} onClick={(event) => { event.preventDefault(); event.stopPropagation(); guide.openGuide(); }}>
        <CircleHelp className="size-3.5" />
        How to
      </Button>
      <FgcGuide kind={kind} open={guide.open} onClose={guide.close} />
    </>
  );
}
