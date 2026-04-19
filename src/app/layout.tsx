import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SOURCE_REPO_ISSUES_URL, SOURCE_REPO_URL } from "@/lib/site";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitBattle — GitHub battle cards",
  description: "Turn any GitHub profile into a Pokemon trading card and battle other developers",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030712",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full min-h-[100dvh] flex-col pb-[env(safe-area-inset-bottom,0px)]">
        <Providers>{children}</Providers>
        <Analytics />
        <footer className="mt-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/10 bg-black/20 px-4 py-4 text-[11px] text-slate-500 backdrop-blur-sm">
          <a
            href={SOURCE_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-400 underline decoration-white/20 underline-offset-2 transition-colors hover:text-amber-200 hover:decoration-amber-200/50"
          >
            Source
          </a>
          <a
            href={SOURCE_REPO_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-400 underline decoration-white/20 underline-offset-2 transition-colors hover:text-amber-200 hover:decoration-amber-200/50"
          >
            Issues
          </a>
        </footer>
      </body>
    </html>
  );
}
