
"use client";

import { useState } from "react";
import { ExternalLink, Keyboard } from "lucide-react";
import { Card, CardContent } from "@repo/ui/shadcn/card";

export default function ThisSiteAsAnApp() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="space-y-3 p-3.5">
          <h3 className="text-sm font-semibold">This site as an app</h3>

          <p className="max-w-lg rounded-2xl bg-muted px-3.5 py-3 text-xs leading-5 text-muted-foreground">
            Use your browser&apos;s menu and choose &quot;Install
            app&quot; or &quot;Add to Home Screen&quot; to install this
            desktop experience when your browser supports it.
          </p>

          <button
            type="button"
            onClick={() => setShowShortcuts((value) => !value)}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/80"
          >
            <Keyboard size={15} />
            Keyboard shortcuts
          </button>

          {showShortcuts && (
            <div className="max-w-md space-y-3 rounded-2xl border border-border bg-background p-4">
              {[
                ["Ctrl + K", "Open search"],
                ["Alt + A", "All windows"],
                ["Esc", "Close the active overlay"],
              ].map(([shortcut, description]) => (
                <div
                  key={shortcut}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-muted-foreground">
                    {description}
                  </span>
                  <kbd className="shrink-0 rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold">
                    {shortcut}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ExternalLink size={13} />
            Installation availability depends on your browser.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
