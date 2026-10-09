
"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@repo/ui/shadcn/card";
import { useUserPreference } from "../../../../lib/user-preference";

type GrainLevel = "Off" | "Soft" | "Strong";

export default function Grain() {
  const [level, setLevel] = useUserPreference<GrainLevel>("utoolity.grain", "Off");

  useEffect(() => {
    document.documentElement.dataset.grain = level.toLowerCase();
  }, [level]);

  return (
    <Card>
      <CardContent className="space-y-2 p-3.5">
        <h3 className="text-sm font-semibold">Grain</h3>

        <div className="inline-flex rounded-full border border-border p-0.5">
          {(["Off", "Soft", "Strong"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLevel(value)}
              aria-pressed={level === value}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                level === value
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
