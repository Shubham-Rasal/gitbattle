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

export async function fetchTopRepos(username: string, limit = 3): Promise<RepoStats[]> {
  // Fetch repos sorted by stars, take top 3
  const repos = await githubFetch(
    `${GITHUB_API}/users/${username}/repos?per_page=${Math.min(limit * 4, 100)}&sort=stars&direction=desc`,
  );

  if (!Array.isArray(repos) || repos.length === 0) {
    throw new Error(`No public repos found for user "${username}"`);
  }

  // Take top repos by stars
  const selected = repos.slice(0, limit);

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
