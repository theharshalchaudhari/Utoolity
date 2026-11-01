"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  DEFAULT_WALLPAPER_ID,
  getWallpaper,
  getWallpaperUrl,
  preloadWallpaper,
  readWallpaperPreference,
  WALLPAPER_STORAGE_KEY,
  type Wallpaper,
} from "../../lib/wallpapers";

type Layer = { wallpaper: Wallpaper; url: string; key: number };
type Mode = "dark" | "light";

const mode = (): Mode =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

const initialLayer = (): Layer => {
  const wallpaper = getWallpaper(readWallpaperPreference());
  const theme =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

  return {
    wallpaper,
    url: getWallpaperUrl(wallpaper, theme),
    key: 0,
  };
};

export default function DesktopBackground() {
  const [active, setActive] = useState<Layer | null>(initialLayer);
  const [previous, setPrevious] = useState<Layer | null>(null);
  const [visible, setVisible] = useState(true);
  const [theme, setTheme] = useState<Mode>(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );

  useEffect(() => {
    let cancelled = false;
    let key = 0;
    let request = 0;
    let current = active;

    const apply = async (id: string, nextTheme = mode()) => {
      const token = ++request;
      const wallpaper = getWallpaper(id);
      const url = getWallpaperUrl(wallpaper, nextTheme);

      setTheme(nextTheme);
      if (current?.url === url) return;

      const layer = { wallpaper, url, key: ++key };

      // Keep the previous wallpaper visible while its replacement loads.
      // On a cold refresh, the initial persisted wallpaper is rendered before
      // this preload completes, preventing a blank/white desktop flash.
      if (wallpaper.kind === "image") {
        setPrevious(current);
        current = layer;
        setVisible(true);
        setActive(layer);
        try {
          await preloadWallpaper(url);
        } catch {
          if (cancelled || token !== request) return;
          const fallback = getWallpaper(DEFAULT_WALLPAPER_ID);
          const fallbackUrl = getWallpaperUrl(fallback, nextTheme);
          const fallbackLayer = {
            wallpaper: fallback,
            url: fallbackUrl,
            key: ++key,
          };
          current = fallbackLayer;
          setActive(fallbackLayer);
          setPrevious(null);
          return;
        }
      } else {
        // Live wallpapers keep the existing frame until the video has data.
        try {
          await preloadWallpaper(url);
        } catch {
          if (cancelled || token !== request) return;
          return;
        }
        if (cancelled || token !== request) return;
        setPrevious(current);
        current = layer;
        setVisible(true);
        setActive(layer);
      }

      if (
        cancelled ||
        token !== request ||
        getWallpaperUrl(
          getWallpaper(readWallpaperPreference()),
          mode(),
        ) !== url
      ) {
        return;
      }
    };

    const change = (event: Event) =>
      void apply(
        (event as CustomEvent<string>).detail || readWallpaperPreference(),
      );

    const storage = (event: StorageEvent) => {
      if (event.key === WALLPAPER_STORAGE_KEY) {
        void apply(event.newValue || DEFAULT_WALLPAPER_ID);
      }
    };

    const observer = new MutationObserver(() => {
      void apply(readWallpaperPreference(), mode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("utoolity:wallpaper-changed", change);
    window.addEventListener("storage", storage);

    let channel: BroadcastChannel | undefined;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel("utoolity:wallpaper");
      channel.onmessage = (event) => {
        if (event.data?.id) void apply(event.data.id);
      };
    }

    // Revalidate the initial layer against the preferred wallpaper and theme.
    void apply(readWallpaperPreference(), mode());

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("utoolity:wallpaper-changed", change);
      window.removeEventListener("storage", storage);
      channel?.close();
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => setPrevious(null), 900);
    return () => window.clearTimeout(timeout);
  }, [active]);

  const render = (layer: Layer) =>
    layer.wallpaper.kind === "live" ? (
      <video
        key={layer.key}
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        src={layer.url}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
    ) : (
      <div
        key={layer.key}
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${layer.url}")` }}
      />
    );

  return (
    <div
      aria-hidden
      className="desktop-background pointer-events-none fixed inset-0 z-0 overflow-hidden"
      data-wallpaper-theme={theme}
      data-wallpaper-ready={active ? "true" : "false"}
    >
      {previous && render(previous)}
      {active && render(active)}
      <div className="absolute inset-0 top-[75%] left-[85%]">
        <Image
          src="/Logo.svg"
          alt=""
          width={36}
          height={36}
          priority
          className="desktop-logo h-[min(12vw,42vh,360px)] w-[min(10vw,42vh,360px)] object-contain opacity-90"
        />
      </div>
    </div>
  );
}
