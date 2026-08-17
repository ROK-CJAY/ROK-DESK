import { useEffect, useState } from "react";
import { CircleHelp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TabletGuideKind =
  | "vgc"
  | "tcg"
  | "mtg"
  | "swu"
  | "ygo"
  | "op"
  | "rift"
  | "lorcana"
  | "table"
  | "cards"
  | "mtg-cards"
  | "swu-cards"
  | "ygo-cards"
  | "op-cards"
  | "rift-cards"
  | "lorcana-cards";

const STORAGE_KEY = "rok-tablet-guide";

const COPY: Record<
  TabletGuideKind,
  { kicker: string; title: string; lead: string; steps: { title: string; body: string }[] }
> = {
  vgc: {
    kicker: "Judge tablet",
    title: "How this VGC pad works",
    lead: "You’re holding the floor copy of the live match. Anything you tap here hits the production desk and the stream bugs.",
    steps: [
      {
        title: "Read the sixes first",
        body: "Each side is the submitted team sheet — types, Tera, ability, item, and moves. This is what you check against the game being played.",
      },
      {
        title: "Tap a Pokémon to KO it",
        body: "Grey means it’s out. Tap again to bring it back. Remaining icons on stream follow these taps, not a left-to-right count.",
      },
      {
        title: "Game vs Match",
        body: "Game scores the game, fires the game-win bug, and resets remaining for the next game. Match fires the match-win bug and, if this pair was sent from Tournament, advances the bracket.",
      },
      {
        title: "Run the clock",
        body: "This clock is the streamed match only. Type a time and Set, then Start / Pause. +1m / +3m / −1m adjust it. The floor clock lives on Tournament control.",
      },
    ],
  },
  tcg: {
    kicker: "Judge tablet",
    title: "How this PTCG pad works",
    lead: "This is the floor judge view of the featured match. Score, prizes, and the clock stay in sync with production.",
    steps: [
      {
        title: "Prizes are the pokéballs",
        body: "Tap a ball to set prizes remaining for that player. Same count the scorebug is showing.",
      },
      {
        title: "Game vs Match",
        body: "Game awards a game and resets prizes for the next one. Match is the match winner — it reports into the bracket when the pair is linked from Tournament.",
      },
      {
        title: "Clock is the stream match",
        body: "This clock is only the featured table. Type a time like 50:00 and Set. Start / Pause, then +1m or +3m if you granted time. Reset returns to the last set length. The rest of the room uses the Floor clock on Tournament.",
      },
      {
        title: "Card lookup is for rulings",
        body: "Search the box at the bottom. Tap a result to read the card. Use Show on stream when you want the art on air, then Clear when the ruling is done.",
      },
    ],
  },
  mtg: {
    kicker: "Judge tablet",
    title: "How this MTG pad works",
    lead: "This is the floor judge view for every Magic format — Standard through cEDH. Life, poison, commander damage, and the result stay in sync with production.",
    steps: [
      {
        title: "Type an amount, then + or −",
        body: "Life, poison, and commander damage all take a number. Type 20 and hit + to add 20. Leave it at 1 for single ticks.",
      },
      {
        title: "Constructed is two seats",
        body: "Standard, Modern, Pioneer, and the rest are 1v1. Games, Game, and Match work like the other judge tablets. Match reports into the bracket when the pair is linked.",
      },
      {
        title: "Commander and cEDH are the pod",
        body: "Four seats, each with life, poison, and commander damage. Wins marks the table winner. Duel Commander stays two seats with commander damage.",
      },
      {
        title: "Clock is the streamed match",
        body: "Type a time and Set, then Start. The floor clock for the rest of the room lives on Tournament control.",
      },
      {
        title: "Card lookup is Scryfall",
        body: "Search at the bottom. Filter to this format or All printings. Show on stream puts the art on the Card overlay. Clear takes it off.",
      },
    ],
  },
  swu: {
    kicker: "Judge tablet",
    title: "How this SWU pad works",
    lead: "This is the floor judge view of the featured Star Wars Unlimited match. Base HP, games, and the clock stay in sync with production.",
    steps: [
      {
        title: "Type damage, then + or −",
        body: "Base HP takes a number. Type 5 and hit − to deal 5. Leave it at 1 for single ticks. Reset HP restores the starting base.",
      },
      {
        title: "Initiative is on stream",
        body: "Tap a player under Initiative to put INIT on their scorebug plate. Tap them again or Clear to take it off. It follows Swap on Production.",
      },
      {
        title: "Game vs Match",
        body: "Game awards the game and resets HP for the next one. Match is the match winner — it reports into the bracket when the pair is linked from Tournament.",
      },
      {
        title: "Clock is the streamed match",
        body: "Type a time like 50:00 and Set, then Start / Pause. +1m / +3m / −1m adjust it. The rest of the room uses the Floor clock on Tournament.",
      },
      {
        title: "Card lookup is SWU-DB",
        body: "Search at the bottom. Tap a result to read the printed text. Show on stream puts the art on the Card overlay. Clear takes it off.",
      },
    ],
  },
  ygo: {
    kicker: "Judge tablet",
    title: "How this YGO pad works",
    lead: "This is the floor judge view of the featured Yu-Gi-Oh! match. Life points, games, and the clock stay in sync with production.",
    steps: [
      {
        title: "Type an amount, then + or −",
        body: "Life points start at 8000. The pad defaults to 100. Type 800 or 2000 and hit − to apply that damage. Reset LP restores 8000.",
      },
      {
        title: "Game vs Match",
        body: "Game awards the game and resets LP for the next one. Match is the match winner — it reports into the bracket when the pair is linked from Tournament.",
      },
      {
        title: "Clock is the streamed match",
        body: "Type a time like 40:00 and Set, then Start / Pause. +1m / +3m / −1m adjust it. The rest of the room uses the Floor clock on Tournament.",
      },
      {
        title: "Card lookup is YGOPRODeck",
        body: "Search at the bottom. Tap a result to read the card text. Show on stream puts the art on the Card overlay. Clear takes it off.",
      },
    ],
  },
  op: {
    kicker: "Judge tablet",
    title: "How this OP pad works",
    lead: "This is the floor judge view of the featured One Piece TCG match. Life, DON!!, games, and the clock stay in sync with production.",
    steps: [
      {
        title: "Life is the circles",
        body: "Tap a circle to set life remaining. 5 is the Premier default. 4-life leaders drop to four circles. Reset life restores the starting count.",
      },
      {
        title: "DON!! is the number pad",
        body: "Type an amount and hit + or −. Most tables start at 1 and climb to 10.",
      },
      {
        title: "Game vs Match",
        body: "Game awards the game and resets life / DON!! for the next one. Match is the match winner — it reports into the bracket when the pair is linked from Tournament.",
      },
      {
        title: "Card lookup is official English data",
        body: "Search at the bottom. Tap a result to read the printed text. Show on stream puts the art on the Card overlay. Clear takes it off.",
      },
    ],
  },
  cards: {
    kicker: "Card lookup",
    title: "How to pull a card",
    lead: "This search hits TCGdex Pokémon TCG Live data so you can read the printed card and send it to the stream.",
    steps: [
      {
        title: "Type at least two letters",
        body: "Name is enough — Pikachu, Iono, Boss’s Orders. Results appear as you type.",
      },
      {
        title: "Live vs All sets",
        body: "Live is Standard-legal TCG Live. Switch to All sets if the card is out of Standard or you need an older printing.",
      },
      {
        title: "Show on stream when you need it",
        body: "The tablet keeps the full text. Show on stream sends the art to the Card overlay. Clear takes it off. Add the Card source in OBS or vMix, or use HUD pack.",
      },
    ],
  },
  "mtg-cards": {
    kicker: "Card lookup",
    title: "How to pull an MTG card",
    lead: "This search hits Scryfall so you can read oracle text at the table and send the art to the stream.",
    steps: [
      {
        title: "Type at least two letters",
        body: "Name is enough — Sol Ring, Swords to Plowshares, Rhystic Study. Results appear as you type.",
      },
      {
        title: "This format vs All printings",
        body: "The first chip filters to cards legal in the event (Standard, Modern, Commander, …). All printings searches every Scryfall printing.",
      },
      {
        title: "Show on stream when you need it",
        body: "The tablet keeps the oracle text. Show on stream sends the art to the Card overlay. Clear takes it off. Add the Card source in OBS or vMix, or use HUD pack.",
      },
    ],
  },
  "swu-cards": {
    kicker: "Card lookup",
    title: "How to pull an SWU card",
    lead: "This search hits SWU-DB so you can read the printed card at the table and send the art to the stream.",
    steps: [
      {
        title: "Type at least two letters",
        body: "Name is enough — Darth Vader, Force Throw, Superlaser Blast. Results appear as you type.",
      },
      {
        title: "Leaders and bases included",
        body: "Units, events, upgrades, leaders, and bases all come back from SWU-DB. Double-sided leaders show front text and art.",
      },
      {
        title: "Show on stream when you need it",
        body: "The tablet keeps the printed text. Show on stream sends the art to the Card overlay. Clear takes it off. Add the Card source in OBS or vMix, or use HUD pack.",
      },
    ],
  },
  "ygo-cards": {
    kicker: "Card lookup",
    title: "How to pull a YGO card",
    lead: "This search hits YGOPRODeck so you can read the card at the table and send the art to the stream.",
    steps: [
      {
        title: "Type at least two letters",
        body: "Name is enough — Ash Blossom, Infinite Impermanence, Snake-Eye Ash. Results appear as you type.",
      },
      {
        title: "This format vs All printings",
        body: "The first chip filters to TCG / Goat when that format is known. All printings searches the full YGOPRODeck catalog.",
      },
      {
        title: "Show on stream when you need it",
        body: "The tablet keeps the card text. Show on stream sends the art to the Card overlay. Clear takes it off. Add the Card source in OBS or vMix, or use HUD pack.",
      },
    ],
  },
  "op-cards": {
    kicker: "Card lookup",
    title: "How to pull an OP card",
    lead: "This search uses official English One Piece TCG card data so you can read the printed card and send the art to the stream.",
    steps: [
      {
        title: "Type at least two letters",
        body: "Name is enough — Nami, Monkey D. Luffy, Roronoa Zoro. Results appear as you type.",
      },
      {
        title: "Leaders, characters, events, stages",
        body: "Parallels are hidden so you get one printing of each card. Art comes from the official card list.",
      },
      {
        title: "Show on stream when you need it",
        body: "The tablet keeps the printed text. Show on stream sends the art to the Card overlay. Clear takes it off. Add the Card source in OBS or vMix, or use HUD pack.",
      },
    ],
  },
  rift: {
    kicker: "Judge tablet",
    title: "How this Riftbound pad works",
    lead: "You’re holding the floor copy of the live match. Points here are conquer / hold score — first to 8 wins the game.",
    steps: [
      {
        title: "Tap points 1–8",
        body: "Each tap sets that player’s points. Tap the current number again to step back one. First to 8 — last point from a hold or scoring both battlefields in one turn.",
      },
      {
        title: "Game vs Match",
        body: "Game scores the game, fires the game-win bug, and resets points for the next game. Match fires the match-win bug and, if this pair was sent from Tournament, advances the bracket.",
      },
      {
        title: "Run the clock",
        body: "This clock is the streamed match only. Type a time and Set, then Start / Pause. +1m / +3m / −1m adjust it. The floor clock lives on Tournament control.",
      },
      {
        title: "Card lookup",
        body: "Search at the bottom. Tap a result to read the printed text. Show on stream puts the art on the Card overlay. Clear takes it off.",
      },
    ],
  },
  "rift-cards": {
    kicker: "Card lookup",
    title: "How to pull a Riftbound card",
    lead: "This search uses Riftcodex (community card API built from public Riftbound data) so you can read the printed card and send the art to the stream.",
    steps: [
      {
        title: "Type at least two letters",
        body: "Champion or card name is enough — Jinx, Volibear, Hidden Blade. Results appear as you type.",
      },
      {
        title: "Points, type, domains",
        body: "Energy, Might, and Power show with the type and domain (Fury, Calm, Mind, Body, Chaos, Order).",
      },
      {
        title: "Show on stream when you need it",
        body: "The tablet keeps the printed text. Show on stream sends the art to the Card overlay. Clear takes it off. Add the Card source in OBS or vMix, or use HUD pack.",
      },
    ],
  },
  lorcana: {
    kicker: "Judge tablet",
    title: "How this Lorcana pad works",
    lead: "You’re holding the floor copy of the live match. Lore here is first to 20 — same number the scorebug shows.",
    steps: [
      {
        title: "Tap lore 1–20",
        body: "Each tap sets that player’s lore. Tap the current number again to step back one, or use + / −. First to 20 wins the game.",
      },
      {
        title: "Game vs Match",
        body: "Game scores the game, fires the game-win bug, and resets lore for the next game. Match fires the match-win bug and, if this pair was sent from Tournament, advances the bracket.",
      },
      {
        title: "Run the clock",
        body: "This clock is the streamed match only. Type a time and Set, then Start / Pause. +1m / +3m / −1m adjust it. The floor clock lives on Tournament control.",
      },
      {
        title: "Card lookup",
        body: "Search at the bottom. Tap a result to read the printed text. Show on stream puts the art on the Card overlay. Clear takes it off.",
      },
    ],
  },
  "lorcana-cards": {
    kicker: "Card lookup",
    title: "How to pull a Lorcana card",
    lead: "This search uses Lorcast so you can read the printed card and send the art to the stream.",
    steps: [
      {
        title: "Type at least two letters",
        body: "Character or song name is enough — Elsa, Maui, Be Prepared. Results appear as you type.",
      },
      {
        title: "Ink, strength, willpower, lore",
        body: "Cost and inks show with the type. Strength, willpower, and the card’s lore value sit in the meta line.",
      },
      {
        title: "Show on stream when you need it",
        body: "The tablet keeps the printed text. Show on stream sends the art to the Card overlay. Clear takes it off. Add the Card source in OBS or vMix, or use HUD pack.",
      },
    ],
  },
  table: {
    kicker: "Player tablet",
    title: "How this table pad works",
    lead: "Drop this in the middle of the table. Each seat is that player’s life total, live to the stream.",
    steps: [
      {
        title: "Tap the sides of a seat",
        body: "Left is −1 life. Right is +1. The big number is what the overlay is showing.",
      },
      {
        title: "Facing out",
        body: "Flip the far seats so the players across from you can read their own totals. Switch to Upright when you pick the tablet back up.",
      },
      {
        title: "Poison and commander",
        body: "The chips under life track poison and commander damage. They go live on the Commander overlays.",
      },
    ],
  },
};

function dismissedKey(kind: TabletGuideKind) {
  return `${STORAGE_KEY}:${kind}`;
}

export function useTabletGuide(kind: TabletGuideKind, autoOpen = true) {
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

export function TabletGuide({
  kind,
  open,
  onClose,
}: {
  kind: TabletGuideKind;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  const copy = COPY[kind];
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-bg/70 p-3 sm:place-items-center">
      <div
        role="dialog"
        aria-labelledby="tablet-guide-title"
        className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-xl border border-border bg-surface p-5 shadow-panel"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.62rem] tracking-[0.2em] text-muted uppercase">{copy.kicker}</p>
            <h2 id="tablet-guide-title" className="font-display mt-1 text-2xl font-semibold uppercase">
              {copy.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-md text-muted" aria-label="Close how to">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{copy.lead}</p>
        <ol className="mt-4 space-y-3">
          {copy.steps.map((step, i) => (
            <li key={step.title} className="rounded-lg bg-surface-2 px-3 py-3">
              <p className="font-mono text-[0.58rem] tracking-[0.16em] text-muted uppercase">
                {String(i + 1).padStart(2, "0")}
              </p>
              <p className="font-display mt-0.5 text-lg font-semibold uppercase">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <Button className="mt-4 w-full" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>
  );
}

export function GuideButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} aria-label="How to use this tablet">
      <CircleHelp className="size-3.5" />
      How to
    </Button>
  );
}
