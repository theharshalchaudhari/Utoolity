"use client";

import { Card, CardContent } from "@repo/ui/shadcn/card";
import { useUserPreference } from "../../../../lib/user-preference";

const MIN_SIZE = 16;
const MAX_SIZE = 64;

export default function CursorSize() {
  const [sizeValue, setSize] = useUserPreference<string>(
    "utoolity.cursor-size",
    "32",
  );
  const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Number(sizeValue) || 32));

  return (
    <Card>
      <CardContent className="space-y-3 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Custom cursor size</h3>
            <p className="text-xs text-muted-foreground">
              Adjust the on-screen pointer size.
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">
            {size}px
          </span>
        </div>

        <input
          aria-label="Custom cursor size"
          type="range"
          min={MIN_SIZE}
          max={MAX_SIZE}
          step={2}
          value={size}
          onChange={(event) => setSize(event.target.value)}
          className="w-full accent-primary"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{MIN_SIZE}px · Small</span>
          <button
            type="button"
            onClick={() => setSize("32")}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Reset
          </button>
          <span>{MAX_SIZE}px · Large</span>
        </div>
      </CardContent>
    </Card>
  );
}
