import { createServiceClient } from "@/lib/supabase/server";
import { listRecentPublicDecks } from "@/lib/deck-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "6", 10);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 6;

  try {
    const supabase = createServiceClient();
    const decks = await listRecentPublicDecks(supabase, limit);
    return Response.json({ decks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load recent decks";
    return Response.json({ error: msg }, { status: 500 });
  }
}
