import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Field, NativeSelect } from "@/components/desk/field";
import { CommanderSearchField } from "@/components/desk/commander-search";
import { OfficialVgcForm } from "@/components/signup/official-vgc-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRIES } from "@/lib/countries";
import { extraFieldFor, gameOf, isCommanderLane, playerIdField, slugOf, type GameId } from "@/lib/games";
import { catalogForGame } from "@/lib/card-lookup";
import { decklistCount } from "@/lib/decklist";
import { DecklistEditor } from "@/components/signup/decklist-editor";
import { emptySignupDraft, type SignupDraft } from "@/components/signup/signup-types";
import { PlayerIdPrivacy } from "@/components/signup/player-id-privacy";
import { InkPicker } from "@/components/desk/ink-picker";
import { useTournamentStore } from "@/lib/tournament-store";
import { viewTournament } from "@/lib/tournament-types";

export function SignupKiosk({ gameId: pinnedGame }: { gameId?: GameId } = {}) {
  const ready = useTournamentStore((s) => s.ready);
  const hydrate = useTournamentStore((s) => s.hydrate);
  const live = useTournamentStore((s) => s.tournament);
  const t = pinnedGame ? viewTournament(live, pinnedGame) : live;
  const [step, setStep] = useState<"welcome" | "form" | "done">("welcome");
  const [draft, setDraft] = useState<SignupDraft>(() => emptySignupDraft());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ seed: number; name: string; count: number } | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* unsupported */
      }
    };
    void request();
    return () => {
      void lock?.release();
    };
  }, []);

  if (!ready) {
    return <div className="grid h-dvh place-items-center bg-bg text-muted">Loading sign-up…</div>;
  }

  const game = gameOf(t.gameId);
  const extra = extraFieldFor(t.gameId, t.formatName);
  const commander = isCommanderLane(t);
  const idField = playerIdField(t.gameId);
  const closed = t.phase === "complete";
  const vgc = t.gameId === "pokemon-vgc";
  const catalog = catalogForGame(t.gameId);
  const needDeck = Boolean(t.requireDecklist && catalog);
  const showDeck = Boolean(catalog && (needDeck || catalog === "ptcg"));

  const submit = async () => {
    const name = draft.name.trim();
    if (!name) {
      setError("Add your name to continue.");
      return;
    }
    if (draft.playerId.trim() && !draft.idPrivacy) {
      setError("Check the Player ID privacy notice to continue.");
      return;
    }
    if (needDeck && decklistCount(draft.decklist) === 0) {
      setError("This event requires a decklist. Import a Limitless / PTCGL list or add cards.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/tournament/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tag: draft.tag.trim(),
          pronouns: draft.pronouns.trim(),
          country: draft.country,
          deck: draft.deck.trim(),
          extra: commander ? draft.partner.trim() : "",
          playerId: draft.playerId.trim(),
          trainerName: draft.trainerName.trim(),
          switchProfile: draft.switchProfile.trim(),
          ageDivision: draft.ageDivision,
          birthDate: draft.birthDate.trim(),
          team: vgc ? draft.team : undefined,
          ink1: t.gameId === "lorcana" ? draft.ink1 : undefined,
          ink2: t.gameId === "lorcana" ? draft.ink2 : undefined,
          note: draft.note.trim(),
          decklist: draft.decklist,
          game: slugOf(t.gameId),
        }),
      });
      const data = (await res.json()) as { error?: string; seed?: number; name?: string; count?: number };
      if (!res.ok) {
        setError(data.error || "Could not save. Ask the TO.");
        return;
      }
      setResult({
        seed: data.seed ?? t.entrants.length + 1,
        name: data.name ?? name,
        count: data.count ?? t.entrants.length + 1,
      });
      setStep("done");
    } catch {
      setError("Network dropped. Stay on this page and try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDraft(emptySignupDraft());
    setResult(null);
    setError("");
    setStep("welcome");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg" data-game={t.gameId}>
      <header className="sticky top-0 z-10 shrink-0 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-sm">
        <p className="font-mono text-[0.62rem] tracking-[0.2em] text-muted uppercase">ROK · Walk-up sign-up</p>
        <p className="font-display text-xl font-semibold uppercase">
          {t.name}
          <span className="text-muted">
            {" "}
            · {game.short} · {t.formatName}
          </span>
        </p>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {closed ? (
          <section className="rounded-xl border border-border bg-surface p-6 text-center">
            <p className="font-display text-3xl font-semibold uppercase">Registration closed</p>
            <p className="mt-2 text-muted">This event is complete. See the TO if you need a correction.</p>
          </section>
        ) : step === "welcome" ? (
          <section className="rounded-xl border border-border bg-surface p-6">
            <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted uppercase">Your turn</p>
            <h1 className="font-display mt-1 text-4xl font-semibold uppercase">Sign in to the event</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
              This tablet is the walk-up desk for <span className="text-fg">{t.name}</span>
              {vgc
                ? ". Fill the official Video Game Team List — player info plus all six Pokémon — then submit."
                : t.gameId === "lorcana"
                  ? `. Enter your name, ${idField.label}, deck, and up to two inks for ${game.name}.`
                  : commander
                    ? `. Enter your name, ${idField.label}, commander, and partner if you have one.`
                    : `. Enter your name, ${idField.label}, and ${extra.label.toLowerCase()} for ${game.name}.`}
              {showDeck && catalog === "ptcg"
                ? " Paste a Limitless list or shared deck URL, or search cards as a backup."
                : needDeck
                  ? " The TO asked for a full decklist — search each card and set the quantity."
                  : ""}
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-muted">
              <li className="rounded-lg bg-surface-2 px-3 py-3">One player at a time. When you’re done, hand it back.</li>
              <li className="rounded-lg bg-surface-2 px-3 py-3">
                {t.entrants.length} already registered · Bo{t.bestOf} ·{" "}
                {t.bracketType === "double" ? "Double elim" : t.bracketType === "swiss" ? "Swiss" : "Single elim"}
              </li>
            </ul>
            <Button className="mt-6 min-h-12 w-full sm:w-auto" onClick={() => setStep("form")}>
              Start sign-up
              <ChevronRight className="size-4" />
            </Button>
          </section>
        ) : step === "done" && result ? (
          <section className="rounded-xl border border-border bg-surface p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-ok/15 text-ok">
              <Check className="size-7" />
            </div>
            <h1 className="font-display mt-4 text-4xl font-semibold uppercase">You’re in</h1>
            <p className="mt-2 text-lg text-muted">
              {result.name} · seed {result.seed} · {result.count} in the field
            </p>
            <p className="mt-3 text-sm text-muted">Hand the tablet to the next player.</p>
            <Button className="mt-6 min-h-12" onClick={reset}>
              Next player
            </Button>
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-surface p-5">
            {vgc ? (
              <OfficialVgcForm
                eventName={t.name}
                formatName={t.formatName}
                draft={draft}
                error={error}
                busy={busy}
                onChange={setDraft}
                onCancel={reset}
                onSubmit={() => void submit()}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="font-mono text-[0.62rem] tracking-[0.18em] text-muted uppercase">Player card</p>
                    <h1 className="font-display text-3xl font-semibold uppercase">Your details</h1>
                  </div>
                  <button type="button" className="text-sm text-muted underline-offset-2 hover:underline" onClick={reset}>
                    Cancel
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Field label="Name" className="sm:col-span-2">
                    <Input
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="As you want it on stream"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Handle">
                    <Input
                      value={draft.tag}
                      onChange={(e) => setDraft((d) => ({ ...d, tag: e.target.value }))}
                      placeholder="optional"
                    />
                  </Field>
                  <Field label="Pronouns">
                    <Input
                      value={draft.pronouns}
                      onChange={(e) => setDraft((d) => ({ ...d, pronouns: e.target.value }))}
                      placeholder="optional"
                    />
                  </Field>
                  <Field label="Country">
                    <NativeSelect
                      value={draft.country}
                      onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} · {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label={idField.label}>
                    <Input
                      value={draft.playerId}
                      onChange={(e) => setDraft((d) => ({ ...d, playerId: e.target.value }))}
                      placeholder={idField.placeholder}
                      inputMode="text"
                      autoComplete="off"
                    />
                    <p className="mt-1 text-[0.7rem] text-muted">{idField.hint}</p>
                  </Field>
                  {t.gameId === "pokemon-tcg" || t.gameId === "pokemon-vgc" ? (
                    <Field label="Date of birth">
                      <Input
                        value={draft.birthDate}
                        onChange={(e) => setDraft((d) => ({ ...d, birthDate: e.target.value }))}
                        placeholder="YYYY-MM-DD"
                      />
                      <p className="mt-1 text-[0.7rem] text-muted">TOM uses this for age division. Optional on the kiosk.</p>
                    </Field>
                  ) : null}
                  {commander ? (
                    <>
                      <Field label="Commander">
                        <CommanderSearchField
                          value={draft.deck}
                          onChange={(deck) => setDraft((d) => ({ ...d, deck }))}
                          placeholder="Search your commander"
                        />
                      </Field>
                      <Field label="Partner">
                        <CommanderSearchField
                          value={draft.partner}
                          onChange={(partner) => setDraft((d) => ({ ...d, partner }))}
                          placeholder="Optional — Partner, Background…"
                        />
                        <p className="mt-1 text-[0.7rem] text-muted">Leave blank if you only have one commander.</p>
                      </Field>
                    </>
                  ) : (
                    <Field label={extra.label}>
                      <Input
                        value={draft.deck}
                        onChange={(e) => setDraft((d) => ({ ...d, deck: e.target.value }))}
                        placeholder={extra.placeholder}
                      />
                    </Field>
                  )}
                </div>

                {t.gameId === "lorcana" ? (
                  <div className="mt-4">
                    <p className="font-mono mb-2 text-[0.62rem] tracking-[0.16em] text-muted uppercase">Inks</p>
                    <InkPicker
                      ink1={draft.ink1}
                      ink2={draft.ink2}
                      onChange={(next) => setDraft((d) => ({ ...d, ...next }))}
                    />
                  </div>
                ) : null}

                <div className="mt-4">
                  <Field label="Limitless / notes">
                    <Input
                      value={draft.note}
                      onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                      placeholder="Season record, accomplishments — optional"
                    />
                  </Field>
                </div>

                {showDeck && catalog ? (
                  <div className="mt-4">
                    <DecklistEditor
                      catalog={catalog}
                      formatName={t.formatName}
                      value={draft.decklist}
                      onChange={(decklist) => setDraft((d) => ({ ...d, decklist }))}
                      required={needDeck}
                    />
                  </div>
                ) : null}

                {draft.playerId.trim() ? (
                  <div className="mt-4">
                    <PlayerIdPrivacy
                      gameId={t.gameId}
                      accepted={draft.idPrivacy}
                      onAccept={(idPrivacy) => setDraft((d) => ({ ...d, idPrivacy }))}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted">
                    Player ID is optional here. If you add one, you’ll confirm the privacy notice before submit.
                  </p>
                )}

                {error ? <p className="mt-4 text-sm text-live">{error}</p> : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button className="min-h-12 min-w-40" disabled={busy} onClick={() => void submit()}>
                    {busy ? "Saving…" : "Submit"}
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={reset}>
                    Back
                  </Button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
