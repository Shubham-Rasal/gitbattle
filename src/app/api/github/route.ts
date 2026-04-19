import { fetchTopRepos, fetchRepoByFullName } from "@/lib/github";
import { generatePokemonCard } from "@/lib/card-generator";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const selectedRepos = searchParams.get("repos");
  const normalizedUser = username?.trim().toLowerCase();

  if (!username) {
    return Response.json(
      { error: "Username is required" },
      { status: 400 },
    );
  }

  try {
    if (selectedRepos) {
      const selected = selectedRepos
        .split(",")
        .map((repo) => repo.trim())
        .filter(Boolean)
        .slice(0, 3);

      if (selected.length === 0) {
        return Response.json({ error: "No repositories selected" }, { status: 400 });
      }

      const repos = await Promise.all(selected.map(fetchRepoByFullName));
      const hasInvalidRepo = repos.some((repo) => repo.ownerName.toLowerCase() !== normalizedUser);
      if (hasInvalidRepo) {
        return Response.json({ error: "Invalid repository selection" }, { status: 400 });
      }
      const cards = await Promise.all(repos.map((repo) => generatePokemonCard(repo)));
      return Response.json({ cards, username });
    }

    const repos = await fetchTopRepos(username, 10);
    return Response.json({ repos, username });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch GitHub data";
    return Response.json({ error: message }, { status: 500 });
  }
}
