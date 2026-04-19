import { createServerSupabase } from "@/lib/supabase/server";
import { createDeck, listMyDecks, deleteDeck } from "@/lib/deck-service";
import { DeckPayload } from "@/types/game";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Unauthorized", debug: authError?.message ?? "no user in session" },
      { status: 401 },
    );
  }

  try {
    const decks = await listMyDecks(supabase, user.id);
    return Response.json({ decks, userId: user.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list decks";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as DeckPayload;
    if (!body.cards || !Array.isArray(body.cards) || body.cards.length === 0 || body.cards.length > 3) {
      return Response.json({ error: "Deck must contain 1-3 cards" }, { status: 400 });
    }
    if (!body.githubUsername) {
      return Response.json({ error: "GitHub username is required" }, { status: 400 });
    }

    const deck = await createDeck(supabase, user.id, body);
    return Response.json({ deck }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create deck";
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get("id");

  if (!deckId) {
    return Response.json({ error: "Deck ID is required" }, { status: 400 });
  }

  try {
    await deleteDeck(supabase, user.id, deckId);
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete deck";
    return Response.json({ error: msg }, { status: 500 });
  }
}
