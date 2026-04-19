import { NextResponse } from "next/server";

const HANDLE_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/**
 * Proxies GitHub profile avatars so the app can load them same-origin (reliable
 * <img> + html-to-image) without CORS/redirect issues from github.com/…png.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("u")?.trim() ?? "";
  if (!HANDLE_RE.test(raw)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const size = Math.min(512, Math.max(16, Number(searchParams.get("s")) || 128));

  const headers: Record<string, string> = { Accept: "image/*" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const upstream = await fetch(
    `https://github.com/${encodeURIComponent(raw)}.png?size=${size}`,
    { headers, redirect: "follow", next: { revalidate: 3600 } },
  );

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
  }

  const body = await upstream.arrayBuffer();
  const ct = upstream.headers.get("content-type") || "image/png";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
