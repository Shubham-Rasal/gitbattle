"use client";

import { useCallback, useState } from "react";
import type { BattleOutcome } from "@/types/game";
import { BattleResultView } from "@/components/battle-result-view";

export function GuestMatchupPanel() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<BattleOutcome | null>(null);
  const [persistedToDb, setPersistedToDb] = useState(true);

  const reset = useCallback(() => {
    setOutcome(null);
    setError("");
    setPersistedToDb(true);
  }, []);

  const runMatch = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/battle/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attackerUsername: left.trim(),
          defenderUsername: right.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matchup failed");
      const { persisted, ...rest } = data as BattleOutcome & { persisted?: boolean };
      const o = rest as BattleOutcome;
      setOutcome(o);
      setPersistedToDb(persisted === true || o.battle.isGuest !== true);
    } catch (e) {
      setOutcome(null);
      setPersistedToDb(true);
      setError(e instanceof Error ? e.message : "Matchup failed");
    } finally {
      setLoading(false);
    }
  }, [left, right]);

  if (outcome) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-7xl px-0">
        <BattleResultView
          outcome={outcome}
          spectator
          onNewBattle={reset}
          persistNotice={
            persistedToDb
              ? undefined
              : "Share links and the leaderboard need this battle saved on the server. Set SUPABASE_SERVICE_ROLE_KEY in your deployment env and run the latest DB migration (nullable deck owner + guest battles)."
          }
        />
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-3xl px-0">
      <header className="mb-8 border-b border-white/[0.07] pb-6 text-center sm:text-left">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/90">No account needed</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">GitHub matchup</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:mx-0">
          Each side fields their three most-starred public repositories (forks skipped when possible). Cards are forged
          from repo stats, then the arena engine runs a full auto-battle.
        </p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-black/35 p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-left">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-amber-200/85">
              Red corner (attacks first)
            </span>
            <input
              type="text"
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              placeholder="e.g. torvalds"
              autoComplete="off"
              spellCheck={false}
              className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white placeholder:text-slate-600 outline-none transition-colors focus:border-amber-200/40"
            />
          </label>
          <label className="block text-left">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-sky-200/85">
              Blue corner
            </span>
            <input
              type="text"
              value={right}
              onChange={(e) => setRight(e.target.value)}
              placeholder="e.g. gaearon"
              autoComplete="off"
              spellCheck={false}
              className="min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white placeholder:text-slate-600 outline-none transition-colors focus:border-sky-300/40"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={loading || !left.trim() || !right.trim()}
          onClick={() => void runMatch()}
          className="mt-6 min-h-12 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3.5 text-sm font-black text-white shadow-[0_10px_32px_-8px_rgba(139,92,246,0.55)] transition-all hover:from-violet-400 hover:to-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
        >
          {loading ? "Fetching repos & battling…" : "Run battle"}
        </button>

       
      </div>
    </div>
  );
}
