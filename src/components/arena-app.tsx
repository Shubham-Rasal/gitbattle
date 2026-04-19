"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BattleResultView } from "@/components/battle-result-view";
import CreateLandingHero from "@/components/create-landing-hero";
import PokemonCardComponent from "@/components/pokemon-card";
import SiteHeader, { tabFromPathname, type AppTab } from "@/components/site-header";
import Spinner from "@/components/spinner";
import { useAuth } from "@/contexts/auth-context";
import { PokemonCard, RepoStats } from "@/types/card";
import { DeckSummary, BattleOutcome, LeaderboardEntry } from "@/types/game";

/* ── Flow ─────────────────────────────────────────── */

type StepState = "input" | "select" | "cards";

/** Stable accent per deck (inactive pill background). */
const DECK_BADGE_BG = [
  "oklch(0.38 0.12 150)",
  "oklch(0.4 0.14 280)",
  "oklch(0.42 0.14 35)",
  "oklch(0.38 0.12 250)",
  "oklch(0.4 0.13 320)",
  "oklch(0.4 0.11 200)",
  "oklch(0.42 0.12 85)",
  "oklch(0.37 0.12 15)",
  "oklch(0.39 0.1 230)",
  "oklch(0.41 0.11 305)",
] as const;

function deckBadgeBackground(deckId: string): string {
  let h = 2166136261;
  for (let i = 0; i < deckId.length; i++) {
    h ^= deckId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return DECK_BADGE_BG[(h >>> 0) % DECK_BADGE_BG.length];
}

/* ── Tiny components ──────────────────────────────── */

function StepIndicator({ step }: { step: StepState }) {
  const steps: { id: StepState; label: string }[] = [
    { id: "input", label: "Profile" },
    { id: "select", label: "Repos" },
    { id: "cards", label: "Deck" },
  ];
  const idx = steps.findIndex((s) => s.id === step);

  function dot(i: number) {
    const done = i < idx;
    const active = i === idx;
    return (
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black tabular-nums transition-colors ${
          active
            ? "bg-amber-300 text-slate-900 shadow-[0_0_20px_-4px_rgba(251,191,36,0.65)]"
            : done
              ? "bg-amber-200/20 text-amber-200 ring-1 ring-amber-200/35"
              : "bg-white/[0.06] text-white/30 ring-1 ring-white/10"
        }`}
        aria-current={active ? "step" : undefined}
      >
        {done ? "✓" : i + 1}
      </span>
    );
  }

  return (
    <div className="mb-8 w-full sm:mb-10">
      <div className="mx-auto w-full max-w-md px-2 sm:max-w-lg">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-x-1 sm:gap-x-2">
          <div className="flex justify-center">{dot(0)}</div>
          <div className={`h-0.5 w-full min-w-[0.75rem] rounded-full ${0 < idx ? "bg-amber-200/40" : "bg-white/10"}`} aria-hidden />
          <div className="flex justify-center">{dot(1)}</div>
          <div className={`h-0.5 w-full min-w-[0.75rem] rounded-full ${1 < idx ? "bg-amber-200/40" : "bg-white/10"}`} aria-hidden />
          <div className="flex justify-center">{dot(2)}</div>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1">
          {steps.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <span
                key={s.id}
                className={`text-center text-[9px] font-bold uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.14em] ${
                  active ? "text-amber-100" : done ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {s.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────── */

export default function ArenaApp() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authLoading, signIn, signOut: ctxSignOut } = useAuth();
  const tab: AppTab = tabFromPathname(pathname);

  /* create flow */
  const [step, setStep] = useState<StepState>("input");
  const githubUsername = user?.user_metadata?.user_name as string | undefined;
  const [username, setUsername] = useState("");
  const [candidates, setCandidates] = useState<RepoStats[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingDeck, setSavingDeck] = useState(false);
  const [deckName, setDeckName] = useState("");

  /* decks */
  const [myDecks, setMyDecks] = useState<DeckSummary[]>([]);
  const [decksLoading, setDecksLoading] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  /** When true with existing decks, show the deck builder hero instead of the roster. */
  const [deckBuilderOpen, setDeckBuilderOpen] = useState(false);

  /* battle */
  const [battleOutcome, setBattleOutcome] = useState<BattleOutcome | null>(null);
  const [battleLoading, setBattleLoading] = useState(false);
  const [battleError, setBattleError] = useState("");

  /* leaderboard */
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [recentDecks, setRecentDecks] = useState<DeckSummary[]>([]);
  const [recentDecksLoading, setRecentDecksLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const gh = user.user_metadata?.user_name as string | undefined;
    if (gh) setUsername(gh);
  }, [user]);

  useEffect(() => {
    if (!pathname.startsWith("/decks")) setDeckBuilderOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (authLoading) return;
    if (pathname.startsWith("/decks") && !user) {
      router.replace("/leaderboard");
    }
  }, [authLoading, pathname, user, router]);

  async function signOut() {
    await ctxSignOut();
    setMyDecks([]);
    setBattleOutcome(null);
    setDeckBuilderOpen(false);
    router.push("/leaderboard");
  }

  /* ── Deck CRUD ──────────────────────────────────── */

  const fetchMyDecks = useCallback(async () => {
    setDecksLoading(true);
    try {
      const res = await fetch("/api/decks");
      const data = await res.json();
      if (res.ok && Array.isArray(data.decks)) {
        setMyDecks(data.decks);
      }
    } catch {
      /* ignore */
    } finally {
      setDecksLoading(false);
    }
  }, []);

  /* Fetch decks when on /decks or when user changes. */
  useEffect(() => {
    if (!user || !pathname.startsWith("/decks")) return;

    const ctrl = new AbortController();

    const loadDecks = async () => {
      setDecksLoading(true);
      try {
        const res = await fetch("/api/decks", { signal: ctrl.signal });
        const data = await res.json();
        if (res.ok && Array.isArray(data.decks)) setMyDecks(data.decks);
      } catch {
        /* aborted or network */
      } finally {
        if (!ctrl.signal.aborted) setDecksLoading(false);
      }
    };

    loadDecks();

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, pathname]);

  useEffect(() => {
    if (myDecks.length === 0) {
      setSelectedDeckId(null);
      return;
    }
    setSelectedDeckId((prev) => {
      if (prev && myDecks.some((d) => d.id === prev)) return prev;
      return myDecks[0].id;
    });
  }, [myDecks]);

  const selectedDeck = useMemo(
    () => (selectedDeckId ? myDecks.find((d) => d.id === selectedDeckId) ?? null : null),
    [myDecks, selectedDeckId],
  );

  async function handleSaveDeck() {
    if (!user || cards.length === 0) return;
    setSavingDeck(true);
    setError("");
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubUsername: username.trim(),
          cards,
          name: deckName.trim() || `${username.trim()}'s Deck`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      clearFlow();
      setDeckBuilderOpen(false);
      router.push("/decks");
      fetchMyDecks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save deck");
    } finally {
      setSavingDeck(false);
    }
  }

  async function handleDeleteDeck(deckId: string) {
    try {
      await fetch(`/api/decks?id=${deckId}`, { method: "DELETE" });
      fetchMyDecks();
    } catch {
      /* ignore */
    }
  }

  /* ── Create flow ────────────────────────────────── */

  function clearFlow() {
    setStep("input");
    setCards([]);
    setCandidates([]);
    setSelectedRepos(new Set());
    setDeckName("");
    setError("");
  }

  function toggleRepo(fullName: string) {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) {
        next.delete(fullName);
      } else if (next.size < 3) {
        next.add(fullName);
      }
      return next;
    });
  }

  async function handleUserSubmit() {
    const handle = githubUsername || username.trim();
    if (!handle || !/^[a-zA-Z0-9-]+$/.test(handle)) {
      setError("Could not determine your GitHub username.");
      return;
    }

    setLoading(true);
    setError("");
    setCards([]);
    setCandidates([]);
    setSelectedRepos(new Set());

    try {
      const res = await fetch(`/api/github?username=${encodeURIComponent(handle)}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.repos)) throw new Error(data.error || "Could not load repositories");
      if (data.repos.length === 0) throw new Error(`No public repositories found for "${handle}"`);
      setCandidates(data.repos);
      setStep("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDeck() {
    if (selectedRepos.size === 0) {
      setError("Pick at least one repository.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const repos = encodeURIComponent(Array.from(selectedRepos).join(","));
      const res = await fetch(`/api/github?username=${encodeURIComponent(username.trim())}&repos=${repos}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.cards)) throw new Error(data.error || "Failed to generate cards");
      setCards(data.cards);
      const generated = data.cards as PokemonCard[];
      const types = [...new Set(generated.map((c: PokemonCard) => c.type))];
      setDeckName(types.length > 0 ? `${username.trim()}'s ${types.join("/")} Deck` : `${username.trim()}'s Deck`);
      setStep("cards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  /* ── Battle ─────────────────────────────────────── */

  async function handleStartBattle(deckId: string, githubUsername: string, vsSelf = false) {
    setBattleLoading(true);
    setBattleError("");
    setBattleOutcome(null);
    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, githubUsername, vsSelf }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Battle failed");
      setBattleOutcome(data as BattleOutcome);
    } catch (err) {
      setBattleError(err instanceof Error ? err.message : "Battle failed");
    } finally {
      setBattleLoading(false);
    }
  }

  /* ── Leaderboard ────────────────────────────────── */

  useEffect(() => {
    if (!pathname.startsWith("/leaderboard")) return;

    const ctrl = new AbortController();
    const loadLeaderboardData = async () => {
      setLbLoading(true);
      setRecentDecksLoading(true);

      fetch("/api/leaderboard", { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.entries)) setLeaderboard(data.entries);
        })
        .catch(() => {})
        .finally(() => setLbLoading(false));

      fetch("/api/decks/recent?limit=6", { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.decks)) setRecentDecks(data.decks);
        })
        .catch(() => {})
        .finally(() => setRecentDecksLoading(false));
    };

    loadLeaderboardData();

    return () => ctrl.abort();
  }, [pathname]);

  /* ── Render ─────────────────────────────────────── */

  if (authLoading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black px-4 text-white">
        <Spinner text="Loading..." />
      </main>
    );
  }

  const unifiedDeckBuilderLanding =
    tab === "decks" &&
    !!user &&
    step === "input" &&
    (deckBuilderOpen || (!decksLoading && myDecks.length === 0));

  return (
    <main
      id="main-content"
      className="relative flex min-h-screen min-h-[100dvh] flex-col items-stretch overflow-x-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:pt-[max(1rem,env(safe-area-inset-top))] md:pb-12"
    >
      {/* BG effects */}
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle at 14% 16%, rgba(250, 204, 21, 0.16) 0, rgba(250, 204, 21, 0) 28%), radial-gradient(circle at 80% 82%, rgba(45, 212, 191, 0.15) 0, rgba(45, 212, 191, 0) 30%), repeating-linear-gradient(110deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 16px)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black" />

      {unifiedDeckBuilderLanding ? (
        <>
          <div className="sticky top-0 z-30 -ml-[max(1rem,env(safe-area-inset-left))] -mr-[max(1rem,env(safe-area-inset-right))] border-b border-white/15 bg-gray-950/85 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] backdrop-blur-md supports-[backdrop-filter]:bg-gray-950/70">
            <SiteHeader
              variant="integrated"
              suppressAuth={!user}
              user={user}
              onSignIn={signIn}
              onSignOut={signOut}
            />
          </div>
          {deckBuilderOpen && myDecks.length > 0 ? (
            <div className="relative z-20 mx-auto w-full max-w-[80rem] px-4 pt-3 sm:px-6 lg:px-10">
              <button
                type="button"
                onClick={() => {
                  clearFlow();
                  setDeckBuilderOpen(false);
                }}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-xs font-bold text-slate-300 transition-colors hover:border-white/25 hover:text-white cursor-pointer"
              >
                ← Back to my decks
              </button>
            </div>
          ) : null}
          <CreateLandingHero
            integrated
            isSignedIn={!!user}
            githubUsername={githubUsername}
            loading={loading}
            onSignIn={signIn}
            onBuildDeck={() => void handleUserSubmit()}
            layout="full"
          />
        </>
      ) : (
        <div className="relative z-10 w-full">
          <SiteHeader user={user} onSignIn={signIn} onSignOut={signOut} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="relative z-10 mx-auto mb-5 w-full max-w-7xl rounded-xl border border-red-500/40 bg-red-500/20 px-3 py-3 text-center text-sm text-red-200 shadow-lg shadow-red-600/20 sm:mb-6 sm:px-4">
          {error}
        </div>
      )}

      {/* ═══════════════ DECK BUILDER (repos → cards) ═══════════════ */}
      {tab === "decks" && user && (step === "select" || (step === "cards" && cards.length > 0)) && (
        <>
          <StepIndicator step={step} />

          {/* Repo picker */}
          {step === "select" && (
            <div className="relative z-10 mx-auto w-full max-w-7xl px-0">
              <div className="mb-6 text-center sm:mb-8 sm:text-left">
                <h3 className="text-lg font-black tracking-tight text-white sm:text-xl">Pick your fighters</h3>
                <p className="mt-1 text-sm text-slate-400">Up to three public repos — stars and commits become card stats.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 xl:gap-5">
                {candidates.map((repo) => {
                  const selected = selectedRepos.has(repo.fullName);
                  const blocked = !selected && selectedRepos.size >= 3;
                  const lang = repo.language?.trim() || "—";
                  const metaBits = [lang];
                  if (repo.watchers > 0) metaBits.push(`${repo.watchers} watching`);
                  return (
                    <label
                      key={repo.fullName}
                      className={`group relative flex cursor-pointer gap-4 rounded-2xl border p-4 transition-all duration-200 sm:p-5 ${
                        selected
                          ? "border-amber-300/50 bg-amber-200/[0.08] ring-1 ring-amber-200/25 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]"
                          : "border-white/10 bg-black/35 hover:border-white/20 hover:bg-black/45"
                      } ${blocked ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={blocked}
                        onChange={() => toggleRepo(repo.fullName)}
                        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-white/20 bg-white/5 text-amber-400 accent-amber-400 focus:ring-2 focus:ring-amber-300/40 focus:ring-offset-0 disabled:cursor-not-allowed"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-black leading-tight text-white [word-break:break-word] sm:text-base">{repo.name}</p>
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-black text-amber-200 ring-1 ring-amber-200/20">
                            <span aria-hidden>★</span>
                            {repo.stars.toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">{repo.fullName}</p>
                        {repo.description ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-snug text-slate-400">{repo.description}</p>
                        ) : null}
                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{metaBits.join(" · ")}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="mt-8 flex flex-col-reverse gap-3 sm:mt-10 sm:flex-row sm:justify-end sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep("input");
                    setCandidates([]);
                    setSelectedRepos(new Set());
                  }}
                  className="min-h-12 w-full rounded-2xl border border-white/15 bg-transparent px-6 py-3.5 text-sm font-black text-slate-200 transition-colors hover:border-white/25 hover:bg-white/5 cursor-pointer sm:w-auto sm:min-h-0 sm:px-8"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateDeck}
                  disabled={loading || selectedRepos.size === 0}
                  className="min-h-12 w-full rounded-2xl border border-amber-200/40 bg-gradient-to-r from-amber-300 to-orange-400 px-8 py-3.5 text-sm font-black text-slate-900 shadow-[0_8px_28px_-8px_rgba(251,191,36,0.55)] transition-all hover:from-amber-200 hover:to-orange-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none cursor-pointer sm:w-auto sm:min-h-0"
                >
                  {loading ? <Spinner /> : `Continue — ${selectedRepos.size} repo${selectedRepos.size === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          )}

          {/* Cards display */}
          {step === "cards" && cards.length > 0 && (
            <div className="relative z-10 mx-auto w-full max-w-7xl px-0">
              <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="px-1 text-center text-xs uppercase tracking-[0.12em] text-slate-300 sm:text-left sm:text-sm sm:tracking-[0.14em]">
                  @{username}&apos;s battle deck
                </p>
                <button
                  type="button"
                  onClick={clearFlow}
                  className="min-h-11 w-full shrink-0 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-black text-white transition-colors hover:bg-white/10 cursor-pointer sm:w-auto sm:min-h-0 sm:py-2"
                >
                  New search
                </button>
              </div>
              <div className="flex flex-col items-center gap-6 animate-fade-in sm:flex-row sm:flex-wrap sm:justify-center sm:gap-7">
                {cards.map((card) => (
                  <PokemonCardComponent key={card.repoFullName} card={card} />
                ))}
              </div>
              {user && (
                <div className="mt-6 flex flex-col items-center gap-3 px-1">
                  <div className="flex w-full max-w-sm items-center gap-2">
                    <input
                      type="text"
                      value={deckName}
                      onChange={(e) => setDeckName(e.target.value)}
                      placeholder="Deck name"
                      className="min-h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white placeholder:text-slate-500 outline-none transition-colors focus:border-amber-200/40 focus:bg-white/[0.07] sm:min-h-0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const types = [...new Set(cards.map((c) => c.type))];
                        setDeckName(types.length > 0 ? `${username.trim()}'s ${types.join("/")} Deck` : `${username.trim()}'s Deck`);
                      }}
                      title="Generate name from card types"
                      className="min-h-11 shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-400 transition-colors hover:border-amber-200/30 hover:text-amber-200 cursor-pointer sm:min-h-0"
                    >
                      Auto
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveDeck}
                    disabled={savingDeck}
                    className="min-h-11 w-full max-w-sm rounded-xl border border-emerald-100/50 bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-3 text-sm font-black text-slate-900 shadow-lg shadow-emerald-200/20 transition-all hover:from-emerald-300 hover:to-teal-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer sm:w-auto sm:max-w-none sm:px-8 sm:min-h-0"
                  >
                    {savingDeck ? <Spinner text="Saving..." /> : "Save Deck to Cloud"}
                  </button>
                </div>
              )}
              {!user && (
                <p className="text-center text-slate-500 text-xs mt-4">Sign in with GitHub to save your deck and battle others.</p>
              )}
            </div>
          )}

        </>
      )}

      {/* ═══════════════ DECKS & BATTLE TAB ═══════════════ */}
      {tab === "decks" && user && step === "input" && !unifiedDeckBuilderLanding && (
        <div className="relative z-10 mx-auto w-full max-w-7xl px-0">
          {/* Battle result view — shown inline when a battle has been fought */}
          {(battleLoading || battleOutcome || battleError) && (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black text-white sm:text-2xl">Battle Arena</h2>
                <button
                  type="button"
                  onClick={() => { setBattleOutcome(null); setBattleError(""); }}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-white/25 hover:text-white cursor-pointer"
                >
                  Back to Decks
                </button>
              </div>

              {battleError && (
                <div className="mx-auto mb-6 max-w-md rounded-xl border border-red-500/40 bg-red-500/20 px-3 py-3 text-center text-sm text-red-200 sm:px-4">
                  {battleError}
                </div>
              )}

              {battleLoading && (
                <div className="flex justify-center py-12 text-white"><Spinner text="Finding opponent and battling..." /></div>
              )}

              {battleOutcome && (
                <BattleResultView outcome={battleOutcome} onNewBattle={() => { setBattleOutcome(null); setBattleError(""); }} />
              )}
            </div>
          )}

          {/* Decks list — always visible unless a battle is in progress */}
          {!battleLoading && !battleOutcome && (
            <>
              <header className="mb-8 flex flex-col gap-5 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/80">Roster</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">My decks</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                    Each deck is three repo cards. Battle online or run a mirror match to test lines.
                  </p>
                </div>
                {myDecks.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearFlow();
                      setDeckBuilderOpen(true);
                    }}
                    className="shrink-0 rounded-xl border border-amber-200/40 bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-3 text-sm font-black text-slate-900 shadow-[0_8px_28px_-8px_rgba(251,191,36,0.45)] transition-all hover:from-amber-200 hover:to-orange-300 active:scale-[0.99] cursor-pointer sm:px-6"
                  >
                    Create deck
                  </button>
                ) : null}
              </header>
              {decksLoading ? (
                <div className="flex justify-center py-12 text-white"><Spinner text="Loading decks..." /></div>
              ) : myDecks.length > 0 ? (
                <div
                  className="overflow-hidden rounded-2xl border border-emerald-900/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                  style={{
                    backgroundColor: "oklch(0.89 0.14 125)",
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent, transparent 7px, oklch(0.35 0.08 150 / 0.06) 7px, oklch(0.35 0.08 150 / 0.06) 8px), repeating-linear-gradient(-45deg, transparent, transparent 7px, oklch(0.35 0.08 150 / 0.06) 7px, oklch(0.35 0.08 150 / 0.06) 8px)",
                  }}
                >
                  <div
                    className="flex flex-wrap items-center justify-center gap-2.5 px-3 py-5 sm:gap-3 sm:px-5 sm:py-6"
                    role="tablist"
                    aria-label="Your decks"
                  >
                    {myDecks.map((deck) => {
                      const isActive = deck.id === selectedDeckId;
                      const idleBg = deckBadgeBackground(deck.id);
                      return (
                        <button
                          key={deck.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          title={deck.name}
                          onClick={() => setSelectedDeckId(deck.id)}
                          style={isActive ? undefined : { backgroundColor: idleBg }}
                          className={`max-w-[min(100%,18rem)] truncate rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-200 sm:px-5 sm:text-[11px] sm:tracking-[0.12em] ${
                            isActive
                              ? "bg-neutral-950 text-white shadow-[0_0_0_2px_rgba(255,255,255,0.92),0_0_0_5px_oklch(0.82_0.12_195_/_0.55)]"
                              : "text-white hover:brightness-110 active:scale-[0.98]"
                          }`}
                        >
                          {deck.name}
                        </button>
                      );
                    })}
                  </div>

                  {selectedDeck ? (
                    <>
                      <div className="border-t border-emerald-950/30 bg-neutral-950/55 px-4 py-4 backdrop-blur-sm sm:px-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-200">
                              @{selectedDeck.githubUsername}
                            </span>
                            <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-2.5 py-0.5 text-[10px] font-black text-amber-100">
                              {selectedDeck.cards.length} card{selectedDeck.cards.length !== 1 ? "s" : ""}
                            </span>
                            <span className="text-[11px] tabular-nums text-slate-400">
                              Saved{" "}
                              {new Date(selectedDeck.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => handleStartBattle(selectedDeck.id, selectedDeck.githubUsername)}
                              disabled={battleLoading}
                              className="min-h-10 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-xs font-black text-white shadow-[0_6px_20px_-6px_rgba(239,68,68,0.55)] transition-all hover:from-red-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer sm:min-h-0"
                            >
                              Battle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartBattle(selectedDeck.id, selectedDeck.githubUsername, true)}
                              disabled={battleLoading}
                              title="Mirror match — same deck both sides"
                              className="min-h-10 rounded-xl border border-violet-400/35 bg-violet-500/15 px-3.5 py-2 text-xs font-bold text-violet-200 transition-colors hover:border-violet-300/50 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer sm:min-h-0"
                            >
                              Mirror
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDeck(selectedDeck.id)}
                              className="min-h-10 rounded-xl border border-white/10 bg-transparent px-3.5 py-2 text-xs font-bold text-slate-400 transition-colors hover:border-red-400/40 hover:text-red-300 cursor-pointer sm:min-h-0"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-emerald-950/25 bg-black/40 px-3 pb-8 pt-6 sm:px-5">
                        <p className="mb-5 text-center text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/75">
                          Line-up
                        </p>
                        <div className="mx-auto grid max-w-[1400px] grid-cols-1 justify-items-center gap-x-4 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                          {selectedDeck.cards.map((card) => (
                            <div
                              key={card.repoFullName}
                              className="relative flex justify-center"
                              style={{ width: "100%", maxWidth: 248, minHeight: 420 }}
                            >
                              <div
                                className="absolute top-0 origin-top will-change-transform"
                                style={{
                                  left: "50%",
                                  width: 330,
                                  transform: "translateX(-50%) scale(0.752)",
                                }}
                              >
                                <PokemonCardComponent card={card} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* ═══════════════ LEADERBOARD TAB ═══════════════ */}
      {tab === "leaderboard" && (
        <div className="relative z-10 mx-auto w-full max-w-7xl px-0">
          {!user && (
            <div className="relative z-10 w-full pb-2 sm:pb-4">
              <CreateLandingHero
                isSignedIn={false}
                loading={false}
                onSignIn={signIn}
                layout="full"
              />
            </div>
          )}

          <div className="mx-auto w-full px-4 sm:px-6 lg:px-8">
            {!user && (
              <div
                className="mb-10 mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent sm:mb-12 sm:mt-8"
                aria-hidden
              />
            )}
            <h2
              className={`text-center font-black tracking-tight text-white ${user ? "mb-4 text-xl sm:mb-6 sm:text-2xl" : "mb-2 text-2xl sm:mb-3 sm:text-3xl"}`}
            >
              Leaderboard
            </h2>
            {!user ? (
              <p className="mx-auto mb-10 max-w-md text-center text-sm leading-relaxed text-slate-500 sm:mb-12">
                Live rankings from the arena. Sign in with GitHub to build a deck and claim a spot.
              </p>
            ) : null}

            <section className="mb-8 sm:mb-10">
              <h3 className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-amber-200 sm:mb-5 sm:text-xs">
                Battle Rankings
              </h3>

            {lbLoading ? (
              <div className="flex justify-center py-12 text-white"><Spinner text="Loading..." /></div>
            ) : leaderboard.length === 0 ? (
              <p className="text-center text-slate-400 py-12">No battles have been fought yet. Be the first!</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm [-webkit-overflow-scrolling:touch]">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 sm:text-[11px] sm:tracking-[0.14em]">
                      <th className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3 w-10">#</th>
                      <th className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">Player</th>
                      <th className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">Record</th>
                      <th className="whitespace-nowrap px-2 py-2.5 text-center sm:px-4 sm:py-3">Win&nbsp;%</th>
                      <th className="whitespace-nowrap px-2 py-2.5 text-right sm:px-4 sm:py-3">Last&nbsp;Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => {
                      const rank = i + 1;
                      const medalColor = rank === 1
                        ? "text-amber-300"
                        : rank === 2
                          ? "text-slate-300"
                          : rank === 3
                            ? "text-orange-400"
                            : "text-slate-500";
                      const medal = rank === 1 ? "\u{1F947}" : rank === 2 ? "\u{1F948}" : rank === 3 ? "\u{1F949}" : null;
                      const winPct = entry.totalBattles > 0 ? (entry.wins / entry.totalBattles) * 100 : 0;
                      const lossPct = entry.totalBattles > 0 ? (entry.losses / entry.totalBattles) * 100 : 0;

                      return (
                        <tr
                          key={entry.userId}
                          className={`border-b border-white/5 transition-colors hover:bg-white/5 ${rank <= 3 ? "bg-white/[0.02]" : ""}`}
                        >
                          <td className={`px-2 py-3 font-black sm:px-4 sm:py-4 ${medalColor}`}>
                            {medal ? <span className="text-base">{medal}</span> : rank}
                          </td>
                          <td className="px-2 py-3 sm:px-4 sm:py-4">
                            <a
                              href={`https://github.com/${entry.githubUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 group"
                            >
                              <img
                                src={`https://github.com/${entry.githubUsername}.png?size=80`}
                                alt=""
                                className={`h-8 w-8 shrink-0 rounded-full border bg-white/5 ${rank === 1 ? "border-amber-400/50 ring-2 ring-amber-400/20" : rank <= 3 ? "border-white/20" : "border-white/10"}`}
                              />
                              <div className="min-w-0">
                                <span className="block truncate font-bold text-white group-hover:text-amber-200 transition-colors">
                                  {entry.githubUsername}
                                </span>
                                <span className="block text-[10px] text-slate-500">
                                  {entry.totalBattles} battle{entry.totalBattles !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </a>
                          </td>
                          <td className="px-2 py-3 sm:px-4 sm:py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs tabular-nums">
                                <span className="font-bold text-emerald-400">{entry.wins}</span>
                                <span className="text-slate-600">/</span>
                                <span className="font-bold text-red-400">{entry.losses}</span>
                                <span className="text-slate-600">/</span>
                                <span className="text-slate-400">{entry.draws}</span>
                              </span>
                              <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/5 sm:block">
                                <div className="flex h-full">
                                  <div className="bg-emerald-500 transition-all" style={{ width: `${winPct}%` }} />
                                  <div className="bg-red-500 transition-all" style={{ width: `${lossPct}%` }} />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center sm:px-4 sm:py-4">
                            <span className={`inline-block min-w-[3rem] rounded-full px-2 py-0.5 text-xs font-black ${
                              winPct >= 70 ? "bg-emerald-500/15 text-emerald-400" :
                              winPct >= 40 ? "bg-amber-500/15 text-amber-300" :
                              "bg-red-500/15 text-red-400"
                            }`}>
                              {(entry.winRate * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-right text-xs text-slate-500 sm:px-4 sm:py-4">
                            {entry.lastPlayed ? new Date(entry.lastPlayed).toLocaleDateString() : "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

            <section className="pb-2">
              <h3 className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-amber-200 sm:text-xs">
                Recently Created Decks
              </h3>

              {recentDecksLoading ? (
                <div className="flex justify-center py-6 text-white"><Spinner text="Loading decks..." /></div>
              ) : recentDecks.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">No decks have been saved yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm [-webkit-overflow-scrolling:touch]">
                  <table className="w-full min-w-[28rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 sm:text-[11px] sm:tracking-[0.14em]">
                        <th className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">Player</th>
                        <th className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">Deck</th>
                        <th className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">Cards</th>
                        <th className="whitespace-nowrap px-2 py-2.5 text-right sm:px-4 sm:py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDecks.map((deck) => (
                        <tr key={deck.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                          <td className="px-2 py-2.5 sm:px-4 sm:py-3">
                            <a
                              href={`https://github.com/${deck.githubUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 group"
                            >
                              <img
                                src={`https://github.com/${deck.githubUsername}.png?size=64`}
                                alt=""
                                className="h-7 w-7 shrink-0 rounded-full border border-white/10 bg-white/5"
                              />
                              <span className="truncate font-bold text-white group-hover:text-amber-200 transition-colors">
                                {deck.githubUsername}
                              </span>
                            </a>
                          </td>
                          <td className="max-w-[10rem] truncate px-2 py-2.5 text-slate-300 sm:max-w-none sm:px-4 sm:py-3">
                            {deck.name}
                          </td>
                          <td className="px-2 py-2.5 sm:px-4 sm:py-3">
                            <div className="flex flex-wrap gap-1">
                              {deck.cards.map((card) => (
                                <span
                                  key={card.repoFullName}
                                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300"
                                >
                                  <span className="max-w-[5rem] truncate">{card.repoName}</span>
                                  <span className="text-[9px] text-slate-500">{card.type}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 text-right text-xs text-slate-500 sm:px-4 sm:py-3">
                            {new Date(deck.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
