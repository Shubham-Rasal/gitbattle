import { PokemonCard } from "@/types/card";

/* ── Deck ─────────────────────────────────────────── */

export interface DeckPayload {
  githubUsername: string;
  cards: PokemonCard[];
  name?: string;
}

export interface DeckRow {
  id: string;
  owner_id: string | null;
  github_username: string;
  name: string;
  cards: PokemonCard[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeckSummary {
  id: string;
  ownerId: string | null;
  githubUsername: string;
  name: string;
  cards: PokemonCard[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ── Auth ──────────────────────────────────────────── */

export interface AuthUserProfile {
  id: string;
  githubUsername: string | null;
  avatarUrl: string | null;
  email: string | null;
}

/* ── Battle ────────────────────────────────────────── */

export interface BattleRoundLog {
  turn: number;
  attackerCard: string;
  defenderCard: string;
  move: string;
  moveType: string;
  damage: number;
  defenderHpBefore: number;
  defenderHpAfter: number;
  wasWeak: boolean;
  wasResisted: boolean;
  wasCrit: boolean;
  status: "normal" | "knockout";
}

export type BattleResult = "win" | "lose" | "draw";

export interface BattleSessionRow {
  id: string;
  attacker_user_id: string | null;
  defender_user_id: string | null;
  attacker_deck_id: string;
  defender_deck_id: string;
  attacker_username: string | null;
  defender_username: string | null;
  winner_user_id: string | null;
  winner_deck_id: string | null;
  result: BattleResult;
  round_count: number;
  round_logs: BattleRoundLog[];
  seed: number;
  created_at: string;
}

export interface BattleSessionRecord {
  id: string;
  attackerUserId: string | null;
  defenderUserId: string | null;
  attackerDeckId: string;
  defenderDeckId: string;
  attackerUsername: string | null;
  defenderUsername: string | null;
  winnerUserId: string | null;
  winnerDeckId: string | null;
  result: BattleResult;
  roundCount: number;
  roundLogs: BattleRoundLog[];
  seed: number;
  createdAt: string;
  /** True when the fight was not stored (e.g. missing service role). */
  isGuest?: boolean;
}

export interface BattleOutcome {
  battle: BattleSessionRecord;
  attackerDeck: DeckSummary;
  defenderDeck: DeckSummary;
}

/* ── Leaderboard ───────────────────────────────────── */

export interface LeaderboardEntry {
  userId: string;
  githubUsername: string;
  wins: number;
  losses: number;
  draws: number;
  totalBattles: number;
  winRate: number;
  lastPlayed: string | null;
}

/** Public landing-page aggregates from `/api/stats`. */
export interface PublicArenaStats {
  playerCount: number;
  cardsForged: number | null;
  bestWinStreak: number;
}
