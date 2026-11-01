"use client";

import { createContext, useContext, type ReactNode } from "react";

export type InitialDesktopPreferences = {
  wallpaperId: string;
  theme: "dark" | "light";
};

const InitialDesktopPreferencesContext =
  createContext<InitialDesktopPreferences | null>(null);

export function InitialDesktopPreferencesProvider({
  value,
  children,
}: {
  value: InitialDesktopPreferences;
  children: ReactNode;
}) {
  return (
    <InitialDesktopPreferencesContext.Provider value={value}>
      {children}
    </InitialDesktopPreferencesContext.Provider>
  );
}

export function useInitialDesktopPreferences() {
  const value = useContext(InitialDesktopPreferencesContext);
  if (!value) {
    throw new Error(
      "Initial desktop preferences must be provided by RootLayout.",
    );
  }
  return value;
}
