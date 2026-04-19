import type { PokemonCard } from "@/types/card";

/** Sample card for marketing / landing preview (not from live API). */
export const DEMO_PREVIEW_CARD: PokemonCard = {
  repoName: "linux",
  repoFullName: "torvalds/linux",
  ownerAvatar: "https://avatars.githubusercontent.com/u/1024025?v=4",
  ownerName: "torvalds",
  description: "The kernel that runs the world. Your repos become cards the same way.",
  title: "Kernel Commander",
  type: "fire",
  hp: 120,
  attack: 99,
  defense: 88,
  spAttack: 95,
  spDefense: 90,
  speed: 72,
  level: 34,
  rarity: "legendary",
  moves: [
    { name: "Merge Strike", damage: 80, energyCost: 2, type: "fire" },
    { name: "Kernel Shock", damage: 120, energyCost: 3, type: "electric" },
  ],
  weakness: "water",
  resistance: "grass",
  flavorText: "Stars → HP. Commits → chaos. Ship it.",
  totalPower: 564,
  language: "C",
  topics: ["kernel", "opensource"],
};
