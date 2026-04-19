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
  const usernameLabel = githubUsername ? `@${githubUsername}` : "your account";

  return (
    <section
      className={`relative z-10 w-full max-w-6xl ${isInline ? "px-0" : "px-1 sm:px-3"}`}
      aria-labelledby="create-hero-heading"
    >
      {!isInline ? (
        <>
          <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl animate-hero-glow" />
          <div className="pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl animate-hero-glow-delayed" />
          <div className="pointer-events-none absolute inset-x-12 top-4 h-px bg-gradient-to-r from-transparent via-yellow-200/45 to-transparent" />
        </>
      ) : null}

      <div
        className={`relative overflow-hidden rounded-3xl border ${
          isInline
            ? "border-white/10 bg-black/35 px-4 py-5"
            : "border-yellow-300/25 bg-gradient-to-br from-[#0a1324]/90 via-[#071326]/95 to-[#070b14]/95 px-4 py-6 shadow-[0_30px_90px_-50px_rgba(245,158,11,0.7)] sm:px-6 sm:py-7 lg:px-8 lg:py-8"
        }`}
      >
        {!isInline ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                "repeating-linear-gradient(110deg, rgba(248,250,252,0.09) 0, rgba(248,250,252,0.09) 1px, transparent 1px, transparent 15px)",
            }}
          />
        ) : null}

        <div
          className={`relative grid items-center gap-8 ${isInline ? "md:grid-cols-[1fr_260px]" : "lg:grid-cols-[minmax(0,1fr)_minmax(320px,410px)]"} lg:gap-10`}
        >
          <div className={`text-center ${isInline ? "md:text-left" : "lg:text-left"}`}>
            <div className={`mb-3 flex flex-wrap justify-center gap-2 ${isInline ? "md:justify-start" : "lg:justify-start"}`}>
              <span className="rounded-full border border-amber-200/40 bg-amber-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
                Season 01 Live
              </span>
              <span className="rounded-full border border-sky-300/35 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100">
                Battle Royale Lobby
              </span>
            </div>

            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-100/90 sm:text-[11px] sm:tracking-[0.28em]">
              Drop in. Draft fast. Outplay everyone.
            </p>
            <h2
              id="create-hero-heading"
              className={`font-black leading-[1.02] tracking-tight text-white ${isInline ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}
            >
              Forge your repo deck for
              <span className="block text-yellow-300">Pokemon Battle Royale</span>
            </h2>
            <p className={`mt-3 text-pretty ${isInline ? "text-sm text-slate-300" : "text-base text-slate-300 sm:text-lg"}`}>
              Convert real GitHub repos into card fighters, queue for random battles, and climb the arena leaderboard one win at a time.
            </p>

            <div className={`mt-4 flex flex-wrap justify-center gap-2 ${isInline ? "md:justify-start" : "lg:justify-start"}`}>
              {[
                "Stars -> HP",
                "Commits -> Power",
                "One tap matchmaking",
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-200 sm:text-[11px]"
                >
                  {chip}
                </span>
              ))}
            </div>

            {!isInline ? (
              <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="rounded-xl border border-amber-200/20 bg-black/35 px-3 py-2.5 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Queue</p>
                  <p className="mt-1 text-xl font-black text-amber-200">99 Players</p>
                </div>
                <div className="rounded-xl border border-sky-200/20 bg-black/35 px-3 py-2.5 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Cards Forged</p>
                  <p className="mt-1 text-xl font-black text-sky-200">12,840</p>
                </div>
                <div className="rounded-xl border border-emerald-200/20 bg-black/35 px-3 py-2.5 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Best Win Streak</p>
                  <p className="mt-1 text-xl font-black text-emerald-200">14 Wins</p>
                </div>
              </div>
            ) : null}

            <div className={`mt-7 flex flex-col gap-3 sm:flex-row ${isInline ? "md:justify-start" : "lg:justify-start"}`}>
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={onBuildDeck}
                  disabled={loading}
                  className="group relative min-h-14 w-full overflow-hidden rounded-2xl border border-yellow-200/50 bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-400 px-6 py-4 text-base font-black text-slate-900 shadow-[0_0_40px_-8px_rgba(251,191,36,0.75)] transition-all hover:shadow-[0_0_52px_-6px_rgba(251,191,36,0.9)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 sm:w-auto sm:px-10 sm:text-lg"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <Spinner text="Scanning repos..." />
                    ) : (
                      <>
                        Enter the Arena
                        <span className="text-lg transition-transform group-hover:translate-x-0.5" aria-hidden>
                          -&gt;
                        </span>
                      </>
                    )}
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="min-h-14 w-full rounded-2xl border border-white/25 bg-white px-6 py-4 text-base font-black text-slate-900 shadow-lg transition-all hover:bg-slate-100 active:scale-[0.98] sm:min-h-0 sm:w-auto sm:px-10 sm:text-lg"
                >
                  Sign in with GitHub to drop in
                </button>
              )}
            </div>

            {isSignedIn && !isInline ? (
              <p className="mt-3 text-center text-xs text-slate-400 lg:text-left">
                Deck builder synced with <span className="font-bold text-amber-100">{usernameLabel}</span>. One tap loads your public repos.
              </p>
            ) : null}
          </div>

          <div
            className={`relative mx-auto flex justify-center ${isInline ? "max-w-[260px]" : "w-full max-w-[360px] lg:mx-0 lg:justify-end"}`}
          >
            <div className="relative">
              {!isInline ? (
                <div className="pointer-events-none absolute -inset-6 rounded-[2rem] border border-yellow-300/25" />
              ) : null}
              <div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-br from-yellow-300/20 via-orange-400/10 to-sky-400/10 blur-2xl ${isInline ? "opacity-60" : "opacity-90"}`}
              />
              <div className="animate-hero-float relative mx-auto w-max max-w-full">
                <div className={isInline ? "scale-[0.8] sm:scale-[0.88]" : "scale-[0.88] sm:scale-95 lg:scale-100"}>
                  <PokemonCardComponent card={DEMO_PREVIEW_CARD} />
                </div>
              </div>
              {!isInline ? (
                <>
                  <div className="absolute -left-6 top-5 rounded-full border border-red-300/35 bg-red-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-100">
                    Final Circle
                  </div>
                  <div className="absolute -right-6 bottom-16 rounded-full border border-cyan-200/35 bg-cyan-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                    Ranked Match
                  </div>
                </>
              ) : null}
              {!isInline ? (
                <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:text-right">
                  Preview champion card - yours updates from real repo stats
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {!isInline ? (
          <div className="relative mt-6 overflow-hidden rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
            <div className="animate-[pulse_4s_ease-in-out_infinite] text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300 sm:text-[11px]">
              Live feed: @octo-dev just knocked out @merge-master in 7 turns. Queue closes when your deck is ready.
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
