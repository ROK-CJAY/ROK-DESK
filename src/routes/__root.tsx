import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "ROK Desk";
const host = import.meta.env.VITE_PUBLIC_HOSTNAME;
const ogImage = host
  ? `https://${host}/og.jpg`
  : undefined;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: "ROK Esports production desk — live vMix overlays for TCG, VGC, and tabletop." },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "theme-color", content: "#0b0c0e" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: "Centralized stream control for ROK Esports." },
      { property: "og:type", content: "website" },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
          ]
        : []),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700&family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Nunito+Sans:wght@500;600;700&family=Oswald:wght@500;600;700&family=Roboto+Mono:wght@500;600&family=Source+Sans+3:wght@500;600;700&family=Teko:wght@500;600;700&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const overlay = pathname.includes("/overlay");
  const print = pathname.startsWith("/print");
  const kiosk = pathname === "/pod" || pathname === "/tablet" || pathname === "/signup" || pathname.endsWith("/signup");

  return (
    <html lang="en" className={overlay || print ? "overlay-mode" : kiosk ? "pod-mode dark" : "dark antialiased"} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className={overlay || print ? "overlay-body" : kiosk ? "pod-body" : "min-h-dvh bg-bg text-fg antialiased"}>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
