"use client";

import { useCallback, useState } from "react";
import AllWindows from "./SystemTray/AllWindows";
import Search, { type SearchItem } from "./SystemTray/Search";
import Notifications from "./SystemTray/Notifications";
import DateTime from "./SystemTray/DateTime";

type Panel = "search" | "notifications" | "datetime" | null;

type SystemTrayProps = {
  searchItems?: SearchItem[];
  onAllWindows?: () => void;
  onLock?: () => void;
};

export default function SystemTray({
  searchItems = [],
  onAllWindows,
  onLock,
}: SystemTrayProps) {
  const [panel, setPanel] = useState<Panel>(null);

  const closePanel = useCallback(() => setPanel(null), []);

  const togglePanel = useCallback((next: Exclude<Panel, null>) => {
    setPanel((current) => (current === next ? null : next));
  }, []);

  return (
    <div className="fixed right-4 top-4 z-[80] flex items-center gap-2">
      <AllWindows onClick={onAllWindows} />

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
        onLock={onLock}
      />
    </div>
  );
}