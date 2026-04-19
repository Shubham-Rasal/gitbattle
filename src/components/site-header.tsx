"use client";

import type { User } from "@supabase/supabase-js";

export type AppTab = "create" | "decks" | "battle" | "leaderboard";

const NAV: { id: AppTab; label: string; authRequired: boolean }[] = [
  { id: "create", label: "Create Deck", authRequired: true },
  { id: "decks", label: "My Decks", authRequired: true },
  { id: "battle", label: "Battle", authRequired: true },
  { id: "leaderboard", label: "Leaderboard", authRequired: false },
];

type SiteHeaderProps = {
  tab: AppTab;
  onTabChange: (t: AppTab) => void;
  user: User | null;
  onSignIn: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onBrandClick?: () => void;
};

export default function SiteHeader({
  tab,
  onTabChange,
  user,
  onSignIn,
  onSignOut,
  onBrandClick,
}: SiteHeaderProps) {
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
    <header className="relative z-10 mb-5 w-full max-w-5xl sm:mb-6">
      <div className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 shadow-lg shadow-black/30 backdrop-blur-md sm:px-4 sm:py-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 sm:justify-start">
            <button
              type="button"
              onClick={() => {
                onBrandClick?.();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg text-left transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50"
              aria-label="GitDex — scroll to top"
            >
              <span className="rounded-full border border-yellow-300/35 bg-yellow-200/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-yellow-200/90 sm:text-[9px] sm:tracking-[0.22em]">
                Arena
              </span>
              <span className="bg-gradient-to-r from-yellow-200 via-rose-300 to-amber-400 bg-clip-text text-lg font-black tracking-tight text-transparent sm:text-xl">
                GitDex
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 sm:justify-end">
            {user ? (
              <>
                {ghLogin ? (
                  <a
                    href={`https://github.com/${ghLogin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-[14rem] truncate text-center text-[11px] text-slate-400 underline decoration-white/15 underline-offset-2 transition-colors hover:text-amber-200 hover:decoration-amber-200/40 sm:max-w-[16rem] sm:text-left sm:text-xs"
                  >
                    @{ghLogin}
                  </a>
                ) : (
                  <span className="max-w-[14rem] truncate text-center text-[11px] text-slate-400 sm:text-left sm:text-xs">
                    {user.email}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 transition-colors hover:border-white/30 hover:text-white cursor-pointer sm:text-[11px] sm:normal-case sm:tracking-normal"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="min-h-9 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/15 cursor-pointer sm:w-auto sm:min-h-0 sm:text-sm"
              >
                Sign in with GitHub
              </button>
            )}
          </div>
        </div>

        <nav className="mt-2.5 border-t border-white/10 pt-2.5" aria-label="Main navigation">
          <div className="overflow-x-auto overscroll-x-contain rounded-lg bg-black/35 p-0.5 backdrop-blur-sm [-webkit-overflow-scrolling:touch]">
            <div className="flex w-max min-w-full justify-start gap-0.5 sm:gap-1 md:justify-center">
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
                    className={`shrink-0 rounded-md px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.1em] transition-all sm:min-h-0 sm:px-3 sm:text-[10px] sm:tracking-[0.12em] ${
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
          </div>
        </nav>

        <p className="mt-2.5 border-t border-white/5 pt-2.5 text-center text-[11px] leading-snug text-slate-500 sm:text-left">
          Turn your top GitHub repos into battle cards — pick repos, duel on the leaderboard.
        </p>
      </div>
    </header>
  );
}
