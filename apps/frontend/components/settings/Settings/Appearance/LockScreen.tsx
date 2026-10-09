
"use client";

import { useState } from "react";
import { useUserPreference } from "../../../../lib/user-preference";
import { Card, CardContent } from "@repo/ui/shadcn/card";

const styles = [
  { name: "Classic", style: "bg-gradient-to-br from-slate-800 to-rose-950" },
  { name: "Stack", style: "bg-gradient-to-br from-indigo-950 to-rose-950" },
  { name: "Expressive", style: "bg-gradient-to-br from-blue-950 to-rose-950" },
  { name: "Gemini", style: "bg-gradient-to-br from-blue-100 via-violet-200 to-rose-200 text-slate-700" },
  { name: "Glass", style: "bg-gradient-to-br from-slate-700 to-purple-950" },
  { name: "Minimal", style: "bg-muted text-foreground" },
];

export default function LockScreen() {
  const [selected, setSelected] = useUserPreference<string>("utoolity.lockscreen", "Classic");
  const [preview, setPreview] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3 p-3.5">
        <h3 className="text-sm font-semibold">Lock screen</h3>

        <div className="flex flex-wrap gap-2.5">
          {styles.map((item) => {
            const active = selected === item.name;

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  setSelected(item.name);
                  document.documentElement.dataset.lockscreen = item.name.toLowerCase();
                }}
                aria-pressed={active}
                className="w-[96px] text-center"
              >
                <span
                  className={`flex h-[76px] flex-col items-center justify-center rounded-2xl border-2 p-1 ${
                    item.style
                  } ${
                    active ? "border-primary" : "border-transparent"
                  }`}
                >
                  <span className="text-[6px] font-bold tracking-[0.2em] opacity-75">
                    GOOD MORNING
                  </span>
                  <span className="mt-1 text-xl font-bold leading-none tracking-tight">
                    09:41
                  </span>
                  <span className="mt-1 text-[6px] opacity-75">
                    Saturday 3 October
                  </span>
                </span>

                <span className="mt-1.5 block text-xs font-semibold">
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setPreview((value) => !value)}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/80"
        >
          {preview ? "Hide preview" : "Preview the lock screen"}
        </button>

        {preview && (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-background to-accent text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Good morning
            </p>
            <p className="mt-2 text-5xl font-bold tracking-tight">
              09:41
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {selected} lock screen
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
