
"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Card, CardContent } from "@repo/ui/shadcn/card";

export default function SoundSettings() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.sound = enabled ? "on" : "off";
  }, [enabled]);

  return (
    <Card>
      <CardContent className="space-y-2 p-3.5">
        <h3 className="text-sm font-semibold">Sounds & haptics</h3>

        <div className="inline-flex rounded-full border border-border p-0.5">
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setEnabled(value)}
              aria-pressed={enabled === value}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                enabled === value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {value ? "On" : "Off"}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
