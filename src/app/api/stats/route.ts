import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import {
  battleParticipantKey,
  computeMaxWinStreak,
  type BattleStreakRow,
} from "@/lib/arena-stats";
import type { PublicArenaStats } from "@/types/game";

export async function GET() {
  try {
    const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const admin = hasService ? createServiceClient() : null;
    const supabase = admin ?? (await createServerSupabase());

    let playerCount = 0;
    let cardsForged: number | null = null;

    if (admin) {
      const { data: decks, error: deckErr } = await admin
        .from("gxd_decks")
        .select("owner_id, cards")
        .eq("is_public", true);

      if (deckErr) throw new Error(deckErr.message);

      const rows = decks ?? [];
      playerCount = new Set(
        rows
          .map((r: { owner_id: string | null }) => r.owner_id)
          .filter((id): id is string => Boolean(id)),
      ).size;
      cardsForged = rows.reduce((sum: number, r: { cards: unknown }) => {
        const c = r.cards;
        return sum + (Array.isArray(c) ? c.length : 0);
      }, 0);
    } else {
      const { data: owners, error: ownersErr } = await supabase
        .from("gxd_battle_sessions")
        .select("attacker_user_id, defender_user_id");

      if (ownersErr) throw new Error(ownersErr.message);

      const ids = new Set<string>();
      for (const row of owners ?? []) {
        const r = row as { attacker_user_id: string | null; defender_user_id: string | null };
        if (r.attacker_user_id) ids.add(r.attacker_user_id);
        if (r.defender_user_id) ids.add(r.defender_user_id);
      }
      playerCount = ids.size;
      cardsForged = null;
    }

    const { data: battles, error: battleErr } = await supabase
      .from("gxd_battle_sessions")
      .select(
        "attacker_user_id, defender_user_id, attacker_username, defender_username, result, created_at",
      )
      .order("created_at", { ascending: true });

    if (battleErr) throw new Error(battleErr.message);

    const streakRows = (battles ?? [])
      .map((row: Record<string, unknown>) => {
        const attackerKey = battleParticipantKey(
          row.attacker_user_id as string | null,
          row.attacker_username as string | null,
        );
        const defenderKey = battleParticipantKey(
          row.defender_user_id as string | null,
          row.defender_username as string | null,
        );
        if (!attackerKey || !defenderKey || attackerKey === defenderKey) return null;
        return {
          attackerKey,
          defenderKey,
          result: row.result as "win" | "lose" | "draw",
          created_at: row.created_at as string,
        } satisfies BattleStreakRow;
      })
      .filter((r): r is BattleStreakRow => r !== null);
    const bestWinStreak = computeMaxWinStreak(streakRows);

    const body: PublicArenaStats = {
      playerCount,
      cardsForged,
      bestWinStreak,
    };

    return Response.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load stats";
    return Response.json({ error: msg }, { status: 500 });
  }
}
