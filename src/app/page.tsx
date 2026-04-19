"use client";

import { FormEvent, useState } from "react";
import PokemonCardComponent from "@/components/pokemon-card";
import { PokemonCard, RepoStats } from "@/types/card";

type StepState = "input" | "select" | "cards";

function Spinner() {
  return (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Summoning...
    </span>
  );
}

function StepIndicator({ step }: { step: StepState }) {
  return (
    <div className="mb-8 flex items-center gap-4 text-xs font-black uppercase tracking-[0.18em] text-white/80">
      <span className={`${step === "input" ? "text-amber-200" : "text-white/60"}`}>1. Profile</span>
      <span className="h-px w-12 bg-white/20" />
      <span className={`${step === "select" ? "text-amber-200" : step === "cards" ? "text-white/60" : "text-white/30"}`}>2. Choose Repos</span>
      <span className="h-px w-12 bg-white/20" />
      <span className={`${step === "cards" ? "text-amber-200" : "text-white/30"}`}>3. Battle Deck</span>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<StepState>("input");
  const [username, setUsername] = useState("");
  const [candidates, setCandidates] = useState<RepoStats[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function handleUserSubmit(e: FormEvent) {
    e.preventDefault();

    const handle = username.trim();
    if (!/^[a-zA-Z0-9-]+$/.test(handle)) {
      setError("Please enter a valid GitHub username.");
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

      if (!res.ok || !Array.isArray(data.repos)) {
        throw new Error(data.error || "Could not load repositories");
      }

      if (data.repos.length === 0) {
        throw new Error(`No public repositories found for "${handle}"`);
      }

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

      if (!res.ok || !Array.isArray(data.cards)) {
        throw new Error(data.error || "Failed to generate cards");
      }

      setCards(data.cards);
      setStep("cards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black flex flex-col items-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle at 14% 16%, rgba(250, 204, 21, 0.16) 0, rgba(250, 204, 21, 0) 28%), radial-gradient(circle at 80% 82%, rgba(45, 212, 191, 0.15) 0, rgba(45, 212, 191, 0) 30%), repeating-linear-gradient(110deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 16px)"
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black" />

      {/* Header */}
      <div className="relative z-10 text-center mb-10">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-300/40 bg-yellow-200/10 text-yellow-200/90 text-[11px] font-black uppercase tracking-[0.35em] mb-3">
          Battle Arena Edition
        </span>
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-red-300 to-amber-400 mb-2">
          GitDex
        </h1>
        <p className="text-slate-300 text-lg">Turn your top GitHub repos into Pokemon cards</p>
      </div>

      <StepIndicator step={step} />

      <form onSubmit={handleUserSubmit} className="relative z-10 w-full max-w-md mb-6">
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-black/35 p-1 backdrop-blur-sm">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter GitHub username"
            disabled={step === "select" || step === "cards"}
            className="flex-1 px-4 py-3 rounded-xl bg-black/70 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-300/60 focus:border-yellow-300/60 text-lg transition-all disabled:opacity-70"
          />
          {step === "input" ? (
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 text-slate-900 font-black text-lg hover:from-amber-200 hover:to-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] border border-amber-100/50 cursor-pointer shadow-lg shadow-amber-200/20"
            >
              {loading ? <Spinner /> : "Select Repos"}
            </button>
          ) : null}
          {step === "cards" ? (
            <button
              type="button"
              onClick={clearFlow}
              className="px-6 py-3 rounded-xl bg-black/70 border border-white/20 text-white text-lg font-black hover:bg-black/80"
            >
              New Search
            </button>
          ) : null}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="relative z-10 mb-8 px-4 py-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-sm max-w-md w-full text-center shadow-lg shadow-red-600/20">
          {error}
        </div>
      )}

      {/* Repo picker */}
      {step === "select" && (
        <div className="relative z-10 w-full max-w-4xl">
          <div className="mb-3 text-center text-slate-300 text-sm tracking-[0.14em] uppercase">
            Choose up to 3 repositories for your battle deck
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {candidates.map((repo) => {
              const selected = selectedRepos.has(repo.fullName);
              const blocked = !selected && selectedRepos.size >= 3;
              return (
                <label
                  key={repo.fullName}
                  className={`flex gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                    selected ? "bg-amber-200/15 border-amber-200/60" : "bg-black/45 border-white/10 hover:border-white/30"
                  } ${blocked ? "opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={blocked}
                    onChange={() => toggleRepo(repo.fullName)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black text-sm text-white truncate">{repo.name}</p>
                      <p className="text-xs text-amber-200 font-black">★ {repo.stars.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-slate-300 truncate">{repo.fullName}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {repo.description}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-[0.14em]">
                      {repo.language} · watchers {repo.watchers}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setStep("input");
                setCandidates([]);
                setSelectedRepos(new Set());
              }}
              className="px-6 py-3 rounded-xl bg-black/45 border border-white/20 text-white text-sm font-black hover:bg-black/65"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCreateDeck}
              disabled={loading || selectedRepos.size === 0}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 text-slate-900 font-black text-sm hover:from-amber-200 hover:to-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] border border-amber-100/50 cursor-pointer shadow-lg shadow-amber-200/20"
            >
              {loading ? <Spinner /> : `Create Deck (${selectedRepos.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Cards Display */}
      {step === "cards" && cards.length > 0 && (
        <div className="relative z-10">
          <p className="text-center text-slate-300 text-sm mb-6 tracking-[0.14em] uppercase">
            @{username}&apos;s battle deck
          </p>
          <div className="flex flex-wrap justify-center gap-7 animate-fade-in">
            {cards.map((card) => (
              <PokemonCardComponent key={card.repoFullName} card={card} />
            ))}
          </div>
        </div>
      )}

      {step === "input" && !loading && !error && (
        <div className="relative z-10 text-center text-slate-400 mt-8">
          <div className="text-6xl mb-4 opacity-50">⚔️</div>
          <p className="text-lg text-white">Enter a username to fetch repos and build your squad</p>
          <p className="text-sm mt-1 text-slate-500">Example usernames: torvalds, sindresorhus, tj</p>
        </div>
      )}
    </main>
  );
}
