"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_WALLPAPER_ID,
  getWallpaper,
  getWallpaperUrl,
  preloadWallpaper,
  readWallpaperPreference,
  WALLPAPER_STORAGE_KEY,
  WALLPAPERS,
  type Wallpaper,
} from "../../lib/wallpapers";

type Layer = { wallpaper: Wallpaper; url: string; key: number };
type Mode = "dark" | "light";

const mode = (): Mode =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

// Decoded assets are retained for the lifetime of this document. The
// selected ID still comes from the authenticated profile; this cache only
// supplies the bytes needed to render it.
const imageLoads = new Map<string, Promise<void>>();
const videoLoads = new Map<string, Promise<void>>();

function loadImage(url: string): Promise<void> {
  const existing = imageLoads.get(url);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // Some browsers reject decode after onload; the image is still usable.
      }
      resolve();
    };
    image.onerror = () => reject(new Error(`Unable to load wallpaper: ${url}`));
    image.src = url;
  });
  imageLoads.set(url, promise);
  void promise.catch(() => imageLoads.delete(url));
  return promise;
}

function loadVideo(url: string): Promise<void> {
  const existing = videoLoads.get(url);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error(`Unable to load wallpaper: ${url}`));
    video.src = url;
    video.load();
  });
  videoLoads.set(url, promise);
  void promise.catch(() => videoLoads.delete(url));
  return promise;
}

function preloadAllWallpapers(theme: Mode, selectedId: string) {
  // Selected first, then remaining assets at browser-default priority.
  const selected = getWallpaper(selectedId);
  const others = WALLPAPERS.filter((wallpaper) => wallpaper.id !== selected.id);
  for (const wallpaper of [selected, ...others]) {
    const url = getWallpaperUrl(wallpaper, theme);
    if (wallpaper.kind === "image") {
      void loadImage(url).catch(() => undefined);
    } else {
      // Do not eagerly decode every video; metadata/data is fetched in the
      // background without competing aggressively with the active wallpaper.
      void loadVideoMetadata(url);
    }
  }
}

function loadVideoMetadata(url: string) {
  if (videoLoads.has(url)) return;
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.src = url;
  video.load();
}

const serverInitialLayer = (id: string, theme: Mode): Layer => {
  const wallpaper = getWallpaper(id);
  return { wallpaper, url: getWallpaperUrl(wallpaper, theme), key: 0 };
};

export default function DesktopBackground({
  initialWallpaperId,
  initialTheme,
}: {
  initialWallpaperId: string;
  initialTheme: Mode;
}) {
  const [active, setActive] = useState<Layer>(() =>
    serverInitialLayer(initialWallpaperId, initialTheme),
  );
  const [previous, setPrevious] = useState<Layer | null>(null);
  const [theme, setTheme] = useState<Mode>(initialTheme);

  useEffect(() => {
    let cancelled = false;
    let key = 0;
    let request = 0;
    let current = serverInitialLayer(initialWallpaperId, initialTheme);

    const apply = async (id: string, nextTheme = mode()) => {
      const token = ++request;
      const wallpaper = getWallpaper(id);
      const url = getWallpaperUrl(wallpaper, nextTheme);

      setTheme(nextTheme);
      if (current.url === url) return;

      try {
        if (wallpaper.kind === "image") {
          await loadImage(url);
        } else {
          await loadVideo(url);
        }
      } catch {
        // Keep the currently displayed wallpaper if the selected asset fails.
        return;
      }

      if (cancelled || token !== request) return;
      setPrevious(current);
      current = { wallpaper, url, key: ++key };
      setActive(current);
    };

    const change = (event: Event) => {
      const selectedId = (event as CustomEvent<string>).detail;
      if (typeof selectedId === "string" && selectedId.length > 0) {
        void apply(selectedId);
      }
    };
    const storage = (event: StorageEvent) => {
      if (event.key === WALLPAPER_STORAGE_KEY && event.newValue)
        void apply(event.newValue);
    };
    const observer = new MutationObserver(() =>
      void apply(readWallpaperPreference(), mode()),
    );
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
        if (typeof event.data?.id === "string" && event.data.id.length > 0) {
          void apply(event.data.id);
        }
      };
    }

    // Preload the catalogue while keeping the server-selected wallpaper
    // active. Browser storage is not allowed to override an authenticated SSR
    // preference during mount.
    // The selected wallpaper is the initial layer. Warm other images in the
    // background only after the current paint has been committed.
    void Promise.resolve().then(() => {
      preloadAllWallpapers(initialTheme, initialWallpaperId);
    });
    if (mode() !== initialTheme) void apply(initialWallpaperId, mode());

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("utoolity:wallpaper-changed", change);
      window.removeEventListener("storage", storage);
      channel?.close();
    };
  }, [initialWallpaperId, initialTheme]);

  useEffect(() => {
    if (!previous) return;
    const timeout = window.setTimeout(() => setPrevious(null), 900);
    return () => window.clearTimeout(timeout);
  }, [previous]);

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
      data-wallpaper-ready="true"
    >
      {previous && render(previous)}
      {render(active)}
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
