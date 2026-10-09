
"use client";

import {
  AppWindow,
  Monitor,
  Music2,
  Palette,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@repo/ui/shadcn/card";

type SectionId = "appearance" | "desktop" | "sound" | "device";

type Props = {
  query: string;
  onNavigate: (section: SectionId) => void;
};

const results: {
  section: SectionId;
  title: string;
  description: string;
  icon: typeof Palette;
  keywords: string;
}[] = [
  {
    section: "appearance",
    title: "Appearance",
    description: "Wallpaper, lock screen, animation, theme and text size",
    icon: Palette,
    keywords: "wallpaper background lock screen animation grain theme text size",
  },
  {
    section: "desktop",
    title: "Desktop & apps",
    description: "Icon layout, icon size, status and music widgets",
    icon: AppWindow,
    keywords: "desktop icons grid tidy widget music status windows",
  },
  {
    section: "sound",
    title: "Sound",
    description: "Sounds and haptics",
    icon: Music2,
    keywords: "audio volume sound haptics",
  },
  {
    section: "device",
    title: "This device",
    description: "Installation and keyboard shortcuts",
    icon: Monitor,
    keywords: "install app browser keyboard shortcuts device",
  },
];

export default function SearchSettings({
  query,
  onNavigate,
}: Props) {
  const normalized = query.trim().toLowerCase();

  const filtered = results.filter((item) =>
    `${item.title} ${item.description} ${item.keywords}`
      .toLowerCase()
      .includes(normalized),
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold tracking-tight">
          Search settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Results for &quot;{query}&quot;
        </p>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-2">
          {filtered.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.section}
                type="button"
                onClick={() => onNavigate(item.section)}
                className="w-full rounded-2xl text-left transition-colors hover:bg-accent/60"
              >
                <Card className="transition-colors hover:border-primary/30">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <Icon size={19} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </span>
                    </span>

                    <Search
                      size={15}
                      className="shrink-0 text-muted-foreground"
                    />
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
            <Search size={22} className="text-muted-foreground" />
            <p className="text-sm font-semibold">No results found</p>
            <p className="text-xs text-muted-foreground">
              Try searching for wallpaper, icons, theme, sound or device.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
