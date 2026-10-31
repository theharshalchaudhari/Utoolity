"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Users } from "lucide-react";
import AllWindows from "./SystemTray/AllWindows";
import type { WindowSummary } from "./SystemTray/AllWindows";
import Search, { type SearchItem } from "./SystemTray/Search";
import Notifications from "./SystemTray/Notifications";
import DateTime from "./SystemTray/DateTime";

type Panel = "search" | "notifications" | "datetime" | null;

type SystemTrayProps = {
  searchItems?: SearchItem[];
  windows?: WindowSummary[];
  onFocusWindow?: (key: string) => void;
  onCloseWindow?: (key: string) => void;
  onSleep?: () => void;
  onLock?: () => void;
};

export default function SystemTray({
  searchItems = [],
  windows = [],
  onFocusWindow = () => undefined,
  onCloseWindow = () => undefined,
  onSleep,
  onLock,
}: SystemTrayProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const closePanel = useCallback(() => setPanel(null), []);

  const togglePanel = useCallback((next: Exclude<Panel, null>) => {
    setPanel((current) => (current === next ? null : next));
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-auto fixed right-4 top-4 z-40 flex items-center gap-2">
      <AllWindows
        windows={windows}
        onFocus={onFocusWindow}
        onClose={onCloseWindow}
      />

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("utoolity:open-collaboration"))}
        aria-label="Join collaboration session"
        title="Join collaboration session"
        className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/75 text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
      >
        <Users size={18} strokeWidth={1.9} />
      </button>

      <Search
        items={searchItems}
        open={panel === "search"}
        onToggle={() => togglePanel("search")}
        onClose={closePanel}
      />

      <Notifications
        open={panel === "notifications"}
        onToggle={() => togglePanel("notifications")}
        onClose={closePanel}
      />

      <DateTime
        open={panel === "datetime"}
        onToggle={() => togglePanel("datetime")}
        onClose={closePanel}
        onSleep={onSleep}
        onLock={onLock}
      />
    </div>,
    document.body,
  );
}