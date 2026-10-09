"use client";

import { useEffect } from "react";

export default function BrowserGuards() {
  useEffect(() => {
    const preventBrowserZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };
    const preventKeyboardZoom = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        ["+", "-", "=", "0"].includes(event.key)
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", preventBrowserZoom, { passive: false });
    window.addEventListener("keydown", preventKeyboardZoom);
    return () => {
      window.removeEventListener("wheel", preventBrowserZoom);
      window.removeEventListener("keydown", preventKeyboardZoom);
    };
  }, []);

  return null;
}
