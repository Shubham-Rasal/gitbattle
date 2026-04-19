import { createServerSupabase, createServiceClient } from "@/lib/supabase/server";
import { getLeaderboard, getRecentBattles } from "@/lib/battle-service";

export async function GET() {
  /** Service role avoids RLS edge cases and matches the username-based leaderboard view after guest migrations. */
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ? createServiceClient()
    : await createServerSupabase();

  try {
    const [entries, recentBattles] = await Promise.all([
      getLeaderboard(supabase, 50),
      getRecentBattles(supabase, 25),
    ]);
    return Response.json({ entries, recentBattles });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch leaderboard";
    return Response.json({ error: msg }, { status: 500 });
  }
}
