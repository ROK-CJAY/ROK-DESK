import { useEffect } from "react";
import { useDeskStore } from "@/lib/desk-store";
import { seatsFor, type SeatId } from "@/lib/desk-types";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

const SEAT_KEYS: Record<string, SeatId> = {
  "1": "p1",
  "2": "p2",
  "3": "p3",
  "4": "p4",
};

export function useDeskHotkeys() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const store = useDeskStore.getState();
      const key = event.key.toLowerCase();
      const pod = store.desk.tableSize > 2;

      if (pod) {
        if (SEAT_KEYS[key] && seatsFor(store.desk.tableSize).includes(SEAT_KEYS[key]!)) {
          store.setFocusedSeat(SEAT_KEYS[key]!);
          event.preventDefault();
          return;
        }
        const seat = store.focusedSeat;
        const lifeStep = event.shiftKey ? 5 : 1;
        if (key === "w") store.bumpResource(seat, lifeStep);
        else if (key === "s") store.bumpResource(seat, -lifeStep);
        else if (key === "e") store.bumpCmdDamage(seat, 1);
        else if (key === "d") store.bumpCmdDamage(seat, -1);
        else if (key === "i") store.bumpSecondary(seat, 1);
        else if (key === "k") store.bumpSecondary(seat, -1);
        else if (key === "f") store.swapSides();
        else if (key === "r") store.resetGame();
        else if (key === " ") {
          event.preventDefault();
          store.toggleTimer();
        } else {
          return;
        }
        event.preventDefault();
        return;
      }

      if (key === "q") store.bumpScore("p1", 1);
      else if (key === "a") store.bumpScore("p1", -1);
      else if (key === "o") store.bumpScore("p2", 1);
      else if (key === "l") store.bumpScore("p2", -1);
      else if (key === "w") store.bumpResource("p1", 1);
      else if (key === "s") store.bumpResource("p1", -1);
      else if (key === "i") store.bumpResource("p2", 1);
      else if (key === "k") store.bumpResource("p2", -1);
      else if (key === "f") store.swapSides();
      else if (key === "r") store.resetGame();
      else if (key === " ") {
        event.preventDefault();
        store.toggleTimer();
      } else {
        return;
      }
      event.preventDefault();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
