/** Canonical repo URL for source links. Set NEXT_PUBLIC_REPO_URL to override (e.g. a fork). */
export const SOURCE_REPO_URL =
  (typeof process.env.NEXT_PUBLIC_REPO_URL === "string" && process.env.NEXT_PUBLIC_REPO_URL.trim()) ||
  "https://github.com/Shubham-Rasal/gitbattle";
