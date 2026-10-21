import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tsh/assets/country_flag/$")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const code = String(params._splat || "").replace(/\.png$/i, "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 2);
        if (!code) return new Response(null, { status: 404 });
        return Response.redirect(`https://flagcdn.com/w80/${code}.png`, 302);
      },
    },
  },
});
