"use client";

import ArenaApp from "@/components/arena-app";
import type { ReactNode } from "react";

export default function ArenaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ArenaApp />
      {children}
    </>
  );
}
