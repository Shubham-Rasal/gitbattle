"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BattleOutcome, BattleRoundLog, DeckSummary } from "@/types/game";
import type { PokemonType } from "@/types/card";
import { TYPE_COLORS } from "@/lib/type-colors";
import {
  ensureBattleAudio,
  playBattleFinish,
  playBattleHit,
  playMatchIntro,
  type BattleHitSound,
} from "@/lib/battle-sounds";
import { BattleSharePanel } from "@/components/battle-share-panel";

const TIMING_MS = {
  intro: 600,
  beforeFirstHit: 700,
  betweenHits: 1350,
  afterKo: 900,
  betweenTurns: 1400,
} as const;

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function groupLogsByEngineTurn(logs: BattleRoundLog[]): BattleRoundLog[][] {
  const map = new Map<number, BattleRoundLog[]>();
  for (const log of logs) {
    const arr = map.get(log.turn) ?? [];
    arr.push(log);
    map.set(log.turn, arr);
  }
  return [...map.keys()]
    .sort((a, b) => a - b)
    .map((k) => map.get(k)!);
}

function moveTypeStyle(moveType: string) {
  return TYPE_COLORS[moveType as PokemonType] ?? TYPE_COLORS.normal;
}

function hitSoundForLog(log: BattleRoundLog): BattleHitSound {
  if (log.status === "knockout") return "ko";
  if (log.wasCrit) return "crit";
  if (log.wasWeak) return "super";
  return "normal";
}

export function BattleResultView({
  outcome,
  onNewBattle,
  spectator = false,
}: {
  outcome: BattleOutcome;
  onNewBattle: () => void;
  /** Neutral copy (guest matchup — neither side is “you”). */
  spectator?: boolean;
}) {
  const { battle, attackerDeck, defenderDeck } = outcome;
  const isWin = battle.result === "win";
  const isDraw = battle.result === "draw";
  const isSelfBattle = attackerDeck.id === defenderDeck.id;
  const att = battle.attackerUsername ?? attackerDeck.githubUsername;
  const def = battle.defenderUsername ?? defenderDeck.githubUsername;

  const turnGroups = useMemo(() => groupLogsByEngineTurn(battle.roundLogs), [battle.roundLogs]);
  const lastIdx = Math.max(0, turnGroups.length - 1);
  const reduceMotion = usePrefersReducedMotion();

  const playbackCancelRef = useRef(false);
  const [replayKey, setReplayKey] = useState(0);
  const [replay, setReplay] = useState({ turn: 0, hits: 0 });
  const [done, setDone] = useState(false);
  const [reviewStep, setReviewStep] = useState(0);

  useEffect(() => {
    playbackCancelRef.current = false;

    async function run() {
      if (turnGroups.length === 0) {
        setReviewStep(0);
        setDone(true);
        return;
      }

      if (reduceMotion) {
        setReplay({ turn: lastIdx, hits: turnGroups[lastIdx]?.length ?? 0 });
        setReviewStep(lastIdx);
        setDone(true);
        return;
      }

      setDone(false);
      setReplay({ turn: 0, hits: 0 });
      setReviewStep(0);
      await sleep(TIMING_MS.intro);
      if (playbackCancelRef.current) return;

      await ensureBattleAudio();
      void playMatchIntro();

      for (let t = 0; t < turnGroups.length; t++) {
        if (playbackCancelRef.current) return;
        setReplay({ turn: t, hits: 0 });
        await sleep(TIMING_MS.beforeFirstHit);
        if (playbackCancelRef.current) return;
        const logs = turnGroups[t];

        for (let h = 0; h < logs.length; h++) {
          if (playbackCancelRef.current) return;
          await sleep(h === 0 ? TIMING_MS.betweenHits * 0.55 : TIMING_MS.betweenHits);
          if (playbackCancelRef.current) return;
          const log = logs[h];
          setReplay({ turn: t, hits: h + 1 });
          void playBattleHit(hitSoundForLog(log));
          if (log.status === "knockout") {
            await sleep(TIMING_MS.afterKo);
            if (playbackCancelRef.current) return;
          }
        }

        if (playbackCancelRef.current) return;
        if (t < turnGroups.length - 1) {
          await sleep(TIMING_MS.betweenTurns);
        }
      }

      if (playbackCancelRef.current) return;
      setReviewStep(lastIdx);
      setDone(true);
      const end: "win" | "lose" | "draw" = isDraw ? "draw" : isWin ? "win" : "lose";
      void playBattleFinish(end);
    }

    void run();

    return () => {
      playbackCancelRef.current = true;
    };
  }, [battle.id, replayKey, reduceMotion, lastIdx, turnGroups, isWin, isDraw]);

  const skipPlayback = useCallback(() => {
    playbackCancelRef.current = true;
    setDone(true);
    setReplay({ turn: lastIdx, hits: turnGroups[lastIdx]?.length ?? 0 });
    setReviewStep(lastIdx);
  }, [lastIdx, turnGroups]);

  const restartSimulation = useCallback(() => {
    setReplayKey((k) => k + 1);
  }, []);

  const displayTurn = done ? reviewStep : replay.turn;
  const currentLogsFull = turnGroups[displayTurn] ?? [];
  const displayHits = done ? currentLogsFull.length : replay.hits;
  const currentLogsVisible = currentLogsFull.slice(0, displayHits);
  const firstLog = currentLogsFull[0];
  const clashKey = `${displayTurn}-${displayHits}`;
  const showClashMotion = !reduceMotion && displayHits > 0;

  const faceoff = useMemo(() => {
    if (!firstLog) return null;
    const pair = [firstLog.attackerCard, firstLog.defenderCard];
    const leftCard = attackerDeck.cards.find((c) => pair.includes(c.repoName));
    const rightCard = defenderDeck.cards.find((c) => pair.includes(c.repoName));
    if (!leftCard || !rightCard) return null;
    return { leftCard, rightCard };
  }, [firstLog, attackerDeck.cards, defenderDeck.cards]);

  const exchangeResult = useMemo(() => {
    if (displayHits < currentLogsFull.length) {
      return { kind: "ongoing" as const, message: "Trading blows…" };
    }
    const ko = currentLogsFull.find((l) => l.status === "knockout");
    if (!ko) {
      return { kind: "ongoing" as const, message: "Both cards survive — next matchup." };
    }
    const loserRepo = ko.defenderCard;
    const winnerRepo = ko.attackerCard;
    const loserOnOpponentSide = defenderDeck.cards.some((c) => c.repoName === loserRepo);
    if (spectator && !isSelfBattle) {
      if (loserOnOpponentSide) {
        return {
          kind: "ko" as const,
          tone: "neutral" as const,
          message: `${att} wins this exchange — ${winnerRepo} knocks out ${loserRepo}.`,
        };
      }
      return {
        kind: "ko" as const,
        tone: "neutral" as const,
        message: `${def} wins this exchange — ${winnerRepo} knocks out ${loserRepo}.`,
      };
    }
    if (isSelfBattle) {
      const sideLost = loserOnOpponentSide ? "Side B" : "Side A";
      return {
        kind: "ko" as const,
        tone: "neutral" as const,
        message: `${sideLost} loses a fighter: ${loserRepo} is knocked out.`,
      };
    }
    if (loserOnOpponentSide) {
      return {
        kind: "ko" as const,
        tone: "good" as const,
        message: `You win this exchange — ${winnerRepo} knocks out ${loserRepo}.`,
      };
    }
    return {
      kind: "ko" as const,
      tone: "bad" as const,
      message: `You lose this exchange — your ${loserRepo} is knocked out.`,
    };
  }, [currentLogsFull, displayHits, defenderDeck.cards, isSelfBattle, spectator, att, def]);

  return (
    <div className={`space-y-6 ${reduceMotion ? "" : "animate-battle-view-in"}`}>
      {done ? (
        <div
          className={`rounded-xl border px-3 py-4 text-center sm:px-6 sm:py-5 ${
            reduceMotion ? "" : "animate-battle-result-reveal"
          } ${
            isWin
              ? "border-emerald-500/40 bg-emerald-500/15"
              : isDraw
                ? "border-amber-500/40 bg-amber-500/15"
                : "border-red-500/40 bg-red-500/15"
          }`}
        >
          <div className={`text-xl font-black sm:text-3xl ${isWin ? "text-emerald-400" : isDraw ? "text-amber-400" : "text-red-400"}`}>
            {spectator
              ? isDraw
                ? "Draw"
                : isWin
                  ? `${att} wins`
                  : `${def} wins`
              : isWin
                ? "Victory"
                : isDraw
                  ? "Draw"
                  : "Defeat"}
          </div>
          <p className="mt-1 text-balance text-xs text-slate-300 sm:text-sm">
            <a
              href={`https://github.com/${att}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-white underline decoration-white/20 underline-offset-2 hover:text-amber-200"
            >
              @{att}
            </a>{" "}
            {isSelfBattle ? (
              <span className="font-bold text-violet-400">vs self</span>
            ) : (
              <>
                vs{" "}
                <a
                  href={`https://github.com/${def}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-white underline decoration-white/20 underline-offset-2 hover:text-amber-200"
                >
                  @{def}
                </a>
              </>
            )}
            <span className="text-slate-500"> · {turnGroups.length} matchup{turnGroups.length !== 1 ? "s" : ""}</span>
          </p>
        </div>
      ) : (
        <div
          className={`rounded-xl border border-amber-200/30 bg-gradient-to-br from-amber-500/10 to-orange-600/5 px-4 py-4 text-center sm:px-6 sm:py-5 ${
            reduceMotion ? "" : "animate-battle-hud-live"
          }`}
        >
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
            <div className="text-left sm:min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/90">Live simulation</p>
              <p className="mt-1 text-lg font-black text-white">
                Matchup {displayTurn + 1}{" "}
                <span className="text-slate-500">
                  / {turnGroups.length}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Hits play one at a time — turn sound on for the full arena feel.</p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => void ensureBattleAudio()}
                className="min-h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10 cursor-pointer sm:min-h-0"
              >
                Enable audio
              </button>
              <button
                type="button"
                onClick={skipPlayback}
                className="min-h-10 rounded-xl border border-amber-200/40 bg-amber-200/15 px-4 text-xs font-black text-amber-100 transition-colors hover:bg-amber-200/25 cursor-pointer sm:min-h-0"
              >
                Skip to result
              </button>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-[width] duration-700 ease-out ${
                reduceMotion ? "" : "animate-battle-progress-glow"
              }`}
              style={{
                width: `${Math.min(100, ((displayTurn + (displayHits / Math.max(currentLogsFull.length, 1))) / Math.max(turnGroups.length, 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {turnGroups.length > 0 && faceoff ? (
        <div className="battle-faceoff-arena relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6">
          <div className="relative z-10 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Matchup</p>
              <p className="text-lg font-black text-white">
                {displayTurn + 1} <span className="text-slate-500">/</span> {turnGroups.length}
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              {done ? (
                <>
                  <button
                    type="button"
                    disabled={reviewStep <= 0}
                    onClick={() => setReviewStep((s) => Math.max(0, s - 1))}
                    className="min-h-10 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-black text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 sm:flex-initial cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={reviewStep >= lastIdx}
                    onClick={() => setReviewStep((s) => Math.min(lastIdx, s + 1))}
                    className="min-h-10 flex-1 rounded-xl border border-amber-200/35 bg-amber-200/15 px-4 text-xs font-black text-amber-100 transition-colors hover:bg-amber-200/25 disabled:cursor-not-allowed disabled:opacity-35 sm:flex-initial cursor-pointer"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={restartSimulation}
                    className="min-h-10 flex-1 rounded-xl border border-violet-400/35 bg-violet-500/15 px-4 text-xs font-black text-violet-100 transition-colors hover:bg-violet-500/25 sm:flex-initial cursor-pointer"
                  >
                    Replay
                  </button>
                </>
              ) : (
                <p className="w-full text-center text-[11px] font-semibold text-slate-500 sm:text-left">Playback in progress…</p>
              )}
            </div>
          </div>

          <div className="relative z-10 mb-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all duration-500 ease-out"
              style={{ width: `${((displayTurn + 1) / turnGroups.length) * 100}%` }}
            />
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3">
            <div
              className={`rounded-xl border p-4 text-center transition-[box-shadow] duration-300 ${
                isSelfBattle ? "border-violet-400/30 bg-violet-500/10" : "border-amber-200/25 bg-amber-200/5"
              } ${!done && currentLogsVisible.length > 0 ? "ring-1 ring-amber-200/20" : ""}`}
            >
              <div
                key={`left-${clashKey}`}
                className={showClashMotion ? "animate-battle-lunge-left" : undefined}
              >
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {spectator ? "Red corner (attacks first)" : isSelfBattle ? "Side A (attacker)" : "Your card"}
                </p>
                <img
                  src={faceoff.leftCard.ownerAvatar}
                  alt=""
                  className="mx-auto h-16 w-16 rounded-full border-2 border-white/20 object-cover sm:h-20 sm:w-20"
                />
                <p className="mt-2 truncate text-base font-black text-white">{faceoff.leftCard.repoName}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {faceoff.leftCard.type} · HP {faceoff.leftCard.hp}
                </p>
              </div>
            </div>

            <div className="flex justify-center py-2 sm:py-0">
              <span
                key={`vs-${clashKey}`}
                className={`rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm font-black text-white/90 ${
                  showClashMotion ? "animate-battle-vs-pop" : ""
                }`}
              >
                VS
              </span>
            </div>

            <div
              className={`rounded-xl border p-4 text-center transition-[box-shadow] duration-300 ${
                isSelfBattle ? "border-sky-400/30 bg-sky-500/10" : "border-sky-300/25 bg-sky-500/5"
              } ${!done && currentLogsVisible.length > 0 ? "ring-1 ring-sky-200/20" : ""}`}
            >
              <div
                key={`right-${clashKey}`}
                className={showClashMotion ? "animate-battle-recoil-right" : undefined}
              >
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {spectator ? "Blue corner" : isSelfBattle ? "Side B (defender)" : "Opponent"}
                </p>
                <img
                  src={faceoff.rightCard.ownerAvatar}
                  alt=""
                  className="mx-auto h-16 w-16 rounded-full border-2 border-white/20 object-cover sm:h-20 sm:w-20"
                />
                <p className="mt-2 truncate text-base font-black text-white">{faceoff.rightCard.repoName}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {faceoff.rightCard.type} · HP {faceoff.rightCard.hp}
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6 space-y-2" aria-live="polite" aria-atomic="false">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">This exchange</p>
            {currentLogsVisible.map((log, i) => {
              const t = moveTypeStyle(log.moveType);
              return (
                <div
                  key={`${log.turn}-${i}-${log.attackerCard}-${log.damage}-${i}`}
                  className={`rounded-xl border px-3 py-2.5 text-sm sm:px-4 ${
                    log.status === "knockout"
                      ? `border-red-400/35 bg-red-500/10 ${reduceMotion ? "" : "animate-battle-ko-pop"}`
                      : `border-white/10 bg-black/35 ${reduceMotion ? "" : "animate-battle-hit-pop"}`
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-black text-amber-200">{log.attackerCard}</span>
                    <span className="text-slate-500">→</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase text-white ${t.badge}`}>{log.move}</span>
                    <span className="text-slate-500">→</span>
                    <span className="font-bold text-sky-200">{log.defenderCard}</span>
                    <span className="font-black text-white">{log.damage} dmg</span>
                    {log.wasWeak ? <span className="text-xs font-bold text-rose-300">Super effective</span> : null}
                    {log.wasResisted ? <span className="text-xs font-bold text-slate-400">Resisted</span> : null}
                    {log.wasCrit ? <span className="text-xs font-bold text-yellow-300">Crit</span> : null}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    HP {log.defenderHpBefore} → {log.defenderHpAfter}
                    {log.status === "knockout" ? <span className="ml-2 font-black text-red-300">KO</span> : null}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            key={exchangeResult.message}
            className={`mt-4 rounded-xl border px-4 py-3 text-center text-sm font-bold ${
              reduceMotion ? "" : "animate-battle-exchange-pop"
            } ${
              exchangeResult.kind === "ko"
                ? exchangeResult.tone === "good"
                  ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                  : exchangeResult.tone === "bad"
                    ? "border-red-400/35 bg-red-500/10 text-red-200"
                    : "border-white/15 bg-white/5 text-slate-200"
                : "border-white/10 bg-black/30 text-slate-400"
            }`}
          >
            {exchangeResult.message}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DeckPreview
          deck={attackerDeck}
          label={
            spectator
              ? `Red · @${att} · top starred repos`
              : isSelfBattle
                ? "Attacker (Side A)"
                : "Your Deck"
          }
          highlight={done && isWin}
          reducedMotion={reduceMotion}
        />
        <DeckPreview
          deck={defenderDeck}
          label={
            spectator
              ? `Blue · @${def} · top starred repos`
              : isSelfBattle
                ? "Defender (Side B)"
                : "Opponent"
          }
          highlight={done && !isWin && !isDraw}
          reducedMotion={reduceMotion}
        />
      </div>

      {done ? <BattleSharePanel outcome={outcome} variant="inline" /> : null}

      <details className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <summary className="cursor-pointer px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/5">
          Full battle log ({battle.roundLogs.length} hits)
        </summary>
        <div className="max-h-80 space-y-1 overflow-y-auto px-4 pb-4">
          {battle.roundLogs.map((log: BattleRoundLog, i: number) => (
            <div key={i} className={`rounded px-2 py-1 text-xs ${log.status === "knockout" ? "bg-red-500/10 text-red-300" : "text-slate-400"}`}>
              <span className="text-white/50">T{log.turn}</span>{" "}
              <span className="font-bold text-amber-200">{log.attackerCard}</span> · {log.move} ·{" "}
              <span className="text-sky-300">{log.defenderCard}</span> ({log.damage})
              {log.status === "knockout" ? <span className="font-black text-red-400"> KO</span> : null}
            </div>
          ))}
        </div>
      </details>

      <div className="flex justify-center px-1">
        <button
          type="button"
          onClick={onNewBattle}
          className="min-h-11 w-full max-w-xs rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-3 text-sm font-black text-slate-900 shadow-[0_8px_28px_-8px_rgba(251,191,36,0.55)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_12px_32px_-6px_rgba(251,191,36,0.65)] active:scale-[0.98] cursor-pointer sm:w-auto sm:max-w-none sm:min-h-0"
        >
          Battle Again
        </button>
      </div>
    </div>
  );
}

function DeckPreview({
  deck,
  label,
  highlight,
  reducedMotion,
}: {
  deck: DeckSummary;
  label: string;
  highlight: boolean;
  reducedMotion: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition-[border-color,box-shadow] duration-500 sm:p-4 ${
        highlight
          ? `border-emerald-500/50 bg-emerald-500/5 ${reducedMotion ? "" : "animate-battle-winner-glow"}`
          : "border-white/10 bg-black/30"
      }`}
    >
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-xs">{label}</p>
      <p className="mb-3 text-xs font-bold text-white sm:text-sm">
        @{deck.githubUsername} &middot; {deck.name}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {deck.cards.map((card, i) => (
          <div
            key={card.repoFullName}
            style={
              highlight && !reducedMotion ? { animationDelay: `${i * 80}ms` } : undefined
            }
            className={`rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-center sm:min-w-0 sm:flex-1 ${
              highlight && !reducedMotion ? "animate-battle-deck-chip-in" : ""
            }`}
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
