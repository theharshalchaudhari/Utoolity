
"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@repo/ui/shadcn/card";
import { useUserPreference } from "../../../../lib/user-preference";

type ThemeMode = "auto" | "light" | "dark";

export default function Theme() {
  const [theme, setTheme] = useUserPreference<ThemeMode>("utoolity.theme", "auto");

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (mode: ThemeMode) => {
      const dark =
        mode === "dark" ||
        (mode === "auto" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);

      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };

    applyTheme(theme);

    if (theme !== "auto") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme("auto");

    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, [theme]);

  return (
    <Card>
      <CardContent className="space-y-2 p-3.5">
        <h3 className="text-sm font-semibold">Theme</h3>

        <div className="inline-flex rounded-full border border-border p-0.5">
          {(["auto", "light", "dark"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                theme === value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
