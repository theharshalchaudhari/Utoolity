
"use client";

import { useEffect, useState } from "react";
import { useUserPreference } from "../../../../lib/user-preference";
import { Check } from "lucide-react";
import { Card, CardContent } from "@repo/ui/shadcn/card";

export default function Wallpaper() {
  const [wallpapers, setWallpapers] = useState<Array<{ file: string; name: string; url: string }>>([]);
  const [selected, setSelected] = useUserPreference<string>("utoolity.wallpaper", "default.jpg");

  useEffect(() => {
    void fetch("/api/wallpapers", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ wallpapers?: Array<{ file: string; name: string; url: string }> }>)
      .then((data) => setWallpapers(data.wallpapers ?? []))
      .catch(() => setWallpapers([]));
  }, []);

  useEffect(() => {
    const migrated = selected === "Midnight" ? "default.jpg" : selected;
    document.documentElement.dataset.wallpaper = migrated;
    if (migrated !== selected) setSelected(migrated);
  }, [selected]);

  const selectWallpaper = (file: string) => {
    setSelected(file);
    document.documentElement.dataset.wallpaper = file;
    window.dispatchEvent(new CustomEvent("utoolity:wallpaper-changed", { detail: file }));
  };

  return (
    <Card>
      <CardContent className="space-y-2.5 p-3.5">
        <h3 className="text-sm font-semibold">Wallpaper</h3>

        <div className="flex flex-wrap gap-2.5">
          {wallpapers.map((wallpaper) => {
            const active = selected === wallpaper.file;

            return (
              <button
                key={wallpaper.file}
                type="button"
                onClick={() => selectWallpaper(wallpaper.file)}
                aria-pressed={active}
                aria-label={`Select ${wallpaper.name} wallpaper`}
                className={`relative h-[60px] w-[84px] overflow-hidden rounded-2xl border-2 p-0.5 text-left transition-transform hover:scale-[1.03] ${
                  active
                    ? "border-primary"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                <span className="absolute inset-0 bg-muted" style={{ backgroundImage: `url("${wallpaper.url}")`, backgroundSize: "cover", backgroundPosition: "center" }} />

                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/80 px-1.5 py-1 text-[10px] font-semibold text-foreground">
                  {wallpaper.name}
                  {active && <Check size={12} />}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
