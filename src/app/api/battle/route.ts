import { createServerSupabase } from "@/lib/supabase/server";
import { startBattle } from "@/lib/battle-service";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      deckId: string;
      githubUsername: string;
      vsSelf?: boolean;
    };

    if (!body.deckId) {
      return Response.json({ error: "deckId is required" }, { status: 400 });
    }

    const outcome = await startBattle(
      supabase,
      user.id,
      body.deckId,
      body.githubUsername || "unknown",
      body.vsSelf ?? false,
    );

    return Response.json(outcome, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Battle failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
