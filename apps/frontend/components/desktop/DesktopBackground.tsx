"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function DesktopBackground() {
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperVisible, setWallpaperVisible] = useState(false);

  useEffect(() => {
    let wallpapers: Array<{ file: string; url: string }> = [];
    const apply = (selected?: string) => {
      const value = selected ?? document.documentElement.dataset.wallpaper ?? "default.jpg";
      setWallpaperUrl(
        wallpapers.find((wallpaper) => wallpaper.file === value)?.url ??
          wallpapers.find((wallpaper) => wallpaper.file === "default.jpg")?.url ??
          wallpapers[0]?.url ??
          null,
      );
    };
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      apply(detail);
    };
    window.addEventListener("utoolity:wallpaper-changed", onChange);
    void fetch("/api/wallpapers", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ wallpapers?: Array<{ file: string; url: string }> }>)
      .then((data) => {
        wallpapers = data.wallpapers ?? [];
        apply();
      })
      .catch(() => setWallpaperUrl(null));
    return () => window.removeEventListener("utoolity:wallpaper-changed", onChange);
  }, []);

  useEffect(() => {
    if (!wallpaperUrl) return;
    setWallpaperVisible(false);
    const frame = window.requestAnimationFrame(() => setWallpaperVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [wallpaperUrl]);

  return (
    <div
      aria-hidden="true"
      className="desktop-background pointer-events-none fixed inset-0 -z-10 isolate overflow-hidden bg-background"
    >
      {wallpaperUrl && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-out ${
            wallpaperVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url("${wallpaperUrl}")` }}
        />
      )}
      <div className="desktop-background-wash absolute inset-0" />

      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/Logo.svg"
          alt=""
          width={360}
          height={360}
          priority
          className="desktop-logo h-[min(42vw,42vh,360px)] w-[min(42vw,42vh,360px)] object-contain opacity-90"
        />
      </div>

      <div className="desktop-background-vignette absolute inset-0" />
    </div>
  );
}