import { createServerSupabase } from "@/lib/supabase/server";
import { getLeaderboard } from "@/lib/battle-service";

export async function GET() {
  const supabase = await createServerSupabase();

  try {
    const entries = await getLeaderboard(supabase, 50);
    return Response.json({ entries });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch leaderboard";
    return Response.json({ error: msg }, { status: 500 });
  }
}
