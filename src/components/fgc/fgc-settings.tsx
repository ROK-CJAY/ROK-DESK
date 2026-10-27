import { useEffect, useState, type ReactNode } from "react";
import { Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FgcGuideButton } from "@/components/fgc/fgc-guide";
import { DEFAULT_FGC_SETTINGS, comboFromEvent, type FgcHotkey, type FgcSettings } from "@/lib/fgc-settings";
import { readStartggLink, writeStartggLink } from "@/lib/startgg-link";
import { useFgcStore } from "@/lib/fgc-store";

const PAGES = ["General", "Hotkeys", "Default display", "API keys"] as const;

const HOTKEYS: { id: FgcHotkey; label: string }[] = [
  { id: "loadSet", label: "Load set" },
  { id: "p1Up", label: "Team 1 score up" },
  { id: "p1Down", label: "Team 1 score down" },
  { id: "p2Up", label: "Team 2 score up" },
  { id: "p2Down", label: "Team 2 score down" },
  { id: "reset", label: "Reset scores" },
  { id: "swap", label: "Swap teams" },
  { id: "refresh", label: "Refresh bracket" },
];

export function FgcSettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Settings className="size-4" />
        Settings
      </Button>
      {open ? <FgcSettingsDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function FgcSettingsDialog({ onClose }: { onClose: () => void }) {
  const settings = useFgcStore((s) => s.fgc.settings);
  const patch = useFgcStore((s) => s.patch);
  const [page, setPage] = useState<(typeof PAGES)[number]>("General");
  const save = (next: FgcSettings) => patch({ settings: next });
  const toggle = (key: keyof FgcSettings) => save({ ...settings, [key]: !settings[key] });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <section data-fgc-settings className="grid h-[min(40rem,86dvh)] w-full max-w-4xl grid-cols-[13rem_minmax(0,1fr)] overflow-hidden rounded-md border border-white/10 bg-[#1b1d22] text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-r border-white/10 bg-[#15171b] py-2">
          <p className="px-4 py-3 text-sm font-medium">Settings</p>
          {PAGES.map((item) => (
            <button key={item} type="button" className={`block w-full px-4 py-2 text-left text-sm ${page === item ? "bg-[#2a4f86]" : "text-white/80 hover:bg-white/5"}`} onClick={() => setPage(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="grid grid-rows-[auto_minmax(0,1fr)]">
          <div className="flex items-center justify-end gap-2 border-b border-white/10 px-3 py-2">
            <FgcGuideButton kind="settings" autoOpen={false} className="text-white hover:bg-white/10" />
            <button type="button" aria-label="Close settings" onClick={onClose}><X className="size-4" /></button>
          </div>
          <div className="overflow-y-auto px-4 py-3">
            {page === "General" ? <General settings={settings} save={save} toggle={toggle} /> : null}
            {page === "Hotkeys" ? <Hotkeys settings={settings} save={save} /> : null}
            {page === "Default display" ? <Display settings={settings} save={save} /> : null}
            {page === "API keys" ? <ApiKeys /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({ label, children, onDefault }: { label: string; children: ReactNode; onDefault: () => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-white/5 py-2 text-sm">
      <span>{label}</span>
      <div className="flex justify-end">{children}</div>
      <Button size="sm" variant="outline" className="h-7 border-[#35598a] bg-[#243f68] text-white hover:bg-[#2d4e80]" onClick={onDefault}>Default</Button>
    </div>
  );
}

function Check({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return <input type="checkbox" className="size-4 accent-[#4c8dff]" checked={checked} onChange={onChange} />;
}

function General({ settings, save, toggle }: { settings: FgcSettings; save: (next: FgcSettings) => void; toggle: (key: keyof FgcSettings) => void }) {
  return (
    <div>
      <Row label="Enable profanity filter" onDefault={() => save({ ...settings, profanity: DEFAULT_FGC_SETTINGS.profanity })}>
        <Check checked={settings.profanity} onChange={() => toggle("profanity")} />
      </Row>
      <Row label="Enable score control from the stage striking app" onDefault={() => save({ ...settings, strikeScores: DEFAULT_FGC_SETTINGS.strikeScores })}>
        <Check checked={settings.strikeScores} onChange={() => toggle("strikeScores")} />
      </Row>
      <Row label="Disable automatic set updating for the scoreboard" onDefault={() => save({ ...settings, autoSet: DEFAULT_FGC_SETTINGS.autoSet })}>
        <Check checked={!settings.autoSet} onChange={() => toggle("autoSet")} />
      </Row>
      <Row label="Do not update character data when a set is loaded" onDefault={() => save({ ...settings, keepCharacters: DEFAULT_FGC_SETTINGS.keepCharacters })}>
        <Check checked={settings.keepCharacters} onChange={() => toggle("keepCharacters")} />
      </Row>
      <Row label="Disable automatic score updating for the scoreboard" onDefault={() => save({ ...settings, autoScore: DEFAULT_FGC_SETTINGS.autoScore })}>
        <Check checked={!settings.autoScore} onChange={() => toggle("autoScore")} />
      </Row>
      <Row label="Do not override existing values in the local player database" onDefault={() => save({ ...settings, keepPlayerDb: DEFAULT_FGC_SETTINGS.keepPlayerDb })}>
        <Check checked={settings.keepPlayerDb} onChange={() => toggle("keepPlayerDb")} />
      </Row>
      <Row label="Default color of Team 1" onDefault={() => save({ ...settings, team1: DEFAULT_FGC_SETTINGS.team1 })}>
        <input type="color" value={settings.team1} onChange={(event) => save({ ...settings, team1: event.target.value })} className="h-7 w-14 cursor-pointer bg-transparent" />
      </Row>
      <Row label="Default color of Team 2" onDefault={() => save({ ...settings, team2: DEFAULT_FGC_SETTINGS.team2 })}>
        <input type="color" value={settings.team2} onChange={(event) => save({ ...settings, team2: event.target.value })} className="h-7 w-14 cursor-pointer bg-transparent" />
      </Row>
    </div>
  );
}

function Hotkeys({ settings, save }: { settings: FgcSettings; save: (next: FgcSettings) => void }) {
  const [listen, setListen] = useState<FgcHotkey | null>(null);
  useEffect(() => {
    if (!listen) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      const combo = comboFromEvent(event);
      if (!combo) return;
      save({ ...settings, keys: { ...settings.keys, [listen]: combo } });
      setListen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listen, save, settings]);
  return (
    <div>
      <Row label="Enable hotkeys" onDefault={() => save({ ...settings, hotkeys: DEFAULT_FGC_SETTINGS.hotkeys })}>
        <Check checked={settings.hotkeys} onChange={() => save({ ...settings, hotkeys: !settings.hotkeys })} />
      </Row>
      {HOTKEYS.map((item) => (
        <Row key={item.id} label={item.label} onDefault={() => save({ ...settings, keys: { ...settings.keys, [item.id]: DEFAULT_FGC_SETTINGS.keys[item.id] } })}>
          <button type="button" className="h-8 min-w-36 rounded bg-[#2a2d34] px-3 text-left text-sm text-white/90" onClick={() => setListen(item.id)}>
            {listen === item.id ? "Press keys" : settings.keys[item.id]}
          </button>
        </Row>
      ))}
    </div>
  );
}

function Display({ settings, save }: { settings: FgcSettings; save: (next: FgcSettings) => void }) {
  const rows: { id: keyof FgcSettings["show"]; label: string }[] = [
    { id: "realName", label: "Show real name" },
    { id: "social", label: "Show social media" },
    { id: "seed", label: "Show seed" },
    { id: "location", label: "Show location" },
    { id: "characters", label: "Show characters" },
    { id: "pronouns", label: "Show pronouns" },
  ];
  return (
    <div>
      {rows.map((item) => (
        <Row key={item.id} label={item.label} onDefault={() => save({ ...settings, show: { ...settings.show, [item.id]: DEFAULT_FGC_SETTINGS.show[item.id] } })}>
          <Check checked={settings.show[item.id]} onChange={() => save({ ...settings, show: { ...settings.show, [item.id]: !settings.show[item.id] } })} />
        </Row>
      ))}
    </div>
  );
}

function ApiKeys() {
  const [token, setToken] = useState("");
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const saved = readStartggLink();
    setToken(saved.token);
    setEnabled(saved.enabled);
  }, []);
  const save = (nextEnabled: boolean, nextToken: string) => {
    setEnabled(nextEnabled);
    setToken(nextToken);
    writeStartggLink(nextEnabled, nextToken);
  };
  return (
    <div className="grid max-w-lg gap-3 text-sm">
      <label className="flex items-center gap-2">
        <Check checked={enabled} onChange={() => save(!enabled, token)} />
        Use a start.gg API token for imports
      </label>
      <input className="h-10 rounded border border-white/10 bg-[#2a2d34] px-3" type="password" value={token} placeholder="start.gg token" onChange={(event) => save(enabled, event.target.value)} />
      <p className="text-xs text-white/50">Leave this off to import a public event link. Tournament organizers still sign in with their own start.gg account.</p>
    </div>
  );
}
