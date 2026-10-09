
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@repo/ui/shadcn/card";

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border p-0.5">
      {[true, false].map((enabled) => (
        <button
          key={String(enabled)}
          type="button"
          onClick={() => onChange(enabled)}
          aria-pressed={value === enabled}
          className={`min-w-12 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            value === enabled
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {enabled ? "On" : "Off"}
        </button>
      ))}
    </div>
  );
}

export default function StatusWidget() {
  const [statusWidget, setStatusWidget] = useState(true);
  const [musicWidget, setMusicWidget] = useState(true);
  const [minimizeOnEmptyClick, setMinimizeOnEmptyClick] =
    useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.statusWidget = statusWidget ? "on" : "off";
    root.dataset.musicWidget = musicWidget ? "on" : "off";
    root.dataset.minimizeOnEmptyClick = minimizeOnEmptyClick
      ? "on"
      : "off";
  }, [statusWidget, musicWidget, minimizeOnEmptyClick]);

  return (
    <>
      <Card>
        <CardContent className="space-y-2 p-3.5">
          <h3 className="text-sm font-semibold">Status widget</h3>
          <Toggle value={statusWidget} onChange={setStatusWidget} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-3.5">
          <h3 className="text-sm font-semibold">Music widget</h3>

          <div className="flex flex-wrap items-center gap-2">
            <Toggle value={musicWidget} onChange={setMusicWidget} />

            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("desktop:reset-widget-position"),
                )
              }
              className="rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/80"
            >
              Reset position
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-3.5">
          <h3 className="text-sm font-semibold">
            Tap an empty desktop to minimise all windows
          </h3>

          <Toggle
            value={minimizeOnEmptyClick}
            onChange={setMinimizeOnEmptyClick}
          />
        </CardContent>
      </Card>
    </>
  );
}
