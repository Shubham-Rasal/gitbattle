import { SupabaseClient } from "@supabase/supabase-js";
import { DeckRow, DeckSummary, DeckPayload } from "@/types/game";

function toDeckSummary(row: DeckRow): DeckSummary {
  return {
    id: row.id,
    ownerId: row.owner_id,
    githubUsername: row.github_username,
    name: row.name,
    cards: row.cards,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const MAX_DECK_SIZE = 3;

export async function createDeck(
  supabase: SupabaseClient,
  userId: string,
  payload: DeckPayload,
): Promise<DeckSummary> {
  if (!payload.cards || payload.cards.length === 0 || payload.cards.length > MAX_DECK_SIZE) {
    throw new Error(`Deck must contain 1-${MAX_DECK_SIZE} cards`);
  }

  const { data, error } = await supabase
    .from("gxd_decks")
    .insert({
      owner_id: userId,
      github_username: payload.githubUsername,
      name: payload.name || `${payload.githubUsername}'s Deck`,
      cards: payload.cards,
      is_public: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save deck: ${error.message}`);
  return toDeckSummary(data as DeckRow);
}

export async function listMyDecks(
  supabase: SupabaseClient,
  userId: string,
): Promise<DeckSummary[]> {
  const { data, error } = await supabase
    .from("gxd_decks")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list decks: ${error.message}`);
  return ((data ?? []) as DeckRow[]).map(toDeckSummary);
}

export async function getDeckById(
  supabase: SupabaseClient,
  deckId: string,
): Promise<DeckSummary | null> {
  const { data, error } = await supabase
    .from("gxd_decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (error) return null;
  return toDeckSummary(data as DeckRow);
}

export async function deleteDeck(
  supabase: SupabaseClient,
  userId: string,
  deckId: string,
): Promise<void> {
  const { error } = await supabase
    .from("gxd_decks")
    .delete()
    .eq("id", deckId)
    .eq("owner_id", userId);

  if (error) throw new Error(`Failed to delete deck: ${error.message}`);
}

/**
 * Pick a random opponent deck from all public decks excluding a given user.
 * Uses Supabase's random via a workaround: fetch a batch then pick one.
 */
export async function pickRandomOpponentDeck(
  supabase: SupabaseClient,
  excludeUserId: string,
): Promise<DeckSummary | null> {
  // Count available
  const { count, error: countErr } = await supabase
    .from("gxd_decks")
    .select("id", { count: "exact", head: true })
    .eq("is_public", true)
    .neq("owner_id", excludeUserId);

  if (countErr || !count || count === 0) return null;

  // Pick a random offset
  const offset = Math.floor(Math.random() * count);

  const { data, error } = await supabase
    .from("gxd_decks")
    .select("*")
    .eq("is_public", true)
    .neq("owner_id", excludeUserId)
    .range(offset, offset)
    .single();

  if (error || !data) return null;
  return toDeckSummary(data as DeckRow);
}
