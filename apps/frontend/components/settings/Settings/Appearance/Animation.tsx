
"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@repo/ui/shadcn/card";
import { useUserPreference } from "../../../../lib/user-preference";

export default function Animation() {
  const [animation, setAnimation] = useUserPreference<"on" | "off">("utoolity.animations", "on");
  const enabled = animation === "on";

  useEffect(() => {
    document.documentElement.dataset.animation = enabled ? "on" : "off";
  }, [enabled]);

  return (
    <Card>
      <CardContent className="space-y-2 p-3.5">
        <h3 className="text-sm font-semibold">Animation</h3>

        <div className="inline-flex rounded-full border border-border p-0.5">
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setAnimation(value ? "on" : "off")}
              aria-pressed={enabled === value}
              className={`min-w-12 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                enabled === value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value ? "On" : "Off"}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
