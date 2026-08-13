import { createFileRoute, Link } from "@tanstack/react-router";
import { OVERLAY_SOURCES } from "@/components/desk/sources";

export const Route = createFileRoute("/overlay/")({
  component: OverlayIndex,
});

function OverlayIndex() {
  return (
    <div className="min-h-screen bg-ov-bg px-10 py-12 text-ov-fg">
      <p className="font-mono text-xs tracking-[0.24em] text-ov-muted uppercase">ROK Desk</p>
      <h1 className="font-display mt-1 text-4xl font-semibold uppercase">Browser sources</h1>
      <ul className="mt-8 max-w-xl space-y-2">
        {OVERLAY_SOURCES.map((source) => (
          <li key={source.id}>
            <Link to={source.path} className="text-lg text-ov-fg underline-offset-4 hover:underline">
              {source.name}
            </Link>
            <span className="ml-2 text-sm text-ov-muted">{source.size}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
