"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import DesktopBackground from "./DesktopBackground";
import DesktopWindow from "./DesktopWindow";
import Profile from "./Profile";
import SystemTray from "./SystemTray";
import { api } from "../../lib/api";
import DesktopContextMenu, { type MenuAction } from "./DesktopContextMenu";

const wallpapers = ["Wraith", "Bloom", "Mesh", "Horizon", "Aurora", "Dunes", "Orbit", "Nightfall", "Plain", "Gemini", "Chroma", "Expressive", "Pixel", "Ribbons", "Swatches"];

type DesktopProps = {
  children?: ReactNode;
  onSleep?: () => void;
};

export default function Desktop({ children, onSleep }: DesktopProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [windowExpanded, setWindowExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDark, setIsDark] = useState(true);

  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const updateFullscreen = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const openMenu = (event: MouseEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    setMenu({ x: event.clientX, y: event.clientY });
  };

  const handleMenuAction = (action: MenuAction) => {
    const root = document.documentElement;
    if (action === "settings") {
      router.push("/settings");
    } else if (action === "lock") {
      onSleep?.();
    } else if (action === "fullscreen") {
      const request = document.documentElement.requestFullscreen;
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else if (request) {
        void request.call(document.documentElement);
      }
    } else if (action === "wallpaper") {
      const current = root.dataset.wallpaper ?? "wraith";
      const currentIndex = wallpapers.findIndex(
        (wallpaper) => wallpaper.toLowerCase() === current,
      );
      const next = wallpapers[(currentIndex + 1) % wallpapers.length];
      root.dataset.wallpaper = next.toLowerCase();
      localStorage.setItem("utoolity.wallpaper", next);
      void api("/api/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify({ "utoolity.wallpaper": next }),
      }).catch(() => undefined);
    } else if (action === "theme") {
      const nextTheme = root.classList.contains("dark") ? "light" : "dark";
      root.classList.toggle("dark", nextTheme === "dark");
      root.classList.toggle("light", nextTheme === "light");
      root.style.colorScheme = nextTheme;
      setIsDark(nextTheme === "dark");
      localStorage.setItem("utoolity.theme", nextTheme);
      void api("/api/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify({ "utoolity.theme": nextTheme }),
      }).catch(() => undefined);
    } else if (action === "icons") {
      const next = root.dataset.desktopIconSize === "auto" ? "medium" : "auto";
      root.dataset.desktopIconSize = next;
      localStorage.setItem("utoolity.icon-size", next);
    } else if (action === "bigger-icons") {
      const next =
        root.dataset.desktopIconSize === "large"
          ? "large"
          : root.dataset.desktopIconSize === "medium"
            ? "large"
            : "medium";
      root.dataset.desktopIconSize = next;
      localStorage.setItem("utoolity.icon-size", next);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const values = [
      ["wallpaper", "utoolity.wallpaper"],
      ["lockscreen", "utoolity.lockscreen"],
      ["animations", "utoolity.animations"],
      ["grain", "utoolity.grain"],
      ["desktopIconSize", "utoolity.icon-size"],
    ] as const;

    values.forEach(([attribute, key]) => {
      const value = localStorage.getItem(key);
      if (value) root.dataset[attribute] = value.toLowerCase();
    });

    void api<{ preferences: Record<string, string> }>("/api/auth/preferences")
      .then(({ preferences }) => {
        Object.entries(preferences).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        if (preferences["utoolity.wallpaper"]) {
          root.dataset.wallpaper = preferences["utoolity.wallpaper"].toLowerCase();
        }
        if (preferences["utoolity.animations"]) {
          root.dataset.animations = preferences["utoolity.animations"].toLowerCase();
          root.dataset.animation = preferences["utoolity.animations"].toLowerCase();
        }
        if (preferences["utoolity.grain"]) {
          root.dataset.grain = preferences["utoolity.grain"].toLowerCase();
        }
        if (preferences["utoolity.lockscreen"]) {
          root.dataset.lockscreen = preferences["utoolity.lockscreen"].toLowerCase();
        }
        if (preferences["utoolity.icon-size"]) {
          root.dataset.desktopIconSize = preferences["utoolity.icon-size"].toLowerCase();
        }
      })
      .catch(() => {
        // The desktop can continue with locally cached preferences.
      });

  }, []);

  return (
    <main
      className="desktop-canvas relative min-h-dvh select-none"
      onDoubleClick={openMenu}
      onContextMenu={(event) => event.preventDefault()}
    >
      <DesktopBackground />
      {!windowExpanded && !isFullscreen && <Profile onSleep={onSleep} />}
      {!windowExpanded && !isFullscreen && <SystemTray />}
      {pathname === "/settings" && (
        <DesktopWindow
          title="Settings"
          onExpandedChange={setWindowExpanded}
          onClose={() => router.push("/")}
        >
          {children}
        </DesktopWindow>
      )}
      <DesktopContextMenu
        open={menu !== null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        isDark={isDark}
        onAction={handleMenuAction}
        onClose={closeMenu}
      />
    </main>
  );
}
