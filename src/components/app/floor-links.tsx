import { useEffect, useState } from "react";

type HostInfo = {
  port: number;
  local: string;
  lan: string[];
};

export function FloorLinks() {
  const [info, setInfo] = useState<HostInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/host-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HostInfo | null) => {
        if (!cancelled && data?.local) setInfo(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) return null;

  const urls = [info.local, ...info.lan.filter((url) => url !== info.local)];

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">This PC</p>
      <h2 className="font-display mt-1 text-xl font-semibold uppercase">Open on the floor</h2>
      <p className="mt-2 text-sm text-muted">Use localhost on this computer. Use the other address on tablets and OBS on the same Wi‑Fi.</p>
      <ul className="mt-3 space-y-1.5">
        {urls.map((url) => (
          <li key={url}>
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.8rem] text-fg">{url}</code>
            {url === info.local ? (
              <span className="ml-2 text-xs text-subtle">this PC / OBS on this PC</span>
            ) : (
              <span className="ml-2 text-xs text-subtle">phones, tablets, other PCs</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
