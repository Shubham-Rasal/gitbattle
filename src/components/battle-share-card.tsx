"use client";

import { forwardRef } from "react";
import { githubAvatarProxyUrl } from "@/lib/github-avatar";
import type { BattleOutcome } from "@/types/game";

export const BATTLE_SHARE_EXPORT_WIDTH_PX = 440;

type BattleShareCardProps = {
  outcome: BattleOutcome;
  className?: string;
};

export const BattleShareCard = forwardRef<HTMLDivElement, BattleShareCardProps>(
  function BattleShareCard({ outcome, className = "" }, ref) {
    const { battle, attackerDeck, defenderDeck } = outcome;
    const isSelfBattle = attackerDeck.id === defenderDeck.id;
    const isWin = battle.result === "win";
    const isDraw = battle.result === "draw";
    const isGuest = battle.isGuest === true;
    const koCount = battle.roundLogs.filter((l) => l.status === "knockout").length;
    const totalDamage = battle.roundLogs.reduce((s, l) => s + l.damage, 0);
    const dateStr = new Date(battle.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const a = battle.attackerUsername ?? attackerDeck.githubUsername;
    const d = battle.defenderUsername ?? defenderDeck.githubUsername;

    const resultLabel = isDraw
      ? "Draw"
      : isGuest
        ? isWin
          ? `${a} wins`
          : `${d} wins`
        : isWin
          ? "Victory"
          : "Defeat";
    const resultSub = isSelfBattle
      ? "Mirror match"
      : isDraw
        ? "Evenly matched"
        : isGuest
          ? "Guest matchup"
          : isWin
            ? "Attacker takes the W"
            : "Defender holds the line";

    return (
      <div
        ref={ref}
        className={`relative box-border overflow-hidden rounded-[1.35rem] border-[3px] border-amber-400/55 bg-gradient-to-b from-[#141820] via-[#0a0d12] to-[#050608] p-6 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
        style={{ width: BATTLE_SHARE_EXPORT_WIDTH_PX, maxWidth: "100%" }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-400/12 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/85">GitBattle</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Battle recap</p>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="min-w-0 text-center">
              <img
                src={githubAvatarProxyUrl(a, 128)}
                alt=""
                width={72}
                height={72}
                className="mx-auto h-[4.5rem] w-[4.5rem] rounded-full border-2 border-amber-300/35 object-cover shadow-[0_0_20px_-4px_rgba(251,191,36,0.4)]"
              />
              <p className="mt-2 truncate text-xs font-black text-white">@{a}</p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">{attackerDeck.name}</p>
            </div>

            <div className="flex flex-col items-center px-1">
              <span className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-black tracking-wide text-white/90">
                VS
              </span>
            </div>

            <div className="min-w-0 text-center">
              <img
                src={githubAvatarProxyUrl(d, 128)}
                alt=""
                width={72}
                height={72}
                className="mx-auto h-[4.5rem] w-[4.5rem] rounded-full border-2 border-sky-400/35 object-cover shadow-[0_0_20px_-4px_rgba(56,189,248,0.35)]"
              />
              <p className="mt-2 truncate text-xs font-black text-white">@{d}</p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">{defenderDeck.name}</p>
            </div>
          </div>

          <div className="mt-5 flex justify-center">
            <div
              className={`rounded-full border px-5 py-2 text-center ${
                isDraw
                  ? "border-amber-400/45 bg-amber-500/15"
                  : isWin
                    ? "border-emerald-400/45 bg-emerald-500/15"
                    : "border-red-400/45 bg-red-500/15"
              }`}
            >
              <p
                className={`text-lg font-black tracking-tight sm:text-xl ${
                  isDraw ? "text-amber-200" : isWin ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {resultLabel}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{resultSub}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.07] bg-black/35 px-2 py-3">
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Rounds</p>
              <p className="mt-1 text-base font-black tabular-nums text-white">{battle.roundCount}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Hits</p>
              <p className="mt-1 text-base font-black tabular-nums text-amber-100">{battle.roundLogs.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">KOs</p>
              <p className="mt-1 text-base font-black tabular-nums text-red-300/90">{koCount}</p>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p className="text-[10px] font-bold tabular-nums text-slate-500">
              {totalDamage.toLocaleString()} total damage · {dateStr}
            </p>
          </div>

          <p className="mt-4 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Repo cards · GitHub arena
          </p>
        </div>
      </div>
    );
  },
);
