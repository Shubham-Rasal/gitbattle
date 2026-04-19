/** Same-origin avatar URL (see /api/github/avatar). */
export function githubAvatarProxyUrl(githubUsername: string, size = 128): string {
  const u = encodeURIComponent(githubUsername.trim());
  return `/api/github/avatar?u=${u}&s=${size}`;
}
