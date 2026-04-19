"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CreateLandingHero from "@/components/create-landing-hero";
import PokemonCardComponent from "@/components/pokemon-card";
import Spinner from "@/components/spinner";
import { PokemonCard, RepoStats } from "@/types/card";
import { DeckSummary, BattleOutcome, LeaderboardEntry, BattleRoundLog } from "@/types/game";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/* ── Tabs ─────────────────────────────────────────── */

type AppTab = "create" | "decks" | "battle" | "leaderboard";
type StepState = "input" | "select" | "cards";

/* ── Tiny components ──────────────────────────────── */

function StepIndicator({ step }: { step: StepState }) {
  return (
    <div className="mb-6 flex w-full max-w-md flex-col items-stretch gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/80 sm:mb-8 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4 sm:text-xs sm:tracking-[0.18em]">
      <span className={`text-center sm:text-left ${step === "input" ? "text-amber-200" : "text-white/60"}`}>1. Profile</span>
      <span className="hidden h-px w-12 shrink-0 bg-white/20 sm:block" aria-hidden />
      <span
        className={`text-center sm:text-left ${step === "select" ? "text-amber-200" : step === "cards" ? "text-white/60" : "text-white/30"}`}
      >
        2. Choose Repos
      </span>
      <span className="hidden h-px w-12 shrink-0 bg-white/20 sm:block" aria-hidden />
      <span className={`text-center sm:text-left ${step === "cards" ? "text-amber-200" : "text-white/30"}`}>3. Battle Deck</span>
    </div>
  );
}

function TabBar({ tab, setTab, isLoggedIn }: { tab: AppTab; setTab: (t: AppTab) => void; isLoggedIn: boolean }) {
  const tabs: { id: AppTab; label: string; authRequired: boolean }[] = [
    { id: "create", label: "Create Deck", authRequired: true },
    { id: "decks", label: "My Decks", authRequired: true },
    { id: "battle", label: "Battle", authRequired: true },
    { id: "leaderboard", label: "Leaderboard", authRequired: false },
  ];
  return (
    <div className="relative z-10 mb-6 w-full max-w-full sm:mb-8">
      <div className="-mx-1 overflow-x-auto overscroll-x-contain rounded-xl border border-white/10 bg-black/40 p-1 backdrop-blur-sm sm:mx-0 sm:overflow-visible">
        <div className="flex w-max min-w-full justify-start gap-1 sm:mx-auto sm:w-full sm:justify-center">
          {tabs.map((t) => {
            const disabled = t.authRequired && !isLoggedIn;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => !disabled && setTab(t.id)}
                disabled={disabled}
                className={`min-h-11 shrink-0 rounded-lg px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all sm:min-h-0 sm:px-4 sm:text-xs sm:tracking-[0.14em] ${
                  tab === t.id
                    ? "bg-amber-200/20 text-amber-200 border border-amber-200/40"
                    : disabled
                      ? "text-white/20 cursor-not-allowed"
                      : "text-white/60 hover:text-white/80 hover:bg-white/5 cursor-pointer active:bg-white/10"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────── */

export default function Home() {
  const supabase = createClient();

  /* auth state */
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  /* tab */
  const [tab, setTab] = useState<AppTab>("leaderboard");

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

  /* decks */
  const [myDecks, setMyDecks] = useState<DeckSummary[]>([]);
  const [decksLoading, setDecksLoading] = useState(false);

  /* battle */
  const [battleOutcome, setBattleOutcome] = useState<BattleOutcome | null>(null);
  const [battleLoading, setBattleLoading] = useState(false);
  const [battleError, setBattleError] = useState("");

  /* leaderboard */
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [recentDecks, setRecentDecks] = useState<DeckSummary[]>([]);
  const [recentDecksLoading, setRecentDecksLoading] = useState(false);

  /* ── Auth bootstrap ─────────────────────────────── */

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) {
        const gh = u.user_metadata?.user_name as string | undefined;
        if (gh) setUsername(gh);
        setTab("create");
      }
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        const gh = newUser.user_metadata?.user_name as string | undefined;
        if (gh) setUsername(gh);
        setTab("create");
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setMyDecks([]);
    setBattleOutcome(null);
    setTab("leaderboard");
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

  /* Fetch decks when switching to the decks tab.
     The setState calls happen inside fetchMyDecks which is async (not synchronous). */
  const prevDecksDeps = useRef({ user: user?.id, tab });
  useEffect(() => {
    const changed =
      prevDecksDeps.current.user !== user?.id || prevDecksDeps.current.tab !== tab;
    prevDecksDeps.current = { user: user?.id, tab };
    if (changed && user && tab === "decks") {
      const ctrl = new AbortController();
      (async () => {
        try {
          const res = await fetch("/api/decks", { signal: ctrl.signal });
          const data = await res.json();
          if (res.ok && Array.isArray(data.decks)) setMyDecks(data.decks);
        } catch { /* aborted or network */ }
        finally { setDecksLoading(false); }
      })();
      setDecksLoading(true);
      return () => ctrl.abort();
    }
  });

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
          name: `${username.trim()}'s Deck`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      clearFlow();
      setTab("decks");
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
      setStep("cards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  /* ── Battle ─────────────────────────────────────── */

  async function handleStartBattle(deckId: string, githubUsername: string) {
    setBattleLoading(true);
    setBattleError("");
    setBattleOutcome(null);
    setTab("battle");
    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, githubUsername }),
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
    if (tab !== "leaderboard") return;

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
  }, [tab]);

  /* ── Render ─────────────────────────────────────── */

  if (authLoading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black px-4 text-white">
        <Spinner text="Loading..." />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen min-h-[100dvh] flex-col items-center overflow-x-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black px-3 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 sm:px-4 sm:py-10 md:py-12">
      {/* BG effects */}
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle at 14% 16%, rgba(250, 204, 21, 0.16) 0, rgba(250, 204, 21, 0) 28%), radial-gradient(circle at 80% 82%, rgba(45, 212, 191, 0.15) 0, rgba(45, 212, 191, 0) 30%), repeating-linear-gradient(110deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 16px)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black" />

      {/* Header — compact on create landing to avoid duplicate headlines */}
      {tab === "create" && step === "input" ? (
        <div className="relative z-10 mb-5 w-full max-w-2xl px-1 text-center sm:mb-6">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-200/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-yellow-200/90 sm:px-3 sm:text-[11px] sm:tracking-[0.35em]">
            Battle Arena Edition
          </span>
          <h1 className="mt-2 bg-gradient-to-r from-yellow-200 via-red-300 to-amber-400 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
            GitDex
          </h1>
        </div>
      ) : (
        <div className="relative z-10 mb-4 w-full max-w-2xl px-1 text-center sm:mb-5 sm:px-0">
          <span className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-200/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-yellow-200/90 sm:mb-3 sm:px-3 sm:text-[11px] sm:tracking-[0.35em]">
            Battle Arena Edition
          </span>
          <h1 className="mb-1.5 bg-gradient-to-r from-yellow-200 via-red-300 to-amber-400 bg-clip-text text-3xl font-black text-transparent sm:mb-2 sm:text-5xl">
            GitDex
          </h1>
          <p className="text-balance px-1 text-sm leading-snug text-slate-300 sm:text-lg">
            Turn your top GitHub repos into Pokemon cards
          </p>
        </div>
      )}

      {/* Auth bar */}
      <div className="relative z-10 mb-4 flex w-full max-w-md flex-col items-stretch gap-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
        {user ? (
          <>
            <span className="text-center text-xs text-slate-400 sm:text-left">
              Signed in as{" "}
              <span className="font-bold text-amber-200">{user.user_metadata?.user_name || user.email}</span>
            </span>
            <button
              type="button"
              onClick={signOut}
              className="min-h-10 rounded-lg border border-white/20 px-3 py-2 text-xs text-white/60 transition-all hover:border-white/40 hover:text-white cursor-pointer sm:min-h-0 sm:py-1"
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={signIn}
            className="min-h-11 w-full rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/15 cursor-pointer sm:w-auto sm:min-h-0"
          >
            Sign in with GitHub
          </button>
        )}
      </div>

      {/* Tabs */}
      <TabBar tab={tab} setTab={setTab} isLoggedIn={!!user} />

      {/* Error */}
      {error && (
        <div className="relative z-10 mb-5 w-full max-w-md rounded-xl border border-red-500/40 bg-red-500/20 px-3 py-3 text-center text-sm text-red-200 shadow-lg shadow-red-600/20 sm:mb-6 sm:px-4">
          {error}
        </div>
      )}

      {/* ═══════════════ CREATE TAB ═══════════════ */}
      {tab === "create" && (
        <>
          {step === "input" ? (
            <div className="relative z-10 mb-8 w-full sm:mb-10">
              <CreateLandingHero
                isSignedIn={!!user}
                githubUsername={githubUsername}
                loading={loading}
                onSignIn={signIn}
                onBuildDeck={() => void handleUserSubmit()}
                layout="full"
              />
            </div>
          ) : (
            <StepIndicator step={step} />
          )}

          {(step === "select" || step === "cards") && (
            <div className="relative z-10 mb-6 w-full max-w-md px-0 sm:max-w-2xl">
              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/35 p-2 backdrop-blur-sm sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-4 py-3">
                  <span className="text-lg font-black text-amber-200">@{githubUsername || username || "you"}</span>
                </div>
                {step === "cards" && (
                  <button
                    type="button"
                    onClick={clearFlow}
                    className="min-h-11 w-full shrink-0 rounded-xl border border-white/20 bg-black/70 px-4 py-3 text-base font-black text-white hover:bg-black/80 cursor-pointer sm:w-auto sm:px-6 sm:text-lg"
                  >
                    New Search
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Repo picker */}
          {step === "select" && (
            <div className="relative z-10 w-full max-w-4xl px-0">
              <div className="mb-3 px-1 text-center text-xs uppercase tracking-[0.12em] text-slate-300 sm:text-sm sm:tracking-[0.14em]">
                Choose up to 3 repositories for your battle deck
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {candidates.map((repo) => {
                  const selected = selectedRepos.has(repo.fullName);
                  const blocked = !selected && selectedRepos.size >= 3;
                  return (
                    <label
                      key={repo.fullName}
                      className={`flex gap-3 rounded-xl border p-3 cursor-pointer transition-all ${selected ? "bg-amber-200/15 border-amber-200/60" : "bg-black/45 border-white/10 hover:border-white/30"} ${blocked ? "opacity-60" : ""}`}
                    >
                      <input type="checkbox" checked={selected} disabled={blocked} onChange={() => toggleRepo(repo.fullName)} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-black text-sm text-white truncate">{repo.name}</p>
                          <p className="text-xs text-amber-200 font-black">&#x2605; {repo.stars.toLocaleString()}</p>
                        </div>
                        <p className="text-xs text-slate-300 truncate">{repo.fullName}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{repo.description}</p>
                        <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-[0.14em]">
                          {repo.language} &middot; watchers {repo.watchers}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("input");
                    setCandidates([]);
                    setSelectedRepos(new Set());
                  }}
                  className="min-h-11 w-full rounded-xl border border-white/20 bg-black/45 px-6 py-3 text-sm font-black text-white hover:bg-black/65 cursor-pointer sm:w-auto sm:min-h-0"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateDeck}
                  disabled={loading || selectedRepos.size === 0}
                  className="min-h-11 w-full rounded-xl border border-amber-100/50 bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-sm font-black text-slate-900 shadow-lg shadow-amber-200/20 transition-all hover:from-amber-200 hover:to-orange-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer sm:w-auto sm:min-h-0"
                >
                  {loading ? <Spinner /> : `Create Deck (${selectedRepos.size})`}
                </button>
              </div>
            </div>
          )}

          {/* Cards display */}
          {step === "cards" && cards.length > 0 && (
            <div className="relative z-10 w-full max-w-[100vw] px-0">
              <p className="mb-4 px-1 text-center text-xs uppercase tracking-[0.12em] text-slate-300 sm:mb-6 sm:text-sm sm:tracking-[0.14em]">
                @{username}&apos;s battle deck
              </p>
              <div className="flex flex-col items-center gap-6 animate-fade-in sm:flex-row sm:flex-wrap sm:justify-center sm:gap-7">
                {cards.map((card) => (
                  <PokemonCardComponent key={card.repoFullName} card={card} />
                ))}
              </div>
              {user && (
                <div className="mt-6 flex justify-center px-1">
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

      {/* ═══════════════ DECKS TAB ═══════════════ */}
      {tab === "decks" && user && (
        <div className="relative z-10 w-full max-w-4xl px-0">
          <h2 className="mb-4 text-center text-xl font-black text-white sm:mb-6 sm:text-2xl">My Decks</h2>
          {decksLoading ? (
            <div className="flex justify-center py-12 text-white"><Spinner text="Loading decks..." /></div>
          ) : myDecks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">You have no saved decks yet.</p>
              <button
                type="button"
                onClick={() => setTab("create")}
                className="min-h-11 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-sm font-black text-slate-900 cursor-pointer sm:min-h-0"
              >
                Create Your First Deck
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {myDecks.map((deck) => (
                <div key={deck.id} className="rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white sm:text-lg">{deck.name}</h3>
                      <p className="text-xs text-slate-500">
                        @{deck.githubUsername} &middot; {deck.cards.length} cards &middot; {new Date(deck.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                      <button
                        type="button"
                        onClick={() => handleStartBattle(deck.id, deck.githubUsername)}
                        disabled={battleLoading}
                        className="min-h-10 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-xs font-black text-white transition-all hover:from-red-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer sm:min-h-0"
                      >
                        Battle!
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDeck(deck.id)}
                        className="min-h-10 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 transition-all hover:bg-red-500/10 cursor-pointer sm:min-h-0"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center sm:gap-x-6 sm:gap-y-10">
                    {deck.cards.map((card) => (
                      <div
                        key={card.repoFullName}
                        className="flex w-full max-w-[330px] shrink-0 justify-center sm:w-[330px] sm:max-w-[330px] sm:-mr-28 sm:-mb-36 sm:origin-top-left sm:scale-[0.65]"
                      >
                        <PokemonCardComponent card={card} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ BATTLE TAB ═══════════════ */}
      {tab === "battle" && user && (
        <div className="relative z-10 w-full max-w-4xl px-0">
          <h2 className="mb-4 text-center text-xl font-black text-white sm:mb-6 sm:text-2xl">Battle Arena</h2>

          {battleError && (
            <div className="mx-auto mb-6 max-w-md rounded-xl border border-red-500/40 bg-red-500/20 px-3 py-3 text-center text-sm text-red-200 sm:px-4">
              {battleError}
            </div>
          )}

          {battleLoading && (
            <div className="flex justify-center py-12 text-white"><Spinner text="Finding opponent and battling..." /></div>
          )}

          {!battleLoading && !battleOutcome && (
            <div className="px-2 py-10 text-center sm:py-12">
              <p className="mb-4 text-balance text-sm text-slate-400 sm:text-base">
                Select a deck from &quot;My Decks&quot; tab and hit &quot;Battle!&quot; to find a random opponent.
              </p>
              <button
                type="button"
                onClick={() => setTab("decks")}
                className="min-h-11 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-sm font-black text-slate-900 cursor-pointer sm:min-h-0"
              >
                Go to My Decks
              </button>
            </div>
          )}

          {battleOutcome && (
            <BattleResultView outcome={battleOutcome} onNewBattle={() => { setBattleOutcome(null); setTab("decks"); }} />
          )}
        </div>
      )}

      {/* ═══════════════ LEADERBOARD TAB ═══════════════ */}
      {tab === "leaderboard" && (
        <div className="relative z-10 w-full max-w-4xl px-0">
          {!user && (
            <div className="relative z-10 mb-8 w-full sm:mb-10">
              <CreateLandingHero
                isSignedIn={false}
                loading={false}
                onSignIn={signIn}
                layout="inline"
              />
            </div>
          )}
          <h2 className="mb-4 text-center text-xl font-black text-white sm:mb-6 sm:text-2xl">Leaderboard</h2>

          <section className="mb-6 rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm sm:mb-8 sm:p-5">
            <h3 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-amber-200 sm:text-xs">Recently Created Decks</h3>

            {recentDecksLoading ? (
              <div className="flex justify-center py-6 text-white"><Spinner text="Loading decks..." /></div>
            ) : recentDecks.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No decks have been saved yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentDecks.map((deck) => (
                  <div key={deck.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="truncate text-sm font-bold text-white">{deck.name}</p>
                    <p className="mt-1 text-xs text-slate-400">@{deck.githubUsername}</p>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {deck.cards.length} cards &middot; {new Date(deck.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {lbLoading ? (
            <div className="flex justify-center py-12 text-white"><Spinner text="Loading..." /></div>
          ) : leaderboard.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No battles have been fought yet. Be the first!</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm [-webkit-overflow-scrolling:touch]">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 sm:text-[11px] sm:tracking-[0.14em]">
                    <th className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">#</th>
                    <th className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">Player</th>
                    <th className="whitespace-nowrap px-2 py-2.5 text-center sm:px-4 sm:py-3">W</th>
                    <th className="whitespace-nowrap px-2 py-2.5 text-center sm:px-4 sm:py-3">L</th>
                    <th className="whitespace-nowrap px-2 py-2.5 text-center sm:px-4 sm:py-3">D</th>
                    <th className="whitespace-nowrap px-2 py-2.5 text-center sm:px-4 sm:py-3">Win %</th>
                    <th className="whitespace-nowrap px-2 py-2.5 text-right sm:px-4 sm:py-3">Battles</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.userId} className="border-b border-white/5 transition-colors hover:bg-white/5">
                      <td className="px-2 py-2.5 font-black text-amber-200 sm:px-4 sm:py-3">{i + 1}</td>
                      <td className="max-w-[9rem] truncate px-2 py-2.5 font-bold text-white sm:max-w-none sm:px-4 sm:py-3">
                        {entry.githubUsername}
                      </td>
                      <td className="px-2 py-2.5 text-center text-emerald-400 sm:px-4 sm:py-3">{entry.wins}</td>
                      <td className="px-2 py-2.5 text-center text-red-400 sm:px-4 sm:py-3">{entry.losses}</td>
                      <td className="px-2 py-2.5 text-center text-slate-400 sm:px-4 sm:py-3">{entry.draws}</td>
                      <td className="px-2 py-2.5 text-center font-black text-amber-200 sm:px-4 sm:py-3">
                        {(entry.winRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-2 py-2.5 text-right text-slate-300 sm:px-4 sm:py-3">{entry.totalBattles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

/* ── Battle Result Component ──────────────────────── */

function BattleResultView({ outcome, onNewBattle }: { outcome: BattleOutcome; onNewBattle: () => void }) {
  const { battle, attackerDeck, defenderDeck } = outcome;
  const isWin = battle.result === "win";
  const isDraw = battle.result === "draw";

  return (
    <div className="space-y-6">
      {/* Result banner */}
      <div
        className={`rounded-xl border px-3 py-5 text-center sm:px-6 sm:py-6 ${
          isWin
            ? "bg-emerald-500/15 border-emerald-500/40"
            : isDraw
              ? "bg-amber-500/15 border-amber-500/40"
              : "bg-red-500/15 border-red-500/40"
        }`}
      >
        <div
          className={`mb-2 text-2xl font-black sm:text-4xl ${isWin ? "text-emerald-400" : isDraw ? "text-amber-400" : "text-red-400"}`}
        >
          {isWin ? "VICTORY!" : isDraw ? "DRAW" : "DEFEAT"}
        </div>
        <p className="text-balance text-xs text-slate-300 sm:text-sm">
          <span className="text-white font-bold">@{battle.attackerUsername}</span> vs{" "}
          <span className="text-white font-bold">@{battle.defenderUsername}</span>
          {" "}&middot; {battle.roundCount} rounds
        </p>
      </div>

      {/* Deck comparison */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DeckPreview deck={attackerDeck} label="Your Deck" highlight={isWin} />
        <DeckPreview deck={defenderDeck} label="Opponent" highlight={!isWin && !isDraw} />
      </div>

      {/* Battle log */}
      <details className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
        <summary className="px-4 py-3 text-sm font-black text-white/80 cursor-pointer hover:bg-white/5 transition-colors uppercase tracking-[0.14em]">
          Battle Log ({battle.roundLogs.length} events)
        </summary>
        <div className="px-4 pb-4 max-h-80 overflow-y-auto space-y-1">
          {battle.roundLogs.map((log: BattleRoundLog, i: number) => (
            <div key={i} className={`text-xs py-1 px-2 rounded ${log.status === "knockout" ? "bg-red-500/10 text-red-300" : "text-slate-400"}`}>
              <span className="text-white/60">T{log.turn}</span>{" "}
              <span className="text-amber-200 font-bold">{log.attackerCard}</span> used{" "}
              <span className="text-white font-bold">{log.move}</span> on{" "}
              <span className="text-sky-300 font-bold">{log.defenderCard}</span>
              {" "}&rarr; {log.damage} dmg
              {log.wasWeak && <span className="text-red-400 ml-1">(super effective!)</span>}
              {log.wasResisted && <span className="text-slate-500 ml-1">(resisted)</span>}
              {log.wasCrit && <span className="text-yellow-400 ml-1">(CRIT!)</span>}
              {log.status === "knockout" && <span className="text-red-400 font-black ml-1">KO!</span>}
              <span className="text-white/30 ml-1">[{log.defenderHpBefore}&rarr;{log.defenderHpAfter} HP]</span>
            </div>
          ))}
        </div>
      </details>

      <div className="flex justify-center px-1">
        <button
          type="button"
          onClick={onNewBattle}
          className="min-h-11 w-full max-w-xs rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-sm font-black text-slate-900 transition-all active:scale-[0.98] cursor-pointer sm:w-auto sm:max-w-none sm:min-h-0"
        >
          Battle Again
        </button>
      </div>
    </div>
  );
}

function DeckPreview({ deck, label, highlight }: { deck: DeckSummary; label: string; highlight: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 ${highlight ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-black/30"}`}
    >
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">{label}</p>
      <p className="mb-3 text-xs font-bold text-white sm:text-sm">
        @{deck.githubUsername} &middot; {deck.name}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {deck.cards.map((card) => (
          <div
            key={card.repoFullName}
            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-center sm:min-w-0 sm:flex-1"
          >
            <p className="truncate text-[10px] font-bold text-white">{card.repoName}</p>
            <p className="text-[10px] text-slate-500">
              {card.type} &middot; HP {card.hp}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
