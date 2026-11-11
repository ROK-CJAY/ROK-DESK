import { createFileRoute } from "@tanstack/react-router";

/**
 * GET  /api/fgc/assets?file=games/<game>/<folder>/<file>.png
 *      Serves a downloaded Tournament Stream Helper skin / stage icon; when it is not on this
 *      desk yet, redirects to StreamHelperAssets so overlays still show it.
 * POST /api/fgc/assets { files: string[], force?: boolean }  downloads (validated) into the desk.
 */
export const Route = createFileRoute("/api/fgc/assets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { readAsset, remoteAssetUrl } = await import("@/lib/fgc-asset-store");
        const file = new URL(request.url).searchParams.get("file") || "";
        const local = await readAsset(file);
        if (local) {
          return new Response(new Uint8Array(local.bytes).buffer as ArrayBuffer, { headers: { "content-type": local.contentType, "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" } });
        }
        const remote = remoteAssetUrl(file);
        if (!remote) return new Response("Bad asset path", { status: 400 });
        return new Response(null, { status: 302, headers: { location: remote, "cache-control": "no-store" } });
      },
      POST: async ({ request }) => {
        const { downloadAssets } = await import("@/lib/fgc-asset-store");
        let body: { files?: unknown; force?: boolean };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const files = Array.isArray(body.files) ? body.files.filter((item): item is string => typeof item === "string").slice(0, 60) : [];
        if (!files.length) return Response.json({ results: [] });
        return Response.json({ results: await downloadAssets(files, { force: !!body.force }) });
      },
    },
  },
});
