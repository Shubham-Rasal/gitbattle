import { RepoStats } from "@/types/card";

const GITHUB_API = "https://api.github.com";

async function githubFetch(url: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchRepoDetails(repo: Record<string, unknown>): Promise<RepoStats> {
  const fullName = repo.full_name as string;

  // Fetch contributors count and commit activity in parallel
  const [contributorsData, commitsData, prsData] = await Promise.allSettled([
    githubFetch(`${GITHUB_API}/repos/${fullName}/contributors?per_page=1&anon=true`),
    githubFetch(`${GITHUB_API}/repos/${fullName}/commits?per_page=1`),
    githubFetch(`${GITHUB_API}/repos/${fullName}/pulls?state=all&per_page=1`),
  ]);

  // Contributors: use the Link header trick - for now estimate from array
  let contributors = 1;
  if (contributorsData.status === "fulfilled") {
    contributors = Array.isArray(contributorsData.value)
      ? Math.max(contributorsData.value.length, 1)
      : 1;
  }

  // Rough commit count estimate from repo size + age
  const ageMs = Date.now() - new Date(repo.created_at as string).getTime();
  const ageDays = Math.max(ageMs / (1000 * 60 * 60 * 24), 1);
  const totalCommits =
    commitsData.status === "fulfilled"
      ? Math.max(Math.floor(ageDays * 0.5), 10) // rough estimate
      : 10;

  const totalPRs =
    prsData.status === "fulfilled" && Array.isArray(prsData.value)
      ? Math.max(prsData.value.length, 0)
      : 0;

  const owner = repo.owner as Record<string, string>;

  return {
    name: repo.name as string,
    fullName: fullName,
    description: (repo.description as string) || "A mysterious repository...",
    ownerAvatar: owner.avatar_url,
    ownerName: owner.login,
    language: (repo.language as string) || "Unknown",
    stars: (repo.stargazers_count as number) || 0,
    forks: (repo.forks_count as number) || 0,
    openIssues: (repo.open_issues_count as number) || 0,
    watchers: (repo.watchers_count as number) || 0,
    size: (repo.size as number) || 0,
    createdAt: repo.created_at as string,
    updatedAt: repo.updated_at as string,
    topics: (repo.topics as string[]) || [],
    license: (repo.license as Record<string, string> | null)?.spdx_id || null,
    defaultBranch: (repo.default_branch as string) || "main",
    totalCommits,
    totalPRs,
    contributors,
  };
}

/**
 * Top public repos by star count (forks skipped when enough alternatives exist).
 * Used for guest “any two GitHub users” matchups.
 */
export async function fetchTopStarredRepos(username: string, limit = 3): Promise<RepoStats[]> {
  const repos = await githubFetch(
    `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&direction=desc`,
  );

  if (!Array.isArray(repos) || repos.length === 0) {
    throw new Error(`No public repos found for user "${username}"`);
  }

  const nonForks = [...repos].filter((r) => !(r as { fork?: boolean }).fork);
  const pool = nonForks.length >= limit ? nonForks : [...repos];

  const sorted = pool.sort(
    (a, b) => (b.stargazers_count as number) - (a.stargazers_count as number),
  );

  const selected = sorted.slice(0, limit);
  if (selected.length === 0) {
    throw new Error(`No eligible repos for user "${username}"`);
  }

  return Promise.all(selected.map((r) => fetchRepoDetails(r as Record<string, unknown>)));
}

export async function fetchTopRepos(username: string, limit = 3): Promise<RepoStats[]> {
  // Fetch repos sorted by recency (most recently pushed first)
  const repos = await githubFetch(
    `${GITHUB_API}/users/${username}/repos?per_page=${Math.min(limit * 4, 100)}&sort=pushed&direction=desc`,
  );

  if (!Array.isArray(repos) || repos.length === 0) {
    throw new Error(`No public repos found for user "${username}"`);
  }

  // Sort by recency first, then stars as a tiebreaker.
  // Recency score: repos updated within a week score highest, decaying over time.
  const now = Date.now();
  const sorted = [...repos].sort((a, b) => {
    const msA = now - new Date(a.pushed_at as string).getTime();
    const msB = now - new Date(b.pushed_at as string).getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    // Bucket into recency tiers (0 = within a week, 1 = within a month, 2 = older)
    const tierA = msA < weekMs ? 0 : msA < 4 * weekMs ? 1 : 2;
    const tierB = msB < weekMs ? 0 : msB < 4 * weekMs ? 1 : 2;
    if (tierA !== tierB) return tierA - tierB;
    // Within the same tier, sort by stars descending
    return (b.stargazers_count as number) - (a.stargazers_count as number);
  });

  const selected = sorted.slice(0, limit);

  // Fetch details for each in parallel
  const detailed = await Promise.all(selected.map(fetchRepoDetails));

  return detailed;
}

export async function fetchRepoByFullName(fullName: string): Promise<RepoStats> {
  const sanitized = fullName.trim();
  if (!sanitized) {
    throw new Error("Repository name is required");
  }

  const repo = await githubFetch(`${GITHUB_API}/repos/${sanitized}`);

  if (!repo || typeof repo !== "object") {
    throw new Error(`Unable to load repository "${sanitized}"`);
  }

  return fetchRepoDetails(repo as Record<string, unknown>);
}
