"use client";

import type { User } from "@supabase/supabase-js";

export type AppTab = "create" | "decks" | "leaderboard";

const NAV: { id: AppTab; label: string; authRequired: boolean }[] = [
  { id: "create", label: "Create Deck", authRequired: true },
  { id: "decks", label: "My Decks", authRequired: true },
  { id: "leaderboard", label: "Leaderboard", authRequired: false },
];

type SiteHeaderProps = {
  tab: AppTab;
  onTabChange: (t: AppTab) => void;
  user: User | null;
  onSignIn: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onBrandClick?: () => void;
  /** Inside a parent shell (e.g. create landing) — no outer card, no bottom tagline */
  variant?: "default" | "integrated";
  /** Hide sign-in control (e.g. hero has the primary CTA while logged out) */
  suppressAuth?: boolean;
};

export default function SiteHeader({
  tab,
  onTabChange,
  user,
  onSignIn,
  onSignOut,
  onBrandClick,
  variant = "default",
  suppressAuth = false,
}: SiteHeaderProps) {
  const integrated = variant === "integrated";
  const showAuth = !suppressAuth || !!user;
  const ghLogin = user?.user_metadata?.user_name as string | undefined;

  function handleTabClick(id: AppTab, authRequired: boolean) {
    const needsAuth = authRequired && !user;
    if (needsAuth) {
      void onSignIn();
      return;
    }
    onTabChange(id);
  }

  return (
    <header className={`relative z-10 w-full ${integrated ? "" : "mb-4 sm:mb-5"}`}>
      <div
        className={
          integrated
            ? "px-2 py-2 sm:px-4 sm:py-2.5"
            : "border-b border-white/10 bg-black/40 px-2 py-2 backdrop-blur-md sm:px-4 sm:py-2.5 supports-[backdrop-filter]:bg-black/30"
        }
      >
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              onBrandClick?.();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-lg text-left transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 sm:gap-2"
            aria-label="GitDex — scroll to top"
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
            <div className="mx-auto flex w-max max-w-full justify-center gap-0.5 px-0.5 sm:gap-1">
              {NAV.map((item) => {
                const active = tab === item.id;
                const needsAuth = item.authRequired && !user;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id, item.authRequired)}
                    title={needsAuth ? "Sign in with GitHub to open this tab" : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`shrink-0 rounded-md px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] transition-all sm:px-2.5 sm:py-2 sm:text-[9px] sm:tracking-[0.1em] md:text-[10px] md:tracking-[0.12em] ${
                      active
                        ? "border border-amber-200/40 bg-amber-200/20 text-amber-200"
                        : needsAuth
                          ? "cursor-pointer border border-dashed border-white/10 text-white/50 hover:border-white/20 hover:bg-white/5 hover:text-white/75"
                          : "cursor-pointer border border-transparent text-white/60 hover:bg-white/5 hover:text-white/85"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {showAuth ? (
            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              {user ? (
                <>
                  {ghLogin ? (
                    <a
                      href={`https://github.com/${ghLogin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden max-w-[10rem] truncate text-[10px] text-slate-400 underline decoration-white/15 underline-offset-2 transition-colors hover:text-amber-200 hover:decoration-amber-200/40 sm:inline sm:max-w-[12rem] sm:text-xs md:max-w-[16rem]"
                    >
                      @{ghLogin}
                    </a>
                  ) : (
                    <span className="hidden max-w-[10rem] truncate text-[10px] text-slate-400 sm:inline sm:max-w-[12rem] sm:text-xs">
                      {user.email}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-300 transition-colors hover:border-white/30 hover:text-white cursor-pointer sm:px-2.5 sm:text-[10px] sm:normal-case sm:tracking-normal md:text-[11px]"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void onSignIn()}
                  className="whitespace-nowrap rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-white/15 cursor-pointer sm:px-3 sm:text-xs md:text-sm"
                >
                  <span className="hidden sm:inline">Sign in with GitHub</span>
                  <span className="sm:hidden">GitHub</span>
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
