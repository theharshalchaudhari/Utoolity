"use client";
import {
  GENERATED_DEFAULT_WALLPAPER_ID,
  GENERATED_WALLPAPERS,
} from "./wallpapers.generated";
export type WallpaperKind = "image" | "live";
export type Wallpaper = {
  id: string;
  name: string;
  kind: WallpaperKind;
  url: string;
  darkUrl?: string;
  lightUrl?: string;
};
export const WALLPAPERS = GENERATED_WALLPAPERS;
export const DEFAULT_WALLPAPER_ID = GENERATED_DEFAULT_WALLPAPER_ID;
export const WALLPAPER_STORAGE_KEY = "utoolity.wallpaper";
const LEGACY: Record<string, string> = {
  "default.jpg": DEFAULT_WALLPAPER_ID,
  "dark.jpg": DEFAULT_WALLPAPER_ID,
  "light.jpg": DEFAULT_WALLPAPER_ID,
  Midnight: DEFAULT_WALLPAPER_ID,
};
export function normalizeWallpaperId(v: string | null | undefined) {
  const id = v ? (LEGACY[v] ?? v) : DEFAULT_WALLPAPER_ID;
  return WALLPAPERS.some((w) => w.id === id) ? id : DEFAULT_WALLPAPER_ID;
}
export function getWallpaper(id: string | null | undefined) {
  return (
    WALLPAPERS.find((w) => w.id === normalizeWallpaperId(id)) ?? WALLPAPERS[0]
  );
}
export function getWallpaperUrl(w: Wallpaper, t: "dark" | "light") {
  return w.kind === "live"
    ? w.url
    : ((t === "dark" ? w.darkUrl : w.lightUrl) ?? w.url);
}
export function saveWallpaperPreference(v: string) {
  const id = normalizeWallpaperId(v);
  try {
    localStorage.setItem(WALLPAPER_STORAGE_KEY, id);
    document.cookie =
      WALLPAPER_STORAGE_KEY +
      "=" +
      encodeURIComponent(id) +
      "; Path=/; Max-Age=31536000; SameSite=Lax";
  } catch {}
  document.documentElement.dataset.wallpaper = id;
  window.dispatchEvent(
    new CustomEvent("utoolity:wallpaper-changed", { detail: id }),
  );
  window.dispatchEvent(
    new CustomEvent("utoolity:preference-changed", {
      detail: { key: WALLPAPER_STORAGE_KEY, value: id },
    }),
  );
  if ("BroadcastChannel" in window) {
    const c = new BroadcastChannel("utoolity:wallpaper");
    c.postMessage({ id });
    c.close();
  }
}
export function readWallpaperPreference() {
  try {
    const v = localStorage.getItem(WALLPAPER_STORAGE_KEY);
    if (v) return normalizeWallpaperId(v);
    const c = document.cookie
      .split("; ")
      .find((x) => x.startsWith(WALLPAPER_STORAGE_KEY + "="))
      ?.split("=")
      .slice(1)
      .join("=");
    return normalizeWallpaperId(c ? decodeURIComponent(c) : null);
  } catch {
    return DEFAULT_WALLPAPER_ID;
  }
}
const pending = new Map<string, Promise<void>>();
export function preloadWallpaper(url: string) {
  const old = pending.get(url);
  if (old) return old;
  const p = new Promise<void>((resolve, reject) => {
    if (/\.(mp4|webm|ogv|mov)(?:$|\?)/i.test(url)) {
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.onloadeddata = () => resolve();
      v.onerror = () => reject(new Error("Wallpaper load failed"));
      v.src = url;
      v.load();
    } else {
      const i = new Image();
      i.decoding = "async";
      i.onload = () => resolve();
      i.onerror = () => reject(new Error("Wallpaper load failed"));
      i.src = url;
    }
  }).catch((e) => {
    pending.delete(url);
    throw e;
  });
  pending.set(url, p);
  return p;
}
