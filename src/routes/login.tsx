import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-panel">
        <img src="/brand/rok-mark.png" alt="" className="mb-4 size-10 object-contain" />
        <p className="font-mono text-[0.65rem] tracking-[0.22em] text-muted uppercase">
          ROK Esports
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight uppercase">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-muted">
          Optional. The desk runs without an account — sign in to attach your name to the
          session.
        </p>
        <div className="mt-5 space-y-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
        <Button variant="ghost" className="mt-4 w-full" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
