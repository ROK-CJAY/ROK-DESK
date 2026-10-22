import { createFileRoute } from "@tanstack/react-router";
import { oauthCallbackResponse } from "@/lib/startgg-oauth";

export const Route = createFileRoute("/api/startgg-oauth/callback")({
  server: {
    handlers: {
      GET: ({ request }) => oauthCallbackResponse(request),
    },
  },
});
