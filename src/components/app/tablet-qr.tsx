import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/cn";
import type { GameId } from "@/lib/games";
import {
  TABLET_SLOTS,
  TABLET_SURFACES,
  TABLET_TITLES,
  type TabletSlot,
  type TabletSurface,
  tabletJoinUrl,
} from "@/lib/tablet-join";

type HostInfo = {
  port: number;
  local: string;
  lan: string[];
};

export function TabletQr() {
  const [info, setInfo] = useState<HostInfo | null>(null);
  const [base, setBase] = useState("");
  const [gameId, setGameId] = useState<GameId>("pokemon-tcg");
  const [slot, setSlot] = useState<TabletSlot>(1);
  const [surface, setSurface] = useState<TabletSurface>("judge");
  const [qr, setQr] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/host-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HostInfo | null) => {
        if (cancelled || !data) return;
        setInfo(data);
        const lan = data.lan.filter((url) => url !== data.local);
        setBase(lan[0] || data.lan[0] || data.local);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const surfaceMeta = TABLET_SURFACES.find((s) => s.id === surface)!;
  const joinUrl = useMemo(
    () => (base ? tabletJoinUrl(base, gameId, slot, surface) : ""),
    [base, gameId, slot, surface],
  );

  useEffect(() => {
    if (!joinUrl) {
      setQr("");
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 360,
      color: { dark: "#111111", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  if (!info) return null;

  const lanBases = [...new Set([info.local, ...info.lan])];

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">Android companion</p>
      <h2 className="font-display mt-1 text-xl font-semibold uppercase">Scan onto a tablet</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Open <strong>ROK Desk Tablet</strong> on the pad and scan this code. Same Wi‑Fi as this PC. Default port is{" "}
        {info.port}. The APK is a fullscreen shell — pairings and clocks still live on the desk.
      </p>

      {lanBases.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {lanBases.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setBase(url)}
              className={cn(
                "rounded-md border px-2.5 py-1 font-mono text-[0.7rem]",
                url === base ? "border-accent bg-accent/15 text-fg" : "border-border text-muted hover:text-fg",
              )}
            >
              {url}
              {url === info.local ? " · this PC" : ""}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-4 font-mono text-[0.65rem] tracking-[0.16em] text-subtle uppercase">Title</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TABLET_TITLES.map((title) => (
          <Chip key={title.id} active={gameId === title.id} onClick={() => setGameId(title.id)} title={title.name}>
            {title.label}
          </Chip>
        ))}
      </div>

      {surfaceMeta.needsSlot ? (
        <>
          <p className="mt-4 font-mono text-[0.65rem] tracking-[0.16em] text-subtle uppercase">Table</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TABLET_SLOTS.map((row) => (
              <Chip key={row.id} active={slot === row.id} onClick={() => setSlot(row.id)}>
                {row.label}
              </Chip>
            ))}
          </div>
        </>
      ) : null}

      <p className="mt-4 font-mono text-[0.65rem] tracking-[0.16em] text-subtle uppercase">Surface</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TABLET_SURFACES.map((row) => (
          <Chip key={row.id} active={surface === row.id} onClick={() => setSurface(row.id)}>
            {row.label}
          </Chip>
        ))}
      </div>

      <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {qr ? (
          <img src={qr} alt="" className="size-44 rounded-lg border border-border bg-white p-2 sm:size-52" />
        ) : (
          <div className="size-44 rounded-lg border border-border bg-surface-2 sm:size-52" />
        )}
        <div className="min-w-0">
          <p className="text-xs text-subtle">ROK Desk Tablet scans this. Any camera app can open it in a browser too.</p>
          <code className="mt-2 block break-all rounded bg-surface-2 px-2 py-1.5 font-mono text-[0.75rem] text-fg">
            {joinUrl}
          </code>
        </div>
      </div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium",
        active ? "border-accent bg-accent/15 text-fg" : "border-border text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
