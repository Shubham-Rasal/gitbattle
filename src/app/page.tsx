"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import Spinner from "@/components/spinner";

export default function HomePage() {
  const router = useRouter();
  const { user, authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    router.replace(user ? "/decks" : "/leaderboard");
  }, [authLoading, user, router]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black px-4 text-white">
      <Spinner text="Loading..." />
    </main>
  );
}
