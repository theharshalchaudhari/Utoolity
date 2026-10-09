
"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@repo/ui/shadcn/card";
import { useUserPreference } from "../../../../lib/user-preference";

const sizes = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
] as const;

export default function IconSize() {
  const [size, setSize] = useUserPreference<(typeof sizes)[number]["value"]>("utoolity.icon-size", "medium");

  useEffect(() => {
    document.documentElement.dataset.desktopIconSize = size;
  }, [size]);

  return (
    <Card>
      <CardContent className="space-y-3 p-3.5">
        <h3 className="text-sm font-semibold">Icon size</h3>

        <div className="inline-flex rounded-full border border-border p-0.5">
          {sizes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSize(item.value)}
              aria-pressed={size === item.value}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                size === item.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
