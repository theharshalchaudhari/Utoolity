
"use client";

import { useEffect } from "react";
import { useUserPreference } from "../../../../lib/user-preference";
import { Check } from "lucide-react";
import { Card, CardContent } from "@repo/ui/shadcn/card";

const wallpapers = [
  { name: "Wraith", style: "bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" },
  { name: "Bloom", style: "bg-gradient-to-br from-violet-950 via-rose-950 to-slate-950" },
  { name: "Mesh", style: "bg-gradient-to-br from-emerald-950 via-blue-950 to-violet-950" },
  { name: "Horizon", style: "bg-gradient-to-b from-violet-950 via-blue-950 to-emerald-800" },
  { name: "Aurora", style: "bg-gradient-to-br from-indigo-950 via-emerald-900 to-rose-900" },
  { name: "Dunes", style: "bg-gradient-to-b from-rose-950 via-slate-800 to-teal-800" },
  { name: "Orbit", style: "bg-slate-950" },
  { name: "Nightfall", style: "bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950" },
  { name: "Plain", style: "bg-gradient-to-br from-background via-muted to-background" },
  { name: "Gemini", style: "bg-gradient-to-br from-blue-600 via-violet-500 to-rose-400" },
  { name: "Chroma", style: "bg-gradient-to-br from-emerald-700 via-red-600 to-amber-400" },
  { name: "Expressive", style: "bg-gradient-to-br from-violet-800 via-rose-800 to-blue-900" },
  { name: "Pixel", style: "bg-gradient-to-b from-blue-950 via-amber-900 to-emerald-800" },
  { name: "Ribbons", style: "bg-gradient-to-br from-violet-900 via-cyan-600 to-blue-950" },
  { name: "Swatches", style: "bg-gradient-to-br from-amber-950 via-stone-900 to-emerald-950" },
];

export default function Wallpaper() {
  const [selected, setSelected] = useUserPreference<string>("utoolity.wallpaper", "Wraith");

  useEffect(() => {
    document.documentElement.dataset.wallpaper = selected.toLowerCase();
  }, [selected]);

  const selectWallpaper = (name: string) => {
    setSelected(name);
    localStorage.setItem("utoolity.wallpaper", name);
    document.documentElement.dataset.wallpaper = name.toLowerCase();
  };

  return (
    <Card>
      <CardContent className="space-y-2.5 p-3.5">
        <h3 className="text-sm font-semibold">Wallpaper</h3>

        <div className="flex flex-wrap gap-2.5">
          {wallpapers.map((wallpaper) => {
            const active = selected === wallpaper.name;

            return (
              <button
                key={wallpaper.name}
                type="button"
                onClick={() => selectWallpaper(wallpaper.name)}
                aria-pressed={active}
                aria-label={`Select ${wallpaper.name} wallpaper`}
                className={`relative h-[60px] w-[84px] overflow-hidden rounded-2xl border-2 p-0.5 text-left transition-transform hover:scale-[1.03] ${
                  active
                    ? "border-primary"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                <span
                  className={`absolute inset-0 ${wallpaper.style}`}
                />

                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/35 px-1.5 py-1 text-[10px] font-semibold text-white">
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
