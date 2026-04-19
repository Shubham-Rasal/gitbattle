"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";

export type AppTab = "create" | "decks" | "leaderboard";

const NAV: { id: AppTab; label: string; shortLabel: string; authRequired: boolean; href: string }[] = [
  { id: "create", label: "Create Deck", shortLabel: "Create", authRequired: true, href: "/create" },
  { id: "decks", label: "My Decks", shortLabel: "Decks", authRequired: true, href: "/decks" },
  { id: "leaderboard", label: "Leaderboard", shortLabel: "Ranks", authRequired: false, href: "/leaderboard" },
];

export function tabFromPathname(pathname: string | null): AppTab {
  if (!pathname) return "leaderboard";
  if (pathname.startsWith("/decks")) return "decks";
  if (pathname.startsWith("/create")) return "create";
  return "leaderboard";
}

type SiteHeaderProps = {
  user: User | null;
  onSignIn: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onBrandClick?: () => void;
  variant?: "default" | "integrated";
  suppressAuth?: boolean;
};

export default function SiteHeader({
  user,
  onSignIn,
  onSignOut,
  onBrandClick,
  variant = "default",
  suppressAuth = false,
}: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tab = tabFromPathname(pathname);
  const integrated = variant === "integrated";
  const showAuth = !suppressAuth || !!user;
  const ghLogin = user?.user_metadata?.user_name as string | undefined;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function handleTabNavigate(id: AppTab, authRequired: boolean, href: string) {
    const needsAuth = authRequired && !user;
    if (needsAuth) {
      void onSignIn();
      return;
    }
    setMenuOpen(false);
    router.push(href);
  }

  const authControls: ReactNode = !showAuth ? null : user ? (
    <>
      {ghLogin ? (
        <a
          href={`https://github.com/${ghLogin}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden max-w-[10rem] truncate text-[10px] text-slate-400 underline decoration-white/15 underline-offset-2 transition-colors hover:text-amber-200 hover:decoration-amber-200/40 md:inline md:max-w-[12rem] md:text-xs lg:max-w-[16rem]"
        >
          @{ghLogin}
        </a>
      ) : (
        <span className="hidden max-w-[10rem] truncate text-[10px] text-slate-400 md:inline md:max-w-[12rem] md:text-xs">
          {user.email}
        </span>
      )}
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-300 transition-colors hover:border-white/30 hover:text-white cursor-pointer min-[480px]:py-1.5 min-[480px]:text-[10px] sm:normal-case sm:tracking-normal md:text-[11px]"
      >
        Sign out
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={() => void onSignIn()}
      className="whitespace-nowrap rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-white/15 cursor-pointer sm:py-1.5 sm:text-xs md:text-sm"
    >
      <span className="hidden sm:inline">Sign in with GitHub</span>
      <span className="sm:hidden">GitHub</span>
    </button>
  );

  const navPillClass = (active: boolean, needsAuth: boolean) =>
    `rounded-lg px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.06em] transition-all sm:rounded-md sm:px-2.5 sm:py-2 sm:text-[9px] sm:tracking-[0.1em] md:text-[10px] md:tracking-[0.12em] ${
      active
        ? "border border-amber-200/40 bg-amber-200/20 text-amber-200"
        : needsAuth
          ? "cursor-pointer border border-dashed border-white/10 text-white/50 hover:border-white/20 hover:bg-white/5 hover:text-white/75"
          : "cursor-pointer border border-transparent text-white/60 hover:bg-white/5 hover:text-white/85"
    }`;

  return (
    <header className={`relative z-10 w-full ${integrated ? "" : "mb-4 sm:mb-5"}`}>
      <div
        className={
          integrated
            ? "px-2 py-2 sm:px-4 sm:py-2.5"
            : "border-b border-white/10 bg-black/40 px-2 py-2 backdrop-blur-md sm:px-4 sm:py-2.5 supports-[backdrop-filter]:bg-black/30"
        }
      >
        {/* Desktop / tablet: single row */}
        <div className="hidden min-[480px]:flex min-[480px]:items-center min-[480px]:gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              onBrandClick?.();
              const dest = user ? "/create" : "/leaderboard";
              if (pathname === dest) {
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                router.push(dest);
              }
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-lg text-left transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 sm:gap-2"
            aria-label="GitDex — home"
          >
            <span className="rounded-full border border-yellow-300/35 bg-yellow-200/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-yellow-200/90 sm:px-2 sm:text-[8px] sm:tracking-[0.2em]">
              Arena
            </span>
            <span className="bg-gradient-to-r from-yellow-200 via-rose-300 to-amber-400 bg-clip-text text-base font-black tracking-tight text-transparent sm:text-lg">
              GitDex
            </span>
          </button>

          <nav
            className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Main navigation"
          >
            <div className="mx-auto flex w-max max-w-full justify-center gap-1 px-0.5">
              {NAV.map((item) => {
                const active = tab === item.id;
                const needsAuth = item.authRequired && !user;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabNavigate(item.id, item.authRequired, item.href)}
                    title={needsAuth ? "Sign in with GitHub to open this tab" : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`shrink-0 ${navPillClass(active, needsAuth)}`}
                  >
                    <span className="max-[639px]:hidden">{item.label}</span>
                    <span className="min-[640px]:hidden">{item.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {showAuth ? (
            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">{authControls}</div>
          ) : null}
        </div>

        {/* Mobile (&lt; 480px): brand + menu + auth, then slide-down nav */}
        <div className="flex min-[480px]:hidden flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onBrandClick?.();
                const dest = user ? "/create" : "/leaderboard";
                if (pathname === dest) {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  router.push(dest);
                }
              }}
              className="flex min-w-0 shrink-0 items-center gap-1.5 rounded-lg text-left transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
              aria-label="GitDex — home"
            >
              <span className="shrink-0 rounded-full border border-yellow-300/35 bg-yellow-200/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] text-yellow-200/90">
                Arena
              </span>
              <span className="min-w-0 truncate bg-gradient-to-r from-yellow-200 via-rose-300 to-amber-400 bg-clip-text text-base font-black tracking-tight text-transparent">
                GitDex
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-[10px] font-black uppercase tracking-wide text-slate-200 transition-colors hover:bg-white/10 cursor-pointer"
                aria-expanded={menuOpen}
                aria-controls="mobile-main-nav"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                {menuOpen ? "Close" : "Menu"}
              </button>
              {showAuth ? <div className="flex items-center">{authControls}</div> : null}
            </div>
          </div>

          <nav
            id="mobile-main-nav"
            aria-hidden={!menuOpen}
            className={`flex flex-col gap-1.5 overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${
              menuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            }`}
            aria-label="Main navigation"
          >
            {NAV.map((item) => {
              const active = tab === item.id;
              const needsAuth = item.authRequired && !user;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabNavigate(item.id, item.authRequired, item.href)}
                  title={needsAuth ? "Sign in with GitHub to open this tab" : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`w-full text-left ${navPillClass(active, needsAuth)}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
