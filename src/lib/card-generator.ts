import { RepoStats, PokemonCard, PokemonType, PokemonMove } from "@/types/card";

// Map programming languages to Pokemon types
const LANGUAGE_TYPE_MAP: Record<string, PokemonType> = {
  TypeScript: "electric",
  JavaScript: "electric",
  Python: "psychic",
  Rust: "steel",
  Go: "water",
  Java: "fire",
  "C++": "fighting",
  C: "fighting",
  "C#": "dragon",
  Ruby: "fairy",
  PHP: "poison",
  Swift: "flying",
  Kotlin: "fire",
  Scala: "dragon",
  Haskell: "psychic",
  Elixir: "fairy",
  Clojure: "ghost",
  Lua: "dark",
  Shell: "ground",
  Bash: "ground",
  HTML: "normal",
  CSS: "ice",
  Dart: "flying",
  Zig: "steel",
  Nim: "dark",
  OCaml: "psychic",
  "Vim Script": "dark",
  Dockerfile: "steel",
  Vue: "grass",
  Svelte: "grass",
  Jupyter: "psychic",
  R: "psychic",
};

const TYPE_WEAKNESSES: Record<PokemonType, PokemonType> = {
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

const TYPE_RESISTANCES: Record<PokemonType, PokemonType> = {
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

function isPokemonType(value: string): value is PokemonType {
  return (Object.keys(TYPE_WEAKNESSES) as PokemonType[]).includes(value as PokemonType);
}

function normalizeMoveType(value: string): PokemonType {
  return isPokemonType(value) ? value : "normal";
}

function clampToInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const next = Math.round(value);
  return Math.max(min, Math.min(max, next));
}

// Scale raw value into Pokemon stat range (1-255)
function scaleStat(value: number, max: number, floor = 10, ceiling = 200): number {
  const scaled = Math.floor((value / max) * ceiling);
  return Math.max(floor, Math.min(ceiling, scaled));
}

function generateTitle(repo: RepoStats): string {
  if (repo.stars > 50000) return "The Legendary";
  if (repo.stars > 10000) return "The Mythical";
  if (repo.stars > 5000) return "The Almighty";
  if (repo.stars > 1000) return "The Renowned";
  if (repo.contributors > 50) return "The Collective";
  if (repo.stars > 100) return "The Rising";
  if (repo.openIssues > 100) return "The Embattled";
  return "The Newborn";
}

function generateFallbackMoves(repo: RepoStats, type: PokemonType): PokemonMove[] {
  const moves: PokemonMove[] = [];

  // Move 1: Based on language
  moves.push({
    name: `${repo.language} Blast`,
    damage: Math.min(Math.floor(repo.stars / 20) + 20, 150),
    energyCost: 2,
    type,
  });

  // Move 2: Based on community
  const communityPower = repo.watchers + repo.contributors * 2;
  moves.push({
    name: "Commitsurge",
    damage: Math.min(Math.floor(communityPower / 10) + 10, 90),
    energyCost: 1,
    type: "normal",
  });

  return moves;
}

async function generateAIMoves(repo: RepoStats, type: PokemonType): Promise<PokemonMove[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return generateFallbackMoves(repo, type);
  }

  const prompt = {
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a creative game designer. Return valid JSON only with a field named moves. `moves` must be an array of 2 to 4 move objects, each with name, damage, energyCost, and type.",
      },
      {
        role: "user",
        content:
          `Build Pokemon card attacks for a repository.
Repository: ${repo.name}
Primary type: ${type}
Language: ${repo.language}
Stars: ${repo.stars}
Watchers: ${repo.watchers}
Contributors: ${repo.contributors}
AgeDays: ${Math.floor((Date.now() - new Date(repo.createdAt).getTime()) / (1000 * 60 * 60 * 24))}

Return JSON shape exactly like: {"moves":[{"name":"...","damage":80,"energyCost":2,"type":"fire"}]}. `,
      },
    ],
    temperature: 0.85,
    max_tokens: 500,
    response_format: { type: "json_object" },
  } as const;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(prompt),
    });

    if (!response.ok) {
      return generateFallbackMoves(repo, type);
    }

    const payload = (await response.json()) as {
      choices?: {
        message?: {
          content?: string;
        };
      }[];
    };

    const rawContent = payload.choices?.[0]?.message?.content;
    if (!rawContent) {
      return generateFallbackMoves(repo, type);
    }

    const parsed = JSON.parse(rawContent) as {
      moves?: {
        name?: unknown;
        damage?: unknown;
        energyCost?: unknown;
        type?: unknown;
      }[];
    };

    const parsedMoves = (Array.isArray(parsed.moves) ? parsed.moves : []).slice(0, 4);
    const validMoves = parsedMoves
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const name = typeof item.name === "string" ? item.name.trim() : "";
        const damage = clampToInt(Number(item.damage), 20, 220);
        const energyCost = clampToInt(Number(item.energyCost), 1, 4);
        const moveType = normalizeMoveType(typeof item.type === "string" ? item.type : "normal");

        if (!name || damage <= 0 || energyCost <= 0) return null;

        return {
          name: name.slice(0, 32),
          damage,
          energyCost,
          type: moveType,
        } as PokemonMove;
      })
      .filter((move): move is PokemonMove => move !== null);

    if (validMoves.length >= 2) {
      return validMoves.slice(0, 2);
    }

    return generateFallbackMoves(repo, type);
  } catch {
    return generateFallbackMoves(repo, type);
  }
}

function calculateRarity(repo: RepoStats): PokemonCard["rarity"] {
  const score = repo.stars * 2 + repo.watchers + repo.contributors * 10;

  if (score > 100000) return "legendary";
  if (score > 20000) return "holo";
  if (score > 3000) return "rare";
  if (score > 500) return "uncommon";
  return "common";
}

function generateFlavorText(repo: RepoStats): string {
  const ageYears = Math.floor(
    (Date.now() - new Date(repo.createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );

  if (repo.stars > 10000)
    return `A legendary ${repo.language} repository that has gathered ${repo.stars.toLocaleString()} stars from developers worldwide.`;
  if (repo.watchers > 5000)
    return `Its reputation is huge, with watchers amplifying every move and feature.`;
  if (ageYears > 8)
    return `An ancient repository, maintained for ${ageYears} years. Its ${repo.language} code has withstood the test of time.`;
  if (repo.contributors > 20)
    return `A collaborative force with ${repo.contributors}+ contributors pushing its power ever higher.`;
  return `A ${repo.language} repository with ${repo.stars} stars, steadily growing in strength.`;
}

// Calculate "freshness" - how recently the repo was updated
function calculateFreshness(repo: RepoStats): number {
  const daysSinceUpdate =
    (Date.now() - new Date(repo.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 7) return 180;
  if (daysSinceUpdate < 30) return 140;
  if (daysSinceUpdate < 90) return 100;
  if (daysSinceUpdate < 365) return 60;
  return 30;
}

export async function generatePokemonCard(repo: RepoStats): Promise<PokemonCard> {
  const type: PokemonType = LANGUAGE_TYPE_MAP[repo.language] || "normal";

  // Repo age in years for level
  const ageYears = Math.floor(
    (Date.now() - new Date(repo.createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );

  const hp = scaleStat(repo.stars, 50000, 40, 250);
  const attack = scaleStat(repo.watchers, 50000, 20, 200);
  const defense = scaleStat(repo.watchers, 50000, 20, 180);
  const spAttack = scaleStat(repo.totalCommits, 5000, 15, 170);
  const spDefense = scaleStat(repo.contributors, 100, 15, 160);
  const speed = calculateFreshness(repo);

  const totalPower = hp + attack + defense + spAttack + spDefense + speed;

  const moves = await generateAIMoves(repo, type);

  return {
    repoName: repo.name,
    repoFullName: repo.fullName,
    ownerAvatar: repo.ownerAvatar,
    ownerName: repo.ownerName,
    description: repo.description,
    title: generateTitle(repo),
    type,
    hp,
    attack,
    defense,
    spAttack,
    spDefense,
    speed,
    level: Math.min(ageYears * 8 + Math.floor(repo.stars / 100), 100),
    rarity: calculateRarity(repo),
    moves,
    weakness: TYPE_WEAKNESSES[type],
    resistance: TYPE_RESISTANCES[type],
    flavorText: generateFlavorText(repo),
    totalPower,
    language: repo.language,
    topics: repo.topics,
  };
}
