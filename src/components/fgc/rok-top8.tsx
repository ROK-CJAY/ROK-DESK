import { useEffect, useState } from "react";
import { resolvePreview } from "@/lib/fgc-assets";
import { cleanSpeech } from "@/lib/fgc-settings";
import { countryFlagUrl, libraryFor, playerLabel, stateFlagUrl, type FgcPlayer, type FgcState } from "@/lib/fgc-types";
import { useFgcStore } from "@/lib/fgc-store";

const PLACES = ["1ST", "2ND", "3RD", "4TH", "5TH", "5TH", "7TH", "7TH"];

function useLiveFgc() {
  const pullProgram = useFgcStore((s) => s.pullProgram);
  const fgc = useFgcStore((s) => s.fgc);
  useEffect(() => {
    void pullProgram();
    const timer = window.setInterval(() => void pullProgram(), 1000);
    return () => window.clearInterval(timer);
  }, [pullProgram]);
  return fgc;
}

function players(fgc: FgcState): (FgcPlayer | null)[] {
  const slots: (FgcPlayer | null)[] = (fgc.roster?.slots ?? []).slice(0, 8).map((slot) => slot.players.find((player) => player.tag.trim()) ?? null);
  if (slots.some((player) => player?.tag.trim())) {
    while (slots.length < 8) slots.push(null);
    return slots;
  }
  return Array.from({ length: 8 }, () => null);
}

function renderOf(fgc: FgcState, player: FgcPlayer | null) {
  if (player?.render) return { art: player.render, icon: "" };
  if (!player?.character || !fgc.settings.show.characters) return { art: "", icon: "" };
  const library = libraryFor(fgc);
  const found = library?.characters.find((item) => item.name.toLowerCase() === player.character.toLowerCase());
  return {
    art: found ? resolvePreview(fgc.assetBase, library?.code || "", found.code, player.skin || 0) : "",
    icon: found?.icon || "",
  };
}

function Art({ art, icon }: { art: string; icon: string }) {
  const [src, setSrc] = useState(art || icon);
  if (!src) {
    return (
      <div className="flex h-full flex-col items-center justify-end pb-2 text-white/25">
        <div className="h-[18%] w-[22%] rounded-full bg-white/25" />
        <div className="mt-1 h-[46%] w-[38%] bg-white/20" style={{ clipPath: "polygon(18% 0, 82% 0, 100% 100%, 0 100%)" }} />
      </div>
    );
  }
  return <img src={src} alt="" className="h-full w-full object-contain object-bottom" onError={() => setSrc(icon && src !== icon ? icon : "")} />;
}

function Flag({ src }: { src: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={src} alt="" className="h-5 w-8 object-cover" onError={() => setOk(false)} />;
}

function medal(label: string): { fill: string; ink: string } | null {
  if (label.startsWith("1")) return { fill: "#d4af37", ink: "#1a1408" };
  if (label.startsWith("2")) return { fill: "#c5c9ce", ink: "#1a1408" };
  if (label.startsWith("3")) return { fill: "#b87333", ink: "#1a1408" };
  return null;
}

function Place({ label, big = false, ink = "#fff" }: { label: string; big?: boolean; ink?: string }) {
  const number = label.replace(/\D/g, "");
  const suffix = label.replace(/[0-9]/g, "");
  return (
    <span className={`font-display font-semibold leading-none ${big ? "text-[4.6rem]" : "text-[2.7rem]"}`} style={{ color: ink }}>
      {number}
      <sup className="ml-0.5 align-super text-[0.38em] tracking-tight">{suffix}</sup>
    </span>
  );
}

function Card({ fgc, player, label, big = false }: { fgc: FgcState; player: FgcPlayer | null; label: string; big?: boolean }) {
  const pictures = renderOf(fgc, player);
  const name = player?.tag.trim() ? cleanSpeech(playerLabel(player), fgc.settings.profanity) : "";
  const handle = fgc.settings.show.social && player?.twitter ? `@${player.twitter.replace(/^@/, "")}` : "";
  const flags = fgc.settings.show.location && player
    ? [countryFlagUrl(player.country, player.flag), stateFlagUrl(player.country, player.flag, player.region)].filter(Boolean)
    : [];
  const tone = medal(label);
  return (
    <div
      className="relative flex min-h-0 flex-col overflow-hidden bg-[#12141a]"
      style={{
        clipPath: big
          ? "polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 22px 100%, 0 calc(100% - 22px))"
          : "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 14px 100%, 0 calc(100% - 14px))",
        backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0 10px, transparent 10px 22px)",
        boxShadow: `inset 0 0 0 1px ${tone?.fill ?? "rgba(225,6,0,0.85)"}`,
      }}
    >
      <div className={`absolute top-0 left-0 z-10 pr-3 pl-2 ${big ? "py-1" : "py-0.5"}`} style={{ background: tone?.fill ?? "#e10600", clipPath: "polygon(0 0, 100% 0, 88% 100%, 0 100%)" }}>
        <Place label={label} big={big} ink={tone?.ink} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-3 pt-2 pb-1">
        <Art key={`${pictures.art}|${pictures.icon}`} art={pictures.art} icon={pictures.icon} />
      </div>
      <div className="bg-black/80 px-3 pt-1 pb-2">
        <p className={`truncate font-display font-semibold tracking-wide text-white uppercase ${big ? "text-[2.25rem]" : "text-[1.45rem]"}`}>{name || "Player"}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-white/75 ${big ? "text-[1.15rem]" : "text-[0.95rem]"}`}>{handle}</p>
          {flags.length ? (
            <span className="flex gap-1">
              {flags.map((src) => (
                <Flag key={src} src={src} />
              ))}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RokTop8() {
  const fgc = useLiveFgc();
  const rows = players(fgc);
  const event = [fgc.event?.name, fgc.event?.startAt, fgc.event?.game].filter(Boolean).join("  ·  ");
  return (
    <div
      className="relative h-full w-full overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(118deg, transparent 0 6%, #e10600 6.1% 7.1%, transparent 7.2% 11%, #1b1b1b 11.1% 16%, transparent 16.1%), linear-gradient(298deg, transparent 0 6%, #e10600 6.1% 7.1%, transparent 7.2% 11%, #1b1b1b 11.1% 16%, transparent 16.1%), #07080c",
      }}
    >
      <div className="grid h-full grid-cols-[1.15fr_3.15fr] grid-rows-[102px_1fr_78px] gap-2.5 p-4">
        <header className="col-span-2 flex items-stretch gap-3">
          <img src="/brand/rok-mark.png" alt="" className="h-full w-auto bg-white object-contain px-2" />
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <p className="font-display text-[3.1rem] leading-none font-semibold tracking-wide uppercase">ROK Gaming Lounge</p>
            <p className="mt-2 truncate font-mono text-sm tracking-[0.22em] text-white/70 uppercase">{event || "Event name  ·  Date  ·  Game"}</p>
          </div>
          <div className="grid place-items-center bg-[#e10600] px-8" style={{ clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%)" }}>
            <p className="font-display text-5xl font-semibold tracking-wide">TOP 8</p>
          </div>
        </header>
        <Card fgc={fgc} player={rows[0]} label={PLACES[0]} big />
        <div className="grid min-h-0 grid-rows-2 gap-2.5">
          <div className="grid min-h-0 grid-cols-3 gap-2.5">
            {rows.slice(1, 4).map((player, index) => (
              <Card key={index + 1} fgc={fgc} player={player} label={PLACES[index + 1]} />
            ))}
          </div>
          <div className="grid min-h-0 grid-cols-4 gap-2.5">
            {rows.slice(4).map((player, index) => (
              <Card key={index + 4} fgc={fgc} player={player} label={PLACES[index + 4]} />
            ))}
          </div>
        </div>
        <footer className="col-span-2 flex items-center justify-center gap-6 px-8">
          <span className="h-px w-16 bg-[#e10600]" />
          <p className="font-mono text-xs tracking-[0.28em] text-white/70 uppercase">Partners</p>
          {(fgc.sponsors ?? []).filter((row) => row.logo).map((row) => (
            <img key={row.id} src={row.logo} alt={row.name} className="h-12 max-w-40 object-contain" />
          ))}
          <span className="h-px w-16 bg-[#e10600]" />
        </footer>
      </div>
    </div>
  );
}
