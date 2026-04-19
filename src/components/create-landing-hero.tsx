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
      className={`relative z-10 w-full ${isInline ? "max-w-none px-0" : integrated ? "max-w-none px-4 py-6 sm:px-6 sm:py-8 lg:mx-auto lg:max-w-6xl lg:px-8" : "max-w-6xl px-4 sm:px-6 lg:mx-auto"}`}
      aria-labelledby="create-hero-heading"
    >
      {!isInline && !integrated ? (
        <>
          <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl animate-hero-glow" />
          <div className="pointer-events-none absolute -right-20 top-8 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl animate-hero-glow-delayed" />
        </>
      ) : null}

      <div
        className={`relative ${
          isInline || integrated ? "overflow-visible" : "overflow-hidden"
        } ${
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
          className={`relative grid items-center ${isInline ? "gap-8 md:grid-cols-[1fr_260px] md:gap-8" : "grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-10 xl:gap-x-14"}`}
        >
          <div
            className={`text-center ${isInline ? "md:text-left" : "lg:text-left"} ${!isInline ? "mx-auto w-full max-w-xl lg:mx-0" : ""}`}
          >
            {!isInline ? (
              <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 lg:text-left">
                GitDex
              </p>
            ) : null}
            <h2
              id="create-hero-heading"
              className={`font-black leading-[1.08] tracking-tight text-white ${isInline ? "mx-auto max-w-xl text-2xl sm:text-3xl md:mx-0" : "mx-auto text-[clamp(1.875rem,4vw+1rem,2.65rem)] leading-[1.05] lg:mx-0"}`}
            >
              Turn repos into{" "}
              <span className="text-amber-200">battle cards</span>
            </h2>

            {!isInline ? (
              <p className="mt-4 max-w-md text-pretty text-center text-sm leading-relaxed text-slate-400 lg:mx-0 lg:text-left">
                Build a three-card deck from public repositories, then battle the community on the leaderboard.
              </p>
            ) : null}

            {!isInline ? (
              <div className="mt-6 flex flex-col divide-y divide-white/[0.08] overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.03] sm:flex-row sm:divide-x sm:divide-y-0">
                <div className="flex flex-1 flex-col px-4 py-3.5 text-left sm:py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Fighters</p>
                  <p className="mt-1 text-lg font-black tabular-nums text-amber-100 sm:text-xl">{playersLabel}</p>
                </div>
                <div className="flex flex-1 flex-col px-4 py-3.5 text-left sm:py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Cards forged</p>
                  <p className="mt-1 text-lg font-black tabular-nums text-sky-100 sm:text-xl">{cardsLabel}</p>
                </div>
                <div className="flex flex-1 flex-col px-4 py-3.5 text-left sm:py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Best streak</p>
                  <p className="mt-1 text-lg font-black tabular-nums text-emerald-100 sm:text-xl">{streakLabel}</p>
                </div>
              </div>
            ) : null}

            <div className={`mt-6 flex flex-col gap-3 sm:flex-row ${isInline ? "md:justify-start" : "lg:justify-start"}`}>
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
                  className="min-h-12 w-full rounded-xl border border-white/20 bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-sm transition-colors hover:bg-slate-100 active:scale-[0.99] sm:min-h-11 sm:w-auto sm:px-7 sm:text-[0.9375rem]"
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
            className={`relative mx-auto flex w-full justify-center ${isInline ? "max-w-[260px]" : "max-w-[min(100%,380px)] lg:mx-0 lg:max-w-none lg:justify-end"}`}
          >
            <div className="relative w-max max-w-full">
              {!isInline && !integrated ? (
                <div className="pointer-events-none absolute -inset-6 rounded-[2rem] border border-amber-200/20" />
              ) : null}
              <div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-200/15 via-orange-400/8 to-sky-400/8 blur-2xl ${isInline ? "opacity-60" : integrated ? "opacity-40" : "opacity-75"}`}
              />
              <div className="animate-hero-float relative mx-auto w-max max-w-full">
                <div
                  className={
                    isInline
                      ? "scale-[0.8] sm:scale-[0.88]"
                      : "scale-[0.9] sm:scale-[0.94] lg:scale-[1.02] xl:scale-105"
                  }
                >
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
