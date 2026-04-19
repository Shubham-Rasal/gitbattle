import { runGuestGithubBattle } from "@/lib/battle-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      attackerUsername?: string;
      defenderUsername?: string;
    };

    const attacker = body.attackerUsername?.trim() ?? "";
    const defender = body.defenderUsername?.trim() ?? "";

    if (!attacker || !defender) {
      return Response.json({ error: "Both GitHub usernames are required" }, { status: 400 });
    }

    const { outcome, persisted } = await runGuestGithubBattle(attacker, defender);
    return Response.json({ ...outcome, persisted }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Battle failed";
    return Response.json({ error: msg }, { status: 400 });
  }
}
