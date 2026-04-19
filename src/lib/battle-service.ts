import { randomUUID } from "node:crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { generatePokemonCard } from "@/lib/card-generator";
import { runBattle } from "@/lib/battle/engine";
import { getDeckById, pickRandomOpponentDeck } from "@/lib/deck-service";
import { fetchTopStarredRepos } from "@/lib/github";
import { createServiceClient } from "@/lib/supabase/server";
import type { PokemonCard } from "@/types/card";
import {
  BattleSessionRow,
  BattleSessionRecord,
  BattleOutcome,
  DeckSummary,
} from "@/types/game";

const GH_USER_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function normalizeGithubUsername(raw: string): string | null {
  const s = raw.trim();
  if (!s || !GH_USER_RE.test(s)) return null;
  return s;
}

function toRecord(row: BattleSessionRow): BattleSessionRecord {
  return {
    id: row.id,
    attackerUserId: row.attacker_user_id,
    defenderUserId: row.defender_user_id,
    attackerDeckId: row.attacker_deck_id,
    defenderDeckId: row.defender_deck_id,
    attackerUsername: row.attacker_username,
    defenderUsername: row.defender_username,
    winnerUserId: row.winner_user_id,
    winnerDeckId: row.winner_deck_id,
    result: row.result,
    roundCount: row.round_count,
    roundLogs: row.round_logs,
    seed: row.seed,
    createdAt: row.created_at,
  };
}

export async function startBattle(
  supabase: SupabaseClient,
  userId: string,
  attackerDeckId: string,
  githubUsername: string,
  vsSelf = false,
): Promise<BattleOutcome> {
  // 1. Load attacker deck & validate ownership
  const attackerDeck = await getDeckById(supabase, attackerDeckId);
  if (!attackerDeck || attackerDeck.ownerId !== userId) {
    throw new Error("Deck not found or not owned by you");
  }

  // 2. Pick opponent — either the same deck (self-battle) or a random public deck
  let defenderDeck: Awaited<ReturnType<typeof pickRandomOpponentDeck>>;
  if (vsSelf) {
    defenderDeck = attackerDeck;
  } else {
    defenderDeck = await pickRandomOpponentDeck(supabase, userId);
    if (!defenderDeck) {
      throw new Error("No opponent decks available. You need other players to create decks first!");
    }
  }

  // 3. Run engine
  const seed = Date.now();
  const result = runBattle(attackerDeck.cards, defenderDeck.cards, seed);

  // 4. Determine winner identifiers
  let winnerUserId: string | null = null;
  let winnerDeckId: string | null = null;
  if (result.winnerSide === "attacker") {
    winnerUserId = userId;
    winnerDeckId = attackerDeck.id;
  } else if (result.winnerSide === "defender") {
    winnerUserId = defenderDeck.ownerId;
    winnerDeckId = defenderDeck.id;
  }

  // 5. Persist
  const { data, error } = await supabase
    .from("gxd_battle_sessions")
    .insert({
      attacker_user_id: userId,
      defender_user_id: defenderDeck.ownerId,
      attacker_deck_id: attackerDeck.id,
      defender_deck_id: defenderDeck.id,
      attacker_username: githubUsername,
      defender_username: defenderDeck.githubUsername,
      winner_user_id: winnerUserId,
      winner_deck_id: winnerDeckId,
      result: result.result,
      round_count: result.roundCount,
      round_logs: result.roundLogs,
      seed,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save battle: ${error.message}`);

  return {
    battle: toRecord(data as BattleSessionRow),
    attackerDeck,
    defenderDeck,
  };
}

export async function getLeaderboard(
  supabase: SupabaseClient,
  limit = 50,
) {
  const { data, error } = await supabase
    .from("gxd_leaderboard")
    .select("*")
    .limit(limit);

  if (error) throw new Error(`Failed to fetch leaderboard: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    userId: row.user_id as string,
    githubUsername: (row.github_username as string) || "unknown",
    wins: row.wins as number,
    losses: row.losses as number,
    draws: row.draws as number,
    totalBattles: row.total_battles as number,
    winRate: Number(row.win_rate),
    lastPlayed: row.last_played as string | null,
  }));
}

export async function getMyBattleHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<BattleSessionRecord[]> {
  const { data, error } = await supabase
    .from("gxd_battle_sessions")
    .select("*")
    .or(`attacker_user_id.eq.${userId},defender_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch battle history: ${error.message}`);
  return ((data ?? []) as BattleSessionRow[]).map(toRecord);
}

const BATTLE_SHARE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BATTLE_UUID_IN_TEXT_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extract a canonical battle id from a route param or pasted string.
 * Pasted share blurbs often append summary after the UUID (space/newline), which breaks lookups.
 */
export function parseBattleShareId(raw: string): string | null {
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep s */
  }
  s = s.trim();
  const m = s.match(BATTLE_UUID_IN_TEXT_RE);
  return m ? m[0] : null;
}

/**
 * Load a persisted battle + both decks for public share pages.
 * Uses the service role so deck rows resolve even when RLS would block anon reads.
 */
export async function getBattleOutcomeForShare(battleId: string): Promise<BattleOutcome | null> {
  const canon = parseBattleShareId(battleId) ?? battleId.trim();
  if (!BATTLE_SHARE_ID_RE.test(canon)) return null;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return null;

  const admin = createServiceClient();
  const { data: row, error } = await admin
    .from("gxd_battle_sessions")
    .select("*")
    .eq("id", canon)
    .maybeSingle();

  if (error || !row) return null;

  const attackerDeck = await getDeckById(admin, (row as BattleSessionRow).attacker_deck_id);
  const defenderDeck = await getDeckById(admin, (row as BattleSessionRow).defender_deck_id);
  if (!attackerDeck || !defenderDeck) return null;

  return {
    battle: toRecord(row as BattleSessionRow),
    attackerDeck,
    defenderDeck,
  };
}

function guestDeckName(username: string, cards: PokemonCard[]): string {
  const types = [...new Set(cards.map((c) => c.type))];
  return types.length > 0 ? `${username}'s ${types.join("/")} Deck` : `${username}'s Deck`;
}

/**
 * Simulated battle from each user’s top 3 starred public repos (no sign-in, not persisted).
 */
export async function runGuestGithubBattle(
  attackerUsername: string,
  defenderUsername: string,
): Promise<BattleOutcome> {
  const a = normalizeGithubUsername(attackerUsername);
  const d = normalizeGithubUsername(defenderUsername);
  if (!a || !d) throw new Error("Enter valid GitHub usernames");
  if (a.toLowerCase() === d.toLowerCase()) throw new Error("Pick two different GitHub users");

  const [atkRepos, defRepos] = await Promise.all([
    fetchTopStarredRepos(a, 3),
    fetchTopStarredRepos(d, 3),
  ]);

  const [atkCards, defCards] = await Promise.all([
    Promise.all(atkRepos.map(generatePokemonCard)),
    Promise.all(defRepos.map(generatePokemonCard)),
  ]);

  const seed = Date.now();
  const engine = runBattle(atkCards, defCards, seed);
  const now = new Date().toISOString();
  const battleId = `guest-${randomUUID()}`;
  const atkDeckId = `guest-deck-${randomUUID()}`;
  const defDeckId = `guest-deck-${randomUUID()}`;

  let winnerUserId: string | null = null;
  let winnerDeckId: string | null = null;
  if (engine.winnerSide === "attacker") {
    winnerUserId = "guest-attacker";
    winnerDeckId = atkDeckId;
  } else if (engine.winnerSide === "defender") {
    winnerUserId = "guest-defender";
    winnerDeckId = defDeckId;
  }

  const attackerDeck: DeckSummary = {
    id: atkDeckId,
    ownerId: "guest",
    githubUsername: a,
    name: guestDeckName(a, atkCards),
    cards: atkCards,
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  };

  const defenderDeck: DeckSummary = {
    id: defDeckId,
    ownerId: "guest",
    githubUsername: d,
    name: guestDeckName(d, defCards),
    cards: defCards,
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  };

  const battle: BattleSessionRecord = {
    id: battleId,
    attackerUserId: "guest-attacker",
    defenderUserId: "guest-defender",
    attackerDeckId: atkDeckId,
    defenderDeckId: defDeckId,
    attackerUsername: a,
    defenderUsername: d,
    winnerUserId,
    winnerDeckId,
    result: engine.result,
    roundCount: engine.roundCount,
    roundLogs: engine.roundLogs,
    seed,
    createdAt: now,
    isGuest: true,
  };

  return { battle, attackerDeck, defenderDeck };
}
