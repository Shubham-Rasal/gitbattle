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

  const stripeBg = {
    backgroundImage:
      "repeating-linear-gradient(110deg, rgba(248,250,252,0.055) 0, rgba(248,250,252,0.055) 1px, transparent 1px, transparent 15px)",
  } as const;

  return (
    <section
      className={`relative z-10 w-full ${
        isInline
          ? "mx-auto max-w-[80rem] px-4 sm:px-6 lg:px-8"
          : integrated
            ? "mx-auto max-w-[80rem] px-4 pb-2 pt-2 sm:px-6 sm:pb-3 sm:pt-4 lg:px-10"
            : "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
      }`}
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
            ? "rounded-2xl border border-white/[0.1] bg-black/40 px-5 py-8 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-md sm:px-8 sm:py-10 md:py-11"
            : integrated
              ? "rounded-2xl border border-white/[0.09] bg-black/40 px-5 py-8 shadow-[0_28px_90px_-36px_rgba(0,0,0,0.9)] backdrop-blur-md sm:px-8 sm:py-10 md:px-10 md:py-12"
              : "rounded-2xl border border-white/10 bg-black/50 px-5 py-8 shadow-lg shadow-black/25 backdrop-blur-md sm:px-8 sm:py-9 lg:px-10 lg:py-10"
        }`}
      >
        {!isInline && !integrated ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.2]" style={stripeBg} />
        ) : null}
        {integrated ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.14]" style={stripeBg} />
        ) : null}
        {isInline ? (
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.12]" style={stripeBg} />
        ) : null}

        <div
          className={`relative mx-auto w-full max-w-[56rem] 2xl:max-w-[60rem] ${
            isInline
              ? "grid grid-cols-1 items-center gap-10 md:grid-cols-[1fr_minmax(260px,340px)] md:gap-10 lg:gap-12"
              : "grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-8 xl:gap-x-16"
          }`}
        >
          <div
            className={`text-center ${isInline ? "md:text-left" : "lg:text-left"} ${
              !isInline ? "mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none lg:pr-4 xl:pr-6" : "md:max-w-xl md:justify-self-start"
            }`}
          >
            {!isInline ? (
              <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 lg:text-left">
                GitBattle
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
              <p className="mt-5 max-w-md text-pretty text-center text-sm leading-relaxed text-slate-400 lg:mx-0 lg:mt-4 lg:text-left">
                Build a three-card deck from public repositories, then battle the community on the leaderboard.
              </p>
            ) : null}

            {!isInline ? (
              <div className="mt-7 flex flex-col divide-y divide-white/[0.08] overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.03] sm:mt-6 sm:flex-row sm:divide-x sm:divide-y-0">
                <div className="flex flex-1 flex-col px-4 py-3.5 text-left sm:px-5 sm:py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Fighters</p>
                  <p className="mt-1 text-lg font-black tabular-nums text-amber-100 sm:text-xl">{playersLabel}</p>
                </div>
                <div className="flex flex-1 flex-col px-4 py-3.5 text-left sm:px-5 sm:py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Cards forged</p>
                  <p className="mt-1 text-lg font-black tabular-nums text-sky-100 sm:text-xl">{cardsLabel}</p>
                </div>
                <div className="flex flex-1 flex-col px-4 py-3.5 text-left sm:px-5 sm:py-4">
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
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-sm transition-colors hover:bg-slate-100 active:scale-[0.99] sm:min-h-11 sm:w-auto sm:px-8 sm:text-[0.9375rem]"
                >
                  <svg className="h-5 w-5 shrink-0 opacity-90" viewBox="0 0 98 96" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.245-22.243-5.52-22.243-24.634 0-5.42 1.94-9.865 5.127-13.317-.52-1.28-2.237-6.405.487-13.317 0 0 4.2-1.343 13.754 5.052 3.962-1.092 8.28-1.64 12.52-1.64 4.247 0 8.56.548 12.52 1.64 9.553-6.395 13.747-5.052 13.747-5.052 2.734 6.912 1.016 12.037.507 13.317 3.195 3.452 5.123 7.898 5.123 13.317 0 19.24-11.414 23.382-22.265 24.61 1.755 1.552 3.317 4.554 3.317 9.188 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.32 2.364 19.412-6.52 33.405-24.936 33.405-46.692C97.707 22 75.788 0 48.854 0z"
                    />
                  </svg>
                  Sign in with GitHub
                </button>
              )}
            </div>

            {isSignedIn && !isInline ? (
              <p className="mt-2 text-center text-[11px] text-slate-500 lg:text-left">{usernameLabel}</p>
            ) : null}
          </div>

          <div
            className={`relative mx-auto flex w-full justify-center ${isInline ? "max-w-[340px] md:max-w-none md:justify-self-center" : "max-w-[min(100%,400px)] lg:mx-0 lg:max-w-none lg:justify-center xl:justify-end"}`}
          >
            <div className="relative w-max max-w-full">
              {!isInline && !integrated ? (
                <div className="pointer-events-none absolute -inset-6 rounded-[2rem] border border-amber-200/20" />
              ) : null}
              {integrated && !isInline ? (
                <div className="pointer-events-none absolute -inset-5 rounded-[1.75rem] border border-amber-200/15 sm:-inset-6" />
              ) : null}
              {isInline ? (
                <div className="pointer-events-none absolute -inset-4 rounded-3xl border border-amber-200/12" />
              ) : null}
              <div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-200/15 via-orange-400/8 to-sky-400/8 blur-2xl ${isInline ? "opacity-60" : integrated ? "opacity-45" : "opacity-75"}`}
              />
              <div className="animate-hero-float relative mx-auto w-max max-w-full">
                <div
                  className={
                    isInline
                      ? "scale-[0.82] sm:scale-[0.9] md:scale-[0.92]"
                      : "scale-[0.9] sm:scale-[0.94] lg:scale-[0.98] xl:scale-[1.03]"
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
