/** Minimal battle row for streak computation (chronological order). */
export type BattleStreakRow = {
  attackerKey: string;
  defenderKey: string;
  result: "win" | "lose" | "draw";
  created_at: string;
};

export function battleParticipantKey(
  userId: string | null | undefined,
  githubUsername: string | null | undefined,
): string | null {
  if (userId) return `uid:${userId}`;
  const g = githubUsername?.trim();
  if (g) return `gh:${g.toLowerCase()}`;
  return null;
}

/**
 * Longest consecutive wins for any user, in timeline order.
 * Draws and losses reset the active streak; defender wins invert perspective per row.
 */
export function computeMaxWinStreak(battles: BattleStreakRow[]): number {
  const sorted = [...battles].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const current = new Map<string, number>();
  let globalMax = 0;

  for (const row of sorted) {
    const a = row.attackerKey;
    const d = row.defenderKey;

    if (row.result === "win") {
      const na = (current.get(a) ?? 0) + 1;
      current.set(a, na);
      globalMax = Math.max(globalMax, na);
      current.set(d, 0);
    } else if (row.result === "lose") {
      const nd = (current.get(d) ?? 0) + 1;
      current.set(d, nd);
      globalMax = Math.max(globalMax, nd);
      current.set(a, 0);
    } else {
      current.set(a, 0);
      current.set(d, 0);
    }
  }

  return globalMax;
}
