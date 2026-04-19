export interface RepoStats {
  name: string;
  fullName: string;
  description: string;
  ownerAvatar: string;
  ownerName: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  size: number; // KB
  createdAt: string;
  updatedAt: string;
  topics: string[];
  license: string | null;
  defaultBranch: string;
  // Derived from additional API calls
  totalCommits: number;
  totalPRs: number;
  contributors: number;
}

export interface PokemonCard {
  repoName: string;
  repoFullName: string;
  ownerAvatar: string;
  ownerName: string;
  description: string;
  title: string;
  type: PokemonType;
  secondaryType?: PokemonType;
  hp: number; // derived from stars
  attack: number; // derived from forks
  defense: number; // derived from watchers
  spAttack: number; // derived from commits
  spDefense: number; // derived from contributors
  speed: number; // derived from recent activity (freshness)
  level: number; // derived from repo age
  rarity: "common" | "uncommon" | "rare" | "holo" | "legendary";
  moves: PokemonMove[];
  weakness: PokemonType;
  resistance: PokemonType;
  flavorText: string;
  totalPower: number;
  language: string;
  topics: string[];
}

export interface PokemonMove {
  name: string;
  damage: number;
  energyCost: number;
  type: PokemonType;
}

export type PokemonType =
  | "fire"
  | "water"
  | "grass"
  | "electric"
  | "psychic"
  | "fighting"
  | "dark"
  | "steel"
  | "dragon"
  | "fairy"
  | "normal"
  | "ghost"
  | "ice"
  | "poison"
  | "ground"
  | "bug"
  | "rock"
  | "flying";
