"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import type { BattleOutcome } from "@/types/game";
import { BattleShareCard, BATTLE_SHARE_EXPORT_WIDTH_PX } from "@/components/battle-share-card";

function formatBattleSummaryLines(o: BattleOutcome): string[] {
  const { battle, attackerDeck, defenderDeck } = o;
  const a = battle.attackerUsername ?? attackerDeck.githubUsername;
  const d = battle.defenderUsername ?? defenderDeck.githubUsername;
  const res = battle.result === "win" ? "Win (attacker)" : battle.result === "lose" ? "Loss (attacker)" : "Draw";
  const ko = battle.roundLogs.filter((l) => l.status === "knockout").length;
  return [
    `GitBattle — ${a} vs ${d}`,
    `Decks: ${attackerDeck.name} · ${defenderDeck.name}`,
    `Result: ${res} · ${battle.roundCount} rounds · ${battle.roundLogs.length} hits · ${ko} KO`,
  ];
}

/** Plain summary + URL on its own final line (avoids merged paste being treated as part of the path). */
function formatBattleSummaryForClipboard(o: BattleOutcome, pageUrl: string): string {
  return [...formatBattleSummaryLines(o), "", pageUrl].join("\n");
}

type BattleSharePanelProps = {
  outcome: BattleOutcome;
  /** Full-page share view with nav (used on /share/battle/[id]) */
  variant?: "inline" | "page";
};

export function BattleSharePanel({ outcome, variant = "inline" }: BattleSharePanelProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const battleId = outcome.battle.id.trim();
  const sharePath = `/share/battle/${battleId}`;
  const persistedShare = outcome.battle.isGuest !== true;

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2600);
  }, []);

  const absoluteUrl =
    typeof window !== "undefined"
      ? new URL(sharePath, window.location.origin).href
      : sharePath;

  const copyLink = useCallback(async () => {
    const url =
      typeof window !== "undefined"
        ? new URL(sharePath, window.location.origin).href
        : absoluteUrl;
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    } catch {
      flash("Could not copy link");
    }
  }, [absoluteUrl, flash, sharePath]);

  const copySummary = useCallback(async () => {
    const pageUrl =
      typeof window !== "undefined"
        ? new URL(sharePath, window.location.origin).href
        : sharePath;
    const text = persistedShare
      ? formatBattleSummaryForClipboard(outcome, pageUrl)
      : [...formatBattleSummaryLines(outcome), "", "Guest matchup (not saved — no share URL)."].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      flash("Summary copied");
    } catch {
      flash("Could not copy");
    }
  }, [outcome, flash, sharePath, persistedShare]);

  const downloadPng = useCallback(async () => {
    const node = cardRef.current;
    if (!node) return;
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#050608",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `gitbattle-${battleId.slice(0, 8)}.png`;
      a.click();
      flash("Image saved");
    } catch {
      flash("Could not save image");
    }
  }, [battleId, flash]);

  const tryNativeShare = useCallback(async () => {
    if (!navigator.share) {
      flash("Use Copy link on this device");
      return;
    }
    const { battle, attackerDeck, defenderDeck } = outcome;
    const a = battle.attackerUsername ?? attackerDeck.githubUsername;
    const d = battle.defenderUsername ?? defenderDeck.githubUsername;
    const url =
      typeof window !== "undefined"
        ? new URL(sharePath, window.location.origin).href
        : absoluteUrl;
    try {
      /* Omit `text`: many platforms concatenate text + url into one string when copying from the share sheet. */
      await navigator.share({
        title: `GitBattle · ${a} vs ${d}`,
        url,
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") flash("Share cancelled");
    }
  }, [absoluteUrl, outcome, flash, sharePath]);

  const isPage = variant === "page";

  return (
    <div
      className={
        isPage
          ? "flex min-h-[100dvh] flex-col items-center bg-gradient-to-b from-gray-950 via-gray-900 to-black px-4 py-10 text-white"
          : "rounded-2xl border border-white/[0.08] bg-black/35 p-4 sm:p-5"
      }
    >
      {isPage ? (
        <header className="mb-8 flex w-full max-w-lg flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <Link
            href="/leaderboard"
            className="text-sm font-black uppercase tracking-[0.14em] text-amber-200/90 underline decoration-amber-200/30 underline-offset-4 transition-colors hover:text-amber-100"
          >
            GitBattle
          </Link>
          <Link
            href="/decks"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10"
          >
            Open arena
          </Link>
        </header>
      ) : (
        <div className="mb-4 text-center sm:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/80">Share</p>
          <h3 className="mt-1 text-lg font-black text-white">Battle card</h3>
          <p className="mt-1 text-xs text-slate-500">
            {persistedShare
              ? "One image, link, or text blurb for feeds and DMs."
              : "Save a PNG or copy the summary — guest matchups are not stored, so there is no share URL."}
          </p>
        </div>
      )}

      <div className="flex w-full max-w-lg flex-wrap justify-center gap-2">
        {persistedShare ? (
        <button
          type="button"
          onClick={() => void copyLink()}
          className="min-h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-black text-white transition-colors hover:bg-white/10 cursor-pointer"
        >
          Copy link
        </button>
        ) : null}
        <button
          type="button"
          onClick={() => void copySummary()}
          className="min-h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10 cursor-pointer"
        >
          Copy text
        </button>
        {persistedShare ? (
        <button
          type="button"
          onClick={() => void tryNativeShare()}
          className="min-h-10 rounded-xl border border-sky-400/35 bg-sky-500/15 px-4 text-xs font-black text-sky-100 transition-colors hover:bg-sky-500/25 cursor-pointer"
        >
          Share…
        </button>
        ) : null}
        <button
          type="button"
          onClick={() => void downloadPng()}
          className="min-h-10 rounded-xl border border-amber-200/40 bg-gradient-to-r from-amber-300/90 to-orange-400/90 px-4 text-xs font-black text-slate-900 transition-all hover:from-amber-200 hover:to-orange-300 cursor-pointer"
        >
          Save PNG
        </button>
        {!isPage && persistedShare ? (
          <Link
            href={sharePath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-violet-400/35 bg-violet-500/15 px-4 text-xs font-black text-violet-100 transition-colors hover:bg-violet-500/25"
          >
            Open card page
          </Link>
        ) : null}
      </div>

      {notice ? (
        <p className="mt-3 text-center text-xs font-bold text-emerald-400/90" role="status">
          {notice}
        </p>
      ) : null}

      <div className="mt-6 flex w-full justify-center overflow-x-auto pb-2">
        <div className="inline-flex rounded-[1.5rem] p-3 ring-1 ring-white/[0.06]">
          <BattleShareCard ref={cardRef} outcome={outcome} className="shadow-2xl" />
        </div>
      </div>

      {!isPage ? (
        <p className="mt-3 text-center text-[10px] text-slate-600">
          Card width {BATTLE_SHARE_EXPORT_WIDTH_PX}px · best for screenshots &amp; PNG export
        </p>
      ) : null}
    </div>
  );
}
