/** Minimal battle row for streak computation (chronological order). */
export type BattleStreakRow = {
  attacker_user_id: string;
  defender_user_id: string | null;
  result: "win" | "lose" | "draw";
  created_at: string;
};

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
    const a = row.attacker_user_id;
    const d = row.defender_user_id;

    if (row.result === "win") {
      const na = (current.get(a) ?? 0) + 1;
      current.set(a, na);
      globalMax = Math.max(globalMax, na);
      if (d) current.set(d, 0);
    } else if (row.result === "lose") {
      if (d) {
        const nd = (current.get(d) ?? 0) + 1;
        current.set(d, nd);
        globalMax = Math.max(globalMax, nd);
      }
      current.set(a, 0);
    } else {
      current.set(a, 0);
      if (d) current.set(d, 0);
    }
  }

  return globalMax;
}
