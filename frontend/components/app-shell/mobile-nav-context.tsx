"use client";

import { createContext, use } from "react";

/** Permite que os links dentro do drawer o fechem ao navegar. */
export const MobileNavContext = createContext<{ close: () => void } | null>(null);

export function useCloseMobileNav() {
  return use(MobileNavContext)?.close;
}
