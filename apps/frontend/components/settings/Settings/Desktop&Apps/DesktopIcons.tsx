
"use client";

import { useState } from "react";
import { Card, CardContent } from "@repo/ui/shadcn/card";

const modes = ["Auto", "Snap to grid", "Free"] as const;

export default function DesktopIcons() {
  const [mode, setMode] = useState<(typeof modes)[number]>("Auto");
  const [tidied, setTidied] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3 p-3.5">
        <h3 className="text-sm font-semibold">Desktop icons</h3>

        <p className="max-w-lg rounded-2xl bg-muted px-3.5 py-3 text-xs leading-5 text-muted-foreground">
          Drag icons to move them. Auto keeps a tidy grid, Snap to grid
          lets an icon sit in any cell, and Free lets it sit anywhere.
        </p>

        <div className="inline-flex flex-wrap rounded-full border border-border p-0.5">
          {modes.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                mode === value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setTidied(true)}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/80"
          >
            Tidy up icons
          </button>

          {tidied && (
            <p className="mt-2 text-xs text-muted-foreground">
              Tidy request selected. Connect this action to the desktop
              icon layout manager to rearrange icons.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
