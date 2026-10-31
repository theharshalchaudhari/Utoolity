"use client";
import { useEffect, useState } from "react";
import { Check, Film, Image as ImageIcon, Play } from "lucide-react";
import { Card, CardContent } from "@repo/ui/shadcn/card";
import {
  DEFAULT_WALLPAPER_ID,
  getWallpaperUrl,
  readWallpaperPreference,
  saveWallpaperPreference,
  WALLPAPERS,
  type Wallpaper,
} from "../../../../lib/wallpapers";
type Mode = "dark" | "light";
export default function Wallpaper() {
  const [selected, setSelected] = useState(DEFAULT_WALLPAPER_ID),
    [theme, setTheme] = useState<Mode>("dark"),
    [section, setSection] = useState<"image" | "live">("image");
  useEffect(() => {
    const sync = () => {
      setSelected(readWallpaperPreference());
      setTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
    };
    sync();
    window.addEventListener("utoolity:wallpaper-changed", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const storage = (e: StorageEvent) => {
      if (e.key === "utoolity.wallpaper") sync();
    };
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("utoolity:wallpaper-changed", sync);
      window.removeEventListener("storage", storage);
      observer.disconnect();
    };
  }, []);
  const select = (w: Wallpaper) => {
    setSelected(w.id);
    saveWallpaperPreference(w.id);
  };
  const list = WALLPAPERS.filter((w) =>
    section === "live" ? w.kind === "live" : w.kind === "image",
  );
  return (
    <Card>
      <CardContent className="space-y-3 p-3.5">
        <div>
          <h3 className="text-sm font-semibold">Wallpaper</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose a background for your desktop.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border p-0.5">
          <button
            type="button"
            onClick={() => setSection("image")}
            aria-pressed={section === "image"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${section === "image" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          >
            <ImageIcon size={14} />
            Images
          </button>
          <button
            type="button"
            onClick={() => setSection("live")}
            aria-pressed={section === "live"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${section === "live" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          >
            <Film size={14} />
            Live wallpapers
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((w) => {
            const active = selected === w.id,
              url = getWallpaperUrl(w, theme);
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => select(w)}
                aria-pressed={active}
                aria-label={`Select ${w.name} wallpaper`}
                className={`group relative min-w-0 overflow-hidden rounded-xl border-2 text-left ${active ? "border-primary" : "border-border hover:border-foreground/50"}`}
              >
                <span className="relative block aspect-video overflow-hidden bg-muted">
                  {w.kind === "live" ? (
                    <video
                      className="absolute inset-0 h-full w-full object-cover"
                      src={url}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  {w.kind === "live" && (
                    <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/55 text-white">
                      <Play size={12} fill="currentColor" />
                    </span>
                  )}
                  {active && (
                    <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check size={14} />
                    </span>
                  )}
                </span>
                <span className="block truncate px-2.5 py-2 text-xs font-semibold">
                  {w.name}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {section === "live"
            ? "Live wallpapers play locally in your browser and may use more battery and GPU resources."
            : "Image wallpapers use their dark or light variant when available."}
        </p>
      </CardContent>
    </Card>
  );
}
