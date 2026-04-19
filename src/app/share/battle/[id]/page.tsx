import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BattleSharePanel } from "@/components/battle-share-panel";
import { getBattleOutcomeForShare } from "@/lib/battle-service";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const outcome = await getBattleOutcomeForShare(id);
  if (!outcome) {
    return { title: "Battle · GitBattle" };
  }
  const { battle, attackerDeck, defenderDeck } = outcome;
  const a = battle.attackerUsername ?? attackerDeck.githubUsername;
  const d = battle.defenderUsername ?? defenderDeck.githubUsername;
  const title = `${a} vs ${d} · GitBattle`;
  const description = `${battle.result.toUpperCase()} after ${battle.roundCount} rounds — ${attackerDeck.name} vs ${defenderDeck.name}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ShareBattlePage({ params }: Props) {
  const { id } = await params;
  const outcome = await getBattleOutcomeForShare(id);
  if (!outcome) notFound();

  return (
    <main className="text-white">
      <BattleSharePanel outcome={outcome} variant="page" />
    </main>
  );
}
