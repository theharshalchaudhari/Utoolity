"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import DesktopBackground from "./DesktopBackground";
import DesktopWindow, { type WindowState } from "./DesktopWindow";
import Profile from "./Profile";
import SystemTray from "./SystemTray";
import { api } from "../../lib/api";
import DesktopContextMenu, { type MenuAction } from "./DesktopContextMenu";
import DesktopApps from "./DesktopApps";
import ToolContent, { appTitles, type DesktopAppId } from "./ToolContent";
import type { WindowSummary } from "./SystemTray/AllWindows";

type DesktopProps = {
  onSleep?: () => void;
  onLock?: () => void;
};

export default function Desktop({ onSleep, onLock }: DesktopProps) {
  const [expandedAppKey, setExpandedAppKey] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [openApps, setOpenApps] = useState<Array<{ app: DesktopAppId; filePath?: string; window?: WindowState }>>([]);
  const [activeAppKey, setActiveAppKey] = useState<string | null>(null);
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [workspaceUserId, setWorkspaceUserId] = useState<string | null>(null);
  const openApp = (app: DesktopAppId, filePath?: string) => {
    const key = `${app}:${filePath ?? ""}`;
    setActiveAppKey(key);
    setOpenApps((current) =>
      current.some((item) => item.app === app && item.filePath === filePath)
        ? current
        : [...current, { app, filePath }],
    );
  };
  const closeMenu = useCallback(() => setMenu(null), []);
  const updateWindowState = useCallback((key: string, window: WindowState) => {
    setOpenApps((current) =>
      current.map((item) =>
        `${item.app}:${item.filePath ?? ""}` === key
          ? { ...item, window }
          : item,
      ),
    );
  }, []);
  const windowSummaries: WindowSummary[] = openApps.map((item) => {
    const key = `${item.app}:${item.filePath ?? ""}`;
    return {
      key,
      title: item.filePath
        ? `${appTitles[item.app]} - ${item.filePath.split("/").at(-1)}`
        : appTitles[item.app],
      active: activeAppKey === key,
      minimized: item.window?.minimized ?? false,
      maximized: item.window?.maximized ?? false,
    };
  });
  const closeWindow = useCallback((key: string) => {
    window.dispatchEvent(
      new CustomEvent("utoolity:tool-closing", { detail: { key } }),
    );
    setOpenApps((current) =>
      current.filter((item) => `${item.app}:${item.filePath ?? ""}` !== key),
    );
    setExpandedAppKey((current) => (current === key ? null : current));
  }, []);

  useEffect(() => {
    if (activeAppKey && openApps.some((item) => `${item.app}:${item.filePath ?? ""}` === activeAppKey)) {
      return;
    }
    const next = openApps.at(-1);
    setActiveAppKey(next ? `${next.app}:${next.filePath ?? ""}` : null);
  }, [activeAppKey, openApps]);

  useEffect(() => {
    let cancelled = false;
    setIsDark(document.documentElement.classList.contains("dark"));
    void api<{ user: { id: string } }>("/api/auth/me")
      .then(({ user }) => {
        if (cancelled) return;
        setWorkspaceUserId(user.id);
        const storageKey = `utoolity.open-apps.${user.id}`;
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const restored = JSON.parse(saved) as Array<{ app: DesktopAppId; filePath?: string; window?: WindowState }>;
            if (Array.isArray(restored)) {
              setOpenApps(restored);
              setActiveAppKey(restored.at(-1) ? `${restored.at(-1)?.app}:${restored.at(-1)?.filePath ?? ""}` : null);
            }
          }
        } catch {
          localStorage.removeItem(storageKey);
        }
        return api<{ workspace: { openApps?: typeof openApps } }>("/api/auth/workspace");
      })
      .then((result) => {
        if (!cancelled && result && Array.isArray(result.workspace.openApps)) {
          setOpenApps(result.workspace.openApps);
          setActiveAppKey(result.workspace.openApps.at(-1) ? `${result.workspace.openApps.at(-1)?.app}:${result.workspace.openApps.at(-1)?.filePath ?? ""}` : null);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setWorkspaceHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const closeFileManager = () => closeWindow("files:");
    window.addEventListener("utoolity:close-file-manager", closeFileManager);
    return () => window.removeEventListener("utoolity:close-file-manager", closeFileManager);
  }, [closeWindow]);

  useEffect(() => {
    const openFolderPicker = (event: Event) => {
      const requester = (event as CustomEvent<{ requester?: string }>).detail?.requester;
      if (!requester) return;
      localStorage.setItem("utoolity.files.folder-picker", requester);
      openApp("files");
    };
    window.addEventListener("utoolity:polygon-folder-request", openFolderPicker);
    return () => window.removeEventListener("utoolity:polygon-folder-request", openFolderPicker);
  }, []);

  useEffect(() => {
    if (!workspaceHydrated || !workspaceUserId) return;
    localStorage.setItem(`utoolity.open-apps.${workspaceUserId}`, JSON.stringify(openApps));
    const timer = window.setTimeout(() => {
      void api("/api/auth/workspace", {
        method: "PUT",
        body: JSON.stringify({ openApps }),
      }).catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [openApps, workspaceHydrated, workspaceUserId]);

  const openMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (event.target !== event.currentTarget) return;
    setMenu({ x: event.clientX, y: event.clientY });
  };

  const handleMenuAction = (action: MenuAction) => {
    const root = document.documentElement;
    if (action === "settings") {
      openApp("settings");
    } else if (action === "lock") {
      onLock?.();
    } else if (action === "fullscreen") {
      const request = document.documentElement.requestFullscreen;
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else if (request) {
        void request.call(document.documentElement);
      }
    } else if (action === "wallpaper") {
      void fetch("/api/wallpapers", { cache: "no-store" })
        .then((response) => response.json() as Promise<{ wallpapers?: Array<{ file: string }> }>)
        .then(({ wallpapers = [] }) => {
          if (wallpapers.length === 0) return;
          const current = root.dataset.wallpaper ?? "default.jpg";
          const currentIndex = wallpapers.findIndex(({ file }) => file === current);
          const next = wallpapers[(currentIndex + 1 + wallpapers.length) % wallpapers.length].file;
          root.dataset.wallpaper = next;
          localStorage.setItem("utoolity.wallpaper", next);
          window.dispatchEvent(new CustomEvent("utoolity:preference-changed", {
            detail: { key: "utoolity.wallpaper", value: next },
          }));
          window.dispatchEvent(new CustomEvent("utoolity:wallpaper-changed", { detail: next }));
          return api("/api/auth/preferences", {
            method: "PATCH",
            body: JSON.stringify({ "utoolity.wallpaper": next }),
          });
        })
        .catch(() => undefined);
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
      const next = root.dataset.desktopIconSize === "large" ? "medium" : "large";
      root.dataset.desktopIconSize = next;
      localStorage.setItem("utoolity.icon-size", next);
      window.dispatchEvent(new CustomEvent("utoolity:icon-size-changed"));
    } else if (action === "bigger-icons") {
      const current = root.dataset.desktopIconSize;
      const next = current === "small" ? "medium" : "large";
      root.dataset.desktopIconSize = next;
      localStorage.setItem("utoolity.icon-size", next);
      window.dispatchEvent(new CustomEvent("utoolity:icon-size-changed"));
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
      if (value) {
        root.dataset[attribute] =
          attribute === "wallpaper" ? (value === "Midnight" ? "default.jpg" : value) : value.toLowerCase();
      }
    });

    void api<{ preferences: Record<string, string> }>("/api/auth/preferences")
      .then(({ preferences }) => {
        Object.entries(preferences).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        if (preferences["utoolity.wallpaper"]) {
          const wallpaper = preferences["utoolity.wallpaper"] === "Midnight"
            ? "default.jpg"
            : preferences["utoolity.wallpaper"];
          root.dataset.wallpaper = wallpaper;
          window.dispatchEvent(new CustomEvent("utoolity:preference-changed", {
            detail: { key: "utoolity.wallpaper", value: wallpaper },
          }));
          window.dispatchEvent(new CustomEvent("utoolity:wallpaper-changed", { detail: wallpaper }));
        }
        if (preferences["utoolity.animations"]) {
          root.dataset.animations = preferences["utoolity.animations"].toLowerCase();
          root.dataset.animation = preferences["utoolity.animations"].toLowerCase();
        }
        if (preferences["utoolity.grain"]) {
          root.dataset.grain = preferences["utoolity.grain"].toLowerCase();
          window.dispatchEvent(new CustomEvent("utoolity:preference-changed", {
            detail: {
              key: "utoolity.grain",
              value: preferences["utoolity.grain"],
            },
          }));
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
      onContextMenu={openMenu}
    >
      <DesktopBackground />
      {!expandedAppKey && <DesktopApps onOpen={openApp} />}
      {!expandedAppKey && <Profile onSleep={onSleep} />}
      {!expandedAppKey && (
        <SystemTray
          windows={windowSummaries}
          onFocusWindow={(key) => {
            setActiveAppKey(key);
            setOpenApps((current) =>
              current.map((item) =>
                `${item.app}:${item.filePath ?? ""}` === key
                  ? {
                      ...item,
                      window: item.window
                        ? { ...item.window, minimized: false }
                        : item.window,
                    }
                  : item,
              ),
            );
          }}
          onCloseWindow={closeWindow}
          onSleep={onSleep}
          onLock={onLock}
        />
      )}
      {openApps.map(({ app, filePath, window: windowState }, index) => {
        const key = `${app}:${filePath ?? ""}`;
        return (
        <DesktopWindow
          key={key}
          title={appTitles[app]}
          active={activeAppKey === key}
          offset={{ x: (index % 3) * 28, y: (index % 3) * 24 }}
          initialState={windowState}
          onStateChange={(nextWindowState) => updateWindowState(key, nextWindowState)}
          onFocus={() => setActiveAppKey(key)}
          onExpandedChange={(expanded) =>
            setExpandedAppKey((current) => {
              if (expanded) return key;
              return current === key ? null : current;
            })
          }
          onClose={() => {
            closeWindow(key);
          }}
          onBack={() => {
            closeWindow(key);
          }}
        >
          <ToolContent
            app={app}
            filePath={filePath}
            onOpenFile={(path, type) => openApp(type === "image" ? "gallery" : "notepad", path)}
          />
        </DesktopWindow>
        );
      })}
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
