import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeSignupCode } from "@/lib/remote-signup-code";

export const Route = createFileRoute("/join/")({
  ssr: false,
  component: JoinIndex,
});

function JoinIndex() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-bg px-4 text-fg">
      <p className="font-mono text-[0.62rem] tracking-[0.2em] text-muted uppercase">ROK · Sign up</p>
      <h1 className="font-display mt-1 text-4xl font-semibold uppercase">Enter your event code</h1>
      <p className="mt-2 text-sm text-muted">The code is on the link from the lounge. This page is only the sign-up form.</p>
      <form
        className="mt-6 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const next = normalizeSignupCode(code);
          if (next.length < 4) {
            setError("Enter the code from your link.");
            return;
          }
          void navigate({ to: "/join/$code", params: { code: next } });
        }}
      >
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Event code"
          autoCapitalize="characters"
          autoComplete="off"
          className="h-12 text-center font-mono text-lg tracking-[0.2em]"
        />
        {error ? <p className="text-sm text-live">{error}</p> : null}
        <Button type="submit" className="min-h-12">
          Continue
        </Button>
      </form>
    </main>
  );
}
