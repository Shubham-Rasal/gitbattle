/**
 * Deterministic auto-play battle engine.
 *
 * Two decks of 3 cards each fight until one side is eliminated.
 * Each turn: the faster card attacks first, damage is computed with
 * type effectiveness + attack/defense + crit, then the defender retaliates
 * (if still alive). When a card's HP reaches 0 it's knocked out and the
 * next card in the deck enters. Battle ends when one deck runs out.
 */

import { PokemonCard, PokemonType } from "@/types/card";
import { BattleRoundLog, BattleResult } from "@/types/game";

/* ── Type chart ───────────────────────────────────── */

const TYPE_WEAKNESSES: Partial<Record<PokemonType, PokemonType>> = {
  fire: "water",
  water: "electric",
  grass: "fire",
  electric: "ground",
  psychic: "dark",
  fighting: "psychic",
  dark: "fighting",
  steel: "fire",
  dragon: "ice",
  fairy: "steel",
  normal: "fighting",
  ghost: "dark",
  ice: "fire",
  poison: "psychic",
  ground: "water",
  bug: "fire",
  rock: "water",
  flying: "electric",
};

const TYPE_RESISTANCES: Partial<Record<PokemonType, PokemonType>> = {
  fire: "grass",
  water: "fire",
  grass: "water",
  electric: "flying",
  psychic: "fighting",
  fighting: "bug",
  dark: "ghost",
  steel: "normal",
  dragon: "fire",
  fairy: "dark",
  normal: "ghost",
  ghost: "normal",
  ice: "ice",
  poison: "fairy",
  ground: "electric",
  bug: "grass",
  rock: "flying",
  flying: "grass",
};

/* ── Seeded PRNG (simple mulberry32) ──────────────── */

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Battle state helpers ─────────────────────────── */

interface CardState {
  card: PokemonCard;
  currentHp: number;
}

function bestMove(card: PokemonCard, energyBudget: number) {
  // Pick the highest damage move the card can afford
  const affordable = card.moves.filter((m) => m.energyCost <= energyBudget);
  if (affordable.length === 0) return card.moves[0]; // fallback: cheapest
  return affordable.reduce((a, b) => (b.damage > a.damage ? b : a));
}

function calcDamage(
  attacker: PokemonCard,
  defender: PokemonCard,
  moveDamage: number,
  moveType: PokemonType,
  rand: () => number,
): { damage: number; wasWeak: boolean; wasResisted: boolean; wasCrit: boolean } {
  // Base formula: (moveDamage * attack / defense) with floor
  const atkStat = attacker.attack;
  const defStat = Math.max(defender.defense, 1);
  let raw = Math.floor((moveDamage * atkStat) / defStat);

  // Type effectiveness
  let wasWeak = false;
  let wasResisted = false;
  if (TYPE_WEAKNESSES[defender.type] === moveType) {
    raw = Math.floor(raw * 1.5);
    wasWeak = true;
  } else if (TYPE_RESISTANCES[defender.type] === moveType) {
    raw = Math.floor(raw * 0.5);
    wasResisted = true;
  }

  // Crit: 10% chance for 1.5x
  const wasCrit = rand() < 0.1;
  if (wasCrit) {
    raw = Math.floor(raw * 1.5);
  }

  // Floor damage at 1
  const damage = Math.max(raw, 1);
  return { damage, wasWeak, wasResisted, wasCrit };
}

/* ── Public interface ─────────────────────────────── */

export interface BattleEngineResult {
  result: BattleResult;
  roundLogs: BattleRoundLog[];
  roundCount: number;
  winnerSide: "attacker" | "defender" | null;
}

const MAX_TURNS = 100; // safety valve

export function runBattle(
  attackerCards: PokemonCard[],
  defenderCards: PokemonCard[],
  seed: number,
): BattleEngineResult {
  const rand = mulberry32(seed);

  // Build mutable HP state
  const atkTeam: CardState[] = attackerCards.map((c) => ({ card: c, currentHp: c.hp }));
  const defTeam: CardState[] = defenderCards.map((c) => ({ card: c, currentHp: c.hp }));

  let atkIdx = 0;
  let defIdx = 0;
  const logs: BattleRoundLog[] = [];
  let turn = 0;

  while (atkIdx < atkTeam.length && defIdx < defTeam.length && turn < MAX_TURNS) {
    turn++;
    const atkState = atkTeam[atkIdx];
    const defState = defTeam[defIdx];

    // Determine who strikes first by speed; tie-break by random
    const atkFirst =
      atkState.card.speed > defState.card.speed ||
      (atkState.card.speed === defState.card.speed && rand() < 0.5);

    const first = atkFirst ? atkState : defState;
    const second = atkFirst ? defState : atkState;
    const firstIsAttacker = atkFirst;

    // First strike
    const move1 = bestMove(first.card, 4); // generous energy budget for auto-play
    const hit1 = calcDamage(first.card, second.card, move1.damage, move1.type, rand);
    const hpBefore2 = second.currentHp;
    second.currentHp = Math.max(second.currentHp - hit1.damage, 0);
    const ko1 = second.currentHp === 0;

    logs.push({
      turn,
      attackerCard: first.card.repoName,
      defenderCard: second.card.repoName,
      move: move1.name,
      moveType: move1.type,
      damage: hit1.damage,
      defenderHpBefore: hpBefore2,
      defenderHpAfter: second.currentHp,
      wasWeak: hit1.wasWeak,
      wasResisted: hit1.wasResisted,
      wasCrit: hit1.wasCrit,
      status: ko1 ? "knockout" : "normal",
    });

    if (ko1) {
      // Advance KO'd side
      if (firstIsAttacker) {
        defIdx++;
      } else {
        atkIdx++;
      }
      continue;
    }

    // Second strike (retaliation)
    const move2 = bestMove(second.card, 4);
    const hit2 = calcDamage(second.card, first.card, move2.damage, move2.type, rand);
    const hpBefore1 = first.currentHp;
    first.currentHp = Math.max(first.currentHp - hit2.damage, 0);
    const ko2 = first.currentHp === 0;

    logs.push({
      turn,
      attackerCard: second.card.repoName,
      defenderCard: first.card.repoName,
      move: move2.name,
      moveType: move2.type,
      damage: hit2.damage,
      defenderHpBefore: hpBefore1,
      defenderHpAfter: first.currentHp,
      wasWeak: hit2.wasWeak,
      wasResisted: hit2.wasResisted,
      wasCrit: hit2.wasCrit,
      status: ko2 ? "knockout" : "normal",
    });

    if (ko2) {
      if (!firstIsAttacker) {
        defIdx++;
      } else {
        atkIdx++;
      }
    }
  }

  // Determine winner
  const atkAlive = atkTeam.some((c) => c.currentHp > 0);
  const defAlive = defTeam.some((c) => c.currentHp > 0);

  let result: BattleResult;
  let winnerSide: "attacker" | "defender" | null;

  if (atkAlive && !defAlive) {
    result = "win";
    winnerSide = "attacker";
  } else if (!atkAlive && defAlive) {
    result = "lose";
    winnerSide = "defender";
  } else {
    result = "draw";
    winnerSide = null;
  }

  return { result, roundLogs: logs, roundCount: turn, winnerSide };
}
