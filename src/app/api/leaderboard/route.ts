import { createServerSupabase } from "@/lib/supabase/server";
import { getLeaderboard, getRecentBattles } from "@/lib/battle-service";

export async function GET() {
  const supabase = await createServerSupabase();

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
