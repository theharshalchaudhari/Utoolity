"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "./api";

export function useToolProgress<T extends Record<string, unknown>>(tool: string, initial: T) {
  const [progress, setProgress] = useState<T>(initial);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    void api<{ progress: T }>(`/api/storage/progress/${encodeURIComponent(tool)}`)
      .then(({ progress: saved }) => setProgress(saved))
      .catch(() => undefined);
  }, [tool]);

  useEffect(() => {
    const saveBeforeClose = (event: Event) => {
      const key = (event as CustomEvent<{ key?: string }>).detail?.key;
      if (!key?.startsWith(`${tool}:`)) return;
      void api(`/api/storage/progress/${encodeURIComponent(tool)}`, {
        method: "PUT",
        body: JSON.stringify({ progress: progressRef.current }),
      }).catch(() => undefined);
    };
    window.addEventListener("utoolity:tool-closing", saveBeforeClose);
    return () => window.removeEventListener("utoolity:tool-closing", saveBeforeClose);
  }, [tool]);

  const updateProgress = (next: T) => {
    setProgress(next);
    void api(`/api/storage/progress/${encodeURIComponent(tool)}`, {
      method: "PUT",
      body: JSON.stringify({ progress: next }),
    }).catch(() => undefined);
  };

  return [progress, updateProgress] as const;
}
