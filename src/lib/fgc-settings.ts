export type FgcHotkey =
  | "loadSet"
  | "p1Up"
  | "p1Down"
  | "p2Up"
  | "p2Down"
  | "reset"
  | "swap"
  | "refresh";

export type FgcSettings = {
  profanity: boolean;
  strikeScores: boolean;
  autoSet: boolean;
  keepCharacters: boolean;
  autoScore: boolean;
  keepPlayerDb: boolean;
  team1: string;
  team2: string;
  hotkeys: boolean;
  keys: Record<FgcHotkey, string>;
  show: {
    realName: boolean;
    social: boolean;
    seed: boolean;
    location: boolean;
    characters: boolean;
    pronouns: boolean;
  };
};

export const DEFAULT_FGC_SETTINGS: FgcSettings = {
  profanity: true,
  strikeScores: true,
  autoSet: true,
  keepCharacters: false,
  autoScore: true,
  keepPlayerDb: false,
  team1: "#e11d2e",
  team2: "#2f6bff",
  hotkeys: true,
  keys: {
    loadSet: "Ctrl+O",
    p1Up: "Ctrl+F1",
    p1Down: "Ctrl+F2",
    p2Up: "Ctrl+F3",
    p2Down: "Ctrl+F4",
    reset: "Ctrl+R",
    swap: "Ctrl+S",
    refresh: "Ctrl+P",
  },
  show: {
    realName: true,
    social: true,
    seed: true,
    location: true,
    characters: true,
    pronouns: true,
  },
};

export function normalizeSettings(raw: Partial<FgcSettings> | null | undefined): FgcSettings {
  return {
    ...DEFAULT_FGC_SETTINGS,
    ...raw,
    keys: { ...DEFAULT_FGC_SETTINGS.keys, ...raw?.keys },
    show: { ...DEFAULT_FGC_SETTINGS.show, ...raw?.show },
  };
}

const BLOCKED = ["fuck", "shit", "bitch", "asshole", "cunt", "nigger", "nigga", "faggot", "retard"];

export function cleanSpeech(text: string, enabled: boolean): string {
  if (!enabled || !text) return text;
  return text.replace(new RegExp(`\\b(${BLOCKED.join("|")})\\b`, "gi"), (word) => "*".repeat(word.length));
}

export function hotkeyEvent(combo: string, event: KeyboardEvent): boolean {
  const parts = combo.split("+").filter(Boolean);
  if (!parts.length) return false;
  const key = parts[parts.length - 1];
  const ctrl = parts.includes("Ctrl");
  const alt = parts.includes("Alt");
  const shift = parts.includes("Shift");
  const pressed = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  return pressed.toLowerCase() === key.toLowerCase()
    && (event.ctrlKey || event.metaKey) === ctrl
    && event.altKey === alt
    && event.shiftKey === shift;
}

export function comboFromEvent(event: KeyboardEvent): string | null {
  if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return null;
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
  return parts.join("+");
}
