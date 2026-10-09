
"use client";

import { useState } from "react";
import {
  AppWindow,
  Monitor,
  Music2,
  Palette,
  Search,
  Settings2,
} from "lucide-react";

import Appearance from "./Settings/Appearance";
import DesktopApps from "./Settings/Desktop&Apps";
import Sound from "./Settings/Sound";
import ThisDevice from "./Settings/ThisDevice";
import SearchSettings from "./Settings/SearchSettings";

const sections = [
  {
    id: "appearance",
    label: "Appearance",
    description: "Wallpaper, theme, lock screen",
    icon: Palette,
  },
  {
    id: "desktop",
    label: "Desktop & apps",
    description: "Icons, widgets, where apps live",
    icon: AppWindow,
  },
  {
    id: "sound",
    label: "Sound",
    description: "Sounds and haptics",
    icon: Music2,
  },
  {
    id: "device",
    label: "This device",
    description: "Install the app, keyboard shortcuts",
    icon: Monitor,
  },
] as const;

type SectionId = (typeof sections)[number]["id"];

export default function Settings() {
  const [activeSection, setActiveSection] =
    useState<SectionId>("appearance");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSections = sections.filter((section) =>
    `${section.label} ${section.description}`
      .toLowerCase()
      .includes(normalizedQuery),
  );

  return (
    <main className="settings-surface h-full overflow-hidden bg-background p-2 text-foreground sm:p-3">
      <div className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-card max-sm:w-[64px]">
          <div className="px-2.5 pb-3 pt-5 sm:px-3.5">
            <h1 className="mb-3 hidden px-1 text-xl font-bold tracking-tight sm:block">
              Settings
            </h1>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search settings"
                aria-label="Search settings"
                className="h-9 w-full rounded-full border border-input bg-background pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 max-sm:hidden"
              />
            </div>
          </div>

          <nav
            aria-label="Settings sections"
            className="flex-1 space-y-1 overflow-y-auto px-2 pb-3 sm:px-2.5"
          >
            {filteredSections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  title={section.label}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-full px-2 py-2 text-left transition-colors sm:px-2.5 ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${
                      active
                        ? "border-primary/20 bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                  </span>

                  <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-[0.95rem] font-semibold leading-5">
                      {section.label}
                    </span>
                    <span className="block truncate text-xs leading-4 text-muted-foreground">
                      {section.description}
                    </span>
                  </span>
                </button>
              );
            })}

            {filteredSections.length === 0 && (
              <p className="px-2 py-4 text-xs text-muted-foreground">
                No matching sections.
              </p>
            )}
          </nav>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Settings2 size={16} />
              <span className="hidden text-sm sm:block">
                System settings
              </span>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1600px] space-y-2.5 p-4 sm:p-6">
            {normalizedQuery ? (
              <SearchSettings
                query={query}
                onNavigate={(section) => {
                  setActiveSection(section);
                  setQuery("");
                }}
              />
            ) : (
              <>
                {activeSection === "appearance" && <Appearance />}
                {activeSection === "desktop" && <DesktopApps />}
                {activeSection === "sound" && <Sound />}
                {activeSection === "device" && <ThisDevice />}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
