"use client";

import { useEffect, useState } from "react";
import PokemonCardComponent from "@/components/pokemon-card";
import Spinner from "@/components/spinner";
import { DEMO_PREVIEW_CARD } from "@/lib/demo-card";
import type { PublicArenaStats } from "@/types/game";

type CreateLandingHeroProps = {
  isSignedIn: boolean;
  githubUsername?: string;
  loading: boolean;
  onSignIn: () => void;
  onBuildDeck?: () => void;
  /** "full" = create tab; "inline" = smaller strip (e.g. leaderboard teaser) */
  layout?: "full" | "inline";
  /** Rendered inside AppShell with SiteHeader — no duplicate outer card */
  integrated?: boolean;
};

export default function CreateLandingHero({
  isSignedIn,
  githubUsername,
  loading,
  onBuildDeck = () => {},
  onSignIn,
  layout = "full",
  integrated = false,
}: CreateLandingHeroProps) {
  const isInline = layout === "inline";
  const usernameLabel = githubUsername ? `@${githubUsername}` : "your account";

  const [arenaStats, setArenaStats] = useState<PublicArenaStats | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);

  useEffect(() => {
    if (isInline) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) {
          if (!cancelled) setStatsFailed(true);
          return;
        }
        const data = (await res.json()) as PublicArenaStats;
        if (!cancelled) {
          setArenaStats(data);
          setStatsFailed(false);
        }
      } catch {
        if (!cancelled) setStatsFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isInline]);

  const statPending = !isInline && arenaStats == null && !statsFailed;
  const dash = "—";

  const playersLabel = statPending
    ? "…"
    : arenaStats != null
      ? `${arenaStats.playerCount.toLocaleString()} ${arenaStats.playerCount === 1 ? "Player" : "Players"}`
      : dash;
  const cardsLabel = statPending
    ? "…"
    : arenaStats?.cardsForged != null
      ? arenaStats.cardsForged.toLocaleString()
      : dash;
  const streakLabel = statPending
    ? "…"
    : arenaStats != null
      ? `${arenaStats.bestWinStreak.toLocaleString()} ${arenaStats.bestWinStreak === 1 ? "Win" : "Wins"}`
      : dash;

  return (
    <section
      className={`relative z-10 w-full ${isInline ? "max-w-none px-0" : integrated ? "max-w-none px-4 py-6 sm:px-6 sm:py-8 lg:mx-auto lg:max-w-7xl lg:px-8" : "max-w-5xl px-1 sm:px-3"}`}
      aria-labelledby="create-hero-heading"
    >
      {!isInline && !integrated ? (
        <>
          <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl animate-hero-glow" />
          <div className="pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl animate-hero-glow-delayed" />
        </>
      ) : null}

      <div
        className={`relative overflow-hidden ${
          isInline
            ? "rounded-3xl border border-white/10 bg-black/35 px-4 py-5"
            : integrated
              ? "rounded-none border-0 bg-transparent px-0 py-0 shadow-none"
              : "rounded-2xl border border-white/10 bg-black/50 px-4 py-6 shadow-lg shadow-black/25 backdrop-blur-md sm:px-6 sm:py-7 lg:px-8 lg:py-8"
        }`}
      >
        {!isInline && !integrated ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.2]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(110deg, rgba(248,250,252,0.06) 0, rgba(248,250,252,0.06) 1px, transparent 1px, transparent 15px)",
            }}
          />
        ) : null}

        <div
          className={`relative grid items-center gap-8 ${isInline ? "md:grid-cols-[1fr_260px] md:gap-8" : "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-10 xl:gap-12"}`}
        >
          <div className={`text-center ${isInline ? "md:text-left" : "lg:text-left"}`}>
            <h2
              id="create-hero-heading"
              className={`max-w-xl font-black leading-[1.08] tracking-tight text-white ${isInline ? "mx-auto text-2xl sm:text-3xl md:mx-0" : "mx-auto text-3xl sm:text-4xl lg:mx-0 lg:text-[2.35rem] lg:leading-[1.06]"}`}
            >
              Turn repos into{" "}
              <span className="text-yellow-300">battle cards</span>
            </h2>

            {!isInline ? (
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
                <div className="rounded-xl border border-amber-200/20 bg-black/35 px-3 py-2.5 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Fighters</p>
                  <p className="mt-1 text-xl font-black text-amber-200 tabular-nums">{playersLabel}</p>
                </div>
                <div className="rounded-xl border border-sky-200/20 bg-black/35 px-3 py-2.5 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Cards Forged</p>
                  <p className="mt-1 text-xl font-black text-sky-200 tabular-nums">{cardsLabel}</p>
                </div>
                <div className="rounded-xl border border-emerald-200/20 bg-black/35 px-3 py-2.5 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Best Win Streak</p>
                  <p className="mt-1 text-xl font-black text-emerald-200 tabular-nums">{streakLabel}</p>
                </div>
              </div>
            ) : null}

            <div className={`mt-5 flex flex-col gap-3 sm:flex-row ${isInline ? "md:justify-start" : "lg:justify-start"}`}>
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
                  className="min-h-12 w-full rounded-2xl border border-white/25 bg-white px-6 py-3.5 text-base font-black text-slate-900 shadow-lg transition-all hover:bg-slate-100 active:scale-[0.98] sm:min-h-0 sm:w-auto sm:px-8 sm:text-base"
                >
                  Sign in with GitHub
                </button>
              )}
            </div>

            {isSignedIn && !isInline ? (
              <p className="mt-2 text-center text-[11px] text-slate-500 lg:text-left">{usernameLabel}</p>
            ) : null}
          </div>

          <div
            className={`relative mx-auto flex justify-center ${isInline ? "max-w-[260px]" : "w-full max-w-[min(100%,360px)] lg:mx-0 lg:justify-end"}`}
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
                  <PokemonCardComponent card={DEMO_PREVIEW_CARD} variant="landing" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
