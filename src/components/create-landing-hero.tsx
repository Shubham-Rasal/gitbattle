"use client";

import PokemonCardComponent from "@/components/pokemon-card";
import Spinner from "@/components/spinner";
import { DEMO_PREVIEW_CARD } from "@/lib/demo-card";

type CreateLandingHeroProps = {
  isSignedIn: boolean;
  githubUsername?: string;
  loading: boolean;
  onSignIn: () => void;
  onBuildDeck?: () => void;
  /** "full" = create tab; "inline" = smaller strip (e.g. leaderboard teaser) */
  layout?: "full" | "inline";
};

export default function CreateLandingHero({
  isSignedIn,
  githubUsername,
  loading,
  onBuildDeck = () => {},
  onSignIn,
  layout = "full",
}: CreateLandingHeroProps) {
  const isInline = layout === "inline";

  return (
    <section
      className={`relative z-10 w-full max-w-6xl ${isInline ? "px-0" : "px-1 sm:px-3"}`}
      aria-labelledby="create-hero-heading"
    >
      {!isInline && (
        <>
          <div className="pointer-events-none absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl animate-hero-glow" />
          <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl animate-hero-glow-delayed" />
        </>
      )}

      <div
        className={`relative grid items-center gap-6 ${isInline ? "md:grid-cols-[1fr_280px]" : "lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]"} lg:gap-10`}
      >
        <div className={`text-center ${isInline ? "md:text-left" : "lg:text-left"}`}>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/90 sm:text-[11px] sm:tracking-[0.28em]">
            Free · One tap · Your real repos
          </p>
          <h2
            id="create-hero-heading"
            className={`font-black leading-[1.05] tracking-tight text-white ${isInline ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}
          >
            Turn your GitHub into{" "}
            <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
              battle cards
            </span>
            <span className="text-white">.</span>
          </h2>
          <p className={`mt-3 text-pretty text-slate-400 ${isInline ? "text-sm" : "text-base sm:text-lg"}`}>
            Pick repos, get a deck, fight the leaderboard. Built to screenshot and share.
          </p>

          <div className={`mt-4 flex flex-wrap justify-center gap-2 ${isInline ? "md:justify-start" : "lg:justify-start"}`}>
            {["Stars → HP", "Forks → stats", "Battle online"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300 sm:text-[11px]"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className={`mt-8 flex flex-col gap-3 sm:flex-row ${isInline ? "md:justify-start" : "lg:justify-start"}`}>
            {isSignedIn ? (
              <button
                type="button"
                onClick={onBuildDeck}
                disabled={loading}
                className="group relative min-h-14 w-full overflow-hidden rounded-2xl border border-amber-200/50 bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 px-6 py-4 text-base font-black text-slate-900 shadow-[0_0_40px_-8px_rgba(251,191,36,0.7)] transition-all hover:shadow-[0_0_48px_-6px_rgba(251,191,36,0.85)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 sm:w-auto sm:px-10 sm:text-lg"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <Spinner text="Summoning repos…" />
                  ) : (
                    <>
                      Build my deck
                      <span className="text-lg transition-transform group-hover:translate-x-0.5" aria-hidden>
                        →
                      </span>
                    </>
                  )}
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="min-h-14 w-full rounded-2xl border border-white/20 bg-white px-6 py-4 text-base font-black text-slate-900 shadow-lg transition-all hover:bg-slate-100 active:scale-[0.98] sm:min-h-0 sm:w-auto sm:px-10 sm:text-lg"
              >
                Continue with GitHub — it&apos;s one click
              </button>
            )}
          </div>

          {isSignedIn && !isInline && (
            <p className="mt-3 text-center text-xs text-slate-500 lg:text-left">
              {githubUsername ? (
                <>
                  Deck uses <span className="font-bold text-amber-200/90">@{githubUsername}</span> — one tap loads your repos.
                </>
              ) : (
                <>Uses your GitHub login — one tap to pull your public repos.</>
              )}
            </p>
          )}
        </div>

        <div
          className={`relative mx-auto flex justify-center ${isInline ? "max-w-[280px]" : "w-full max-w-[340px] lg:mx-0 lg:justify-end"}`}
        >
          <div className="relative">
            <div
              className={`absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-400/20 via-fuchsia-500/10 to-transparent blur-2xl ${isInline ? "opacity-60" : ""}`}
            />
            <div className="animate-hero-float relative mx-auto w-max max-w-full">
              <div className={isInline ? "scale-[0.82] sm:scale-90" : "scale-[0.88] sm:scale-95 lg:scale-100"}>
                <PokemonCardComponent card={DEMO_PREVIEW_CARD} />
              </div>
            </div>
            {!isInline && (
              <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 lg:text-right">
                Example card — yours will look like this
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
