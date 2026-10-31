"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import DesktopBackground from "./DesktopBackground";
import DesktopWindow, { type WindowState } from "./DesktopWindow";
import Profile from "./Profile";
import SystemTray from "./SystemTray";
import { api } from "../../lib/api";
import DesktopContextMenu, { type MenuAction } from "./DesktopContextMenu";
import DesktopApps from "./DesktopApps";
import { WALLPAPERS, normalizeWallpaperId, readWallpaperPreference, saveWallpaperPreference } from "../../lib/wallpapers";
import ToolContent, { appTitles, type DesktopAppId } from "./ToolContent";
import type { WindowSummary } from "./SystemTray/AllWindows";
import CollaborationPanel from "../collaboration/CollaborationPanel";

type DesktopProps = {
  onSleep?: () => void;
  onLock?: () => void;
};

export default function Desktop({ onSleep, onLock }: DesktopProps) {
  const [expandedAppKey, setExpandedAppKey] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [desktopScale, setDesktopScale] = useState(1);
  const [openApps, setOpenApps] = useState<Array<{ app: DesktopAppId; filePath?: string; window?: WindowState }>>([]);
  const [activeAppKey, setActiveAppKey] = useState<string | null>(null);
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [workspaceUserId, setWorkspaceUserId] = useState<string | null>(null);
  const [sharedOwnerUserId, setSharedOwnerUserId] = useState<string | null>(null);
  const [sharedPermission, setSharedPermission] = useState<"view" | "editor" | null>(null);
  const isSharedViewer = sharedOwnerUserId !== null;
  const closingWindowKeysRef = useRef(new Set<string>());
  useEffect(() => {
    const updateScale = () => {
      const fitScale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      setDesktopScale(Math.max(0.68, fitScale));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const openApp = useCallback((app: DesktopAppId, filePath?: string) => {
    if (isSharedViewer) {
      if (sharedPermission === "editor") {
        window.dispatchEvent(new CustomEvent("utoolity:shared-command-outgoing", { detail: { command: "open-app", payload: { app, filePath } } }));
      }
      return;
    }
    const key = `${app}:${filePath ?? ""}`;
    setActiveAppKey(key);
    setOpenApps((current) =>
      current.some((item) => item.app === app && item.filePath === filePath)
        ? current
        : [...current, { app, filePath }],
    );
  }, [isSharedViewer, sharedPermission]);
  const closeMenu = useCallback(() => setMenu(null), []);
  const updateWindowState = useCallback((key: string, windowState: WindowState) => {
    if (isSharedViewer) {
      if (sharedPermission === "editor") {
        window.dispatchEvent(new CustomEvent("utoolity:shared-command-outgoing", {
          detail: { command: "window-state", payload: { key, window: windowState } },
        }));
      }
      return;
    }
    setOpenApps((current) =>
      current.map((item) =>
        `${item.app}:${item.filePath ?? ""}` === key
          ? { ...item, window: windowState }
          : item,
      ),
    );
  }, [isSharedViewer, sharedPermission]);
  // Derive maximized visibility from persisted window state as well as the
  // immediate expanded-window flag. This also covers restored maximized windows.
  const hasMaximizedWindow = openApps.some(
    (item) => item.window?.maximized === true && item.window?.minimized !== true,
  );
  // Keep the desktop chrome mounted; app windows render above it by z-index.
  const hideDesktopChrome = false;

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
    if (isSharedViewer) {
      if (sharedPermission === "editor") window.dispatchEvent(new CustomEvent("utoolity:shared-command-outgoing", { detail: { command: "close-app", payload: key } }));
      return;
    }
    if (closingWindowKeysRef.current.has(key)) return;
    closingWindowKeysRef.current.add(key);
    window.dispatchEvent(
      new CustomEvent("utoolity:tool-closing", { detail: { key } }),
    );
    window.setTimeout(() => {
      closingWindowKeysRef.current.delete(key);
      setOpenApps((current) =>
        current.filter((item) => `${item.app}:${item.filePath ?? ""}` !== key),
      );
      setExpandedAppKey((current) => (current === key ? null : current));
    }, 180);
  }, [isSharedViewer, sharedPermission]);

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
    const userId = localStorage.getItem("utoolity.authenticated-user-id");
    if (!userId) {
      setWorkspaceHydrated(true);
      return () => { cancelled = true; };
    }
    setWorkspaceUserId(userId);
    const storageKey = `utoolity.open-apps.${userId}`;
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
    void api<{ workspace: { openApps?: typeof openApps; activeAppKey?: string | null; context?: Record<string, unknown> } }>("/api/auth/workspace")
      .then((result) => {
        if (cancelled || !result) return;
        if (Array.isArray(result.workspace.openApps)) {
          setOpenApps(result.workspace.openApps);
          setActiveAppKey(typeof result.workspace.activeAppKey === "string" ? result.workspace.activeAppKey : result.workspace.openApps.at(-1) ? `${result.workspace.openApps.at(-1)?.app}:${result.workspace.openApps.at(-1)?.filePath ?? ""}` : null);
        }
        const folder = result.workspace.context?.boundingBoxFolder;
        if (typeof folder === "string" && folder) {
          localStorage.setItem("utoolity.bounding-box.folder", folder);
          localStorage.setItem("utoolity.polygon.folder", folder);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setWorkspaceHydrated(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const applySharedSession = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerUserId?: string; permission?: "view" | "editor"; workspace?: { openApps?: typeof openApps; activeAppKey?: string | null; context?: Record<string, unknown> } }>).detail;
      if (!detail?.ownerUserId) return;
      setSharedOwnerUserId(detail.ownerUserId);
      setSharedPermission(detail.permission === "editor" ? "editor" : "view");
      const workspace = detail.workspace;
      if (workspace?.context && typeof workspace.context === "object") {
        const boundingBoxFolder = workspace.context.boundingBoxFolder;
        const polygonFolder = workspace.context.polygonFolder;
        if (typeof boundingBoxFolder === "string" && boundingBoxFolder) {
          localStorage.setItem("utoolity.bounding-box.folder", boundingBoxFolder);
          window.dispatchEvent(new CustomEvent("utoolity:shared-folder-changed", { detail: { path: boundingBoxFolder } }));
        }
        if (typeof polygonFolder === "string" && polygonFolder) localStorage.setItem("utoolity.polygon.folder", polygonFolder);
      }
      if (Array.isArray(workspace?.openApps)) {
        const next = workspace.openApps.filter((item) => item && typeof item.app === "string") as typeof openApps;
        setOpenApps(next);
        setActiveAppKey(typeof workspace.activeAppKey === "string" ? workspace.activeAppKey : next.at(-1) ? `${next.at(-1)?.app}:${next.at(-1)?.filePath ?? ""}` : null);
      }
      setWorkspaceHydrated(true);
    };
    const applySharedWorkspace = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerUserId?: string; workspace?: { openApps?: typeof openApps; activeAppKey?: string | null; context?: Record<string, unknown> } }>).detail;
      if (!detail?.workspace || (sharedOwnerUserId && detail.ownerUserId !== sharedOwnerUserId)) return;
      const workspace = detail.workspace;
      if (workspace.context && typeof workspace.context === "object") {
        const boundingBoxFolder = workspace.context.boundingBoxFolder;
        const polygonFolder = workspace.context.polygonFolder;
        if (typeof boundingBoxFolder === "string" && boundingBoxFolder) {
          localStorage.setItem("utoolity.bounding-box.folder", boundingBoxFolder);
          window.dispatchEvent(new CustomEvent("utoolity:shared-folder-changed", { detail: { path: boundingBoxFolder } }));
        }
        if (typeof polygonFolder === "string" && polygonFolder) localStorage.setItem("utoolity.polygon.folder", polygonFolder);
      }
      if (Array.isArray(workspace.openApps)) {
        const next = workspace.openApps.filter((item) => item && typeof item.app === "string") as typeof openApps;
        setOpenApps(next);
        setActiveAppKey(typeof workspace.activeAppKey === "string" ? workspace.activeAppKey : next.at(-1) ? `${next.at(-1)?.app}:${next.at(-1)?.filePath ?? ""}` : null);
      }
    };
    const applyPermission = (event: Event) => {
      const detail = (event as CustomEvent<{ permission?: "view" | "editor" }>).detail;
      setSharedPermission(detail?.permission === "editor" ? "editor" : "view");
    };
    const endSharedSession = () => {
      setSharedOwnerUserId(null);
      setSharedPermission(null);
      window.location.reload();
    };
    const applyCommand = (event: Event) => {
      if (isSharedViewer) return;
      const detail = (event as CustomEvent<{ fromUserId?: string; fromDisplayName?: string; command?: string; payload?: unknown }>).detail;
      if (!detail?.command) return;
      if (detail.command === "open-app" && detail.payload && typeof detail.payload === "object") {
        const payload = detail.payload as { app?: DesktopAppId; filePath?: string };
        if (payload.app && Object.prototype.hasOwnProperty.call(appTitles, payload.app)) openApp(payload.app, payload.filePath);
        window.dispatchEvent(new CustomEvent("utoolity:collaboration-audit", { detail: { actorUserId: detail.fromUserId, actorDisplayName: detail.fromDisplayName, action: "open-app", target: payload.app } }));
      }
      if (detail.command === "close-app" && typeof detail.payload === "string") {
        closeWindow(detail.payload);
        window.dispatchEvent(new CustomEvent("utoolity:collaboration-audit", { detail: { actorUserId: detail.fromUserId, actorDisplayName: detail.fromDisplayName, action: "close-app", target: detail.payload } }));
      }
      if (detail.command === "focus-app" && typeof detail.payload === "string") {
        setActiveAppKey(detail.payload);
        window.dispatchEvent(new CustomEvent("utoolity:collaboration-audit", { detail: { actorUserId: detail.fromUserId, actorDisplayName: detail.fromDisplayName, action: "focus-app", target: detail.payload } }));
      }
      if (detail.command === "workspace" && detail.payload && typeof detail.payload === "object") {
        const workspace = detail.payload as { openApps?: typeof openApps; activeAppKey?: string | null; context?: Record<string, unknown> };
        if (Array.isArray(workspace.openApps)) setOpenApps(workspace.openApps);
        if (typeof workspace.activeAppKey === "string") setActiveAppKey(workspace.activeAppKey);
        if (typeof workspace.context?.boundingBoxFolder === "string" && workspace.context.boundingBoxFolder) {
          localStorage.setItem("utoolity.bounding-box.folder", workspace.context.boundingBoxFolder);
          localStorage.setItem("utoolity.polygon.folder", typeof workspace.context.polygonFolder === "string" ? workspace.context.polygonFolder : workspace.context.boundingBoxFolder);
          window.dispatchEvent(new CustomEvent("utoolity:shared-folder-changed", { detail: { path: workspace.context.boundingBoxFolder } }));
        }
        window.dispatchEvent(new CustomEvent("utoolity:collaboration-audit", {
          detail: { actorUserId: detail.fromUserId, actorDisplayName: detail.fromDisplayName, action: "workspace", target: "desktop" },
        }));
      }
      if (detail.command === "window-state" && detail.payload && typeof detail.payload === "object") {
        const payload = detail.payload as { key?: string; window?: WindowState };
        if (typeof payload.key === "string" && payload.window) {
          setOpenApps((current) => current.map((item) => `${item.app}:${item.filePath ?? ""}` === payload.key ? { ...item, window: payload.window } : item));
          window.dispatchEvent(new CustomEvent("utoolity:collaboration-audit", { detail: { actorUserId: detail.fromUserId, actorDisplayName: detail.fromDisplayName, action: "window-state", target: payload.key } }));
        }
      }
      if (detail.command === "workspace" && detail.payload && typeof detail.payload === "object") {
        const workspace = detail.payload as { openApps?: typeof openApps; activeAppKey?: string | null; context?: Record<string, unknown> };
        if (Array.isArray(workspace.openApps)) setOpenApps(workspace.openApps);
        if (typeof workspace.activeAppKey === "string") setActiveAppKey(workspace.activeAppKey);
        if (typeof workspace.context?.boundingBoxFolder === "string" && workspace.context.boundingBoxFolder) {
          localStorage.setItem("utoolity.bounding-box.folder", workspace.context.boundingBoxFolder);
          localStorage.setItem("utoolity.polygon.folder", typeof workspace.context.polygonFolder === "string" ? workspace.context.polygonFolder : workspace.context.boundingBoxFolder);
          window.dispatchEvent(new CustomEvent("utoolity:shared-folder-changed", { detail: { path: workspace.context.boundingBoxFolder } }));
        }
        window.dispatchEvent(new CustomEvent("utoolity:collaboration-audit", {
          detail: {
            actorUserId: detail.fromUserId,
            actorDisplayName: detail.fromDisplayName,
            action: "workspace",
            target: "desktop",
          },
        }));
      }
    };
    window.addEventListener("utoolity:shared-session-changed", applySharedSession);
    window.addEventListener("utoolity:shared-workspace", applySharedWorkspace);
    window.addEventListener("utoolity:shared-permission-changed", applyPermission);
    window.addEventListener("utoolity:shared-session-ended", endSharedSession);
    window.addEventListener("utoolity:shared-workspace-command", applyCommand);
    return () => {
      window.removeEventListener("utoolity:shared-session-changed", applySharedSession);
      window.removeEventListener("utoolity:shared-workspace", applySharedWorkspace);
      window.removeEventListener("utoolity:shared-permission-changed", applyPermission);
      window.removeEventListener("utoolity:shared-session-ended", endSharedSession);
      window.removeEventListener("utoolity:shared-workspace-command", applyCommand);
    };
  }, [sharedOwnerUserId, isSharedViewer, openApp, closeWindow]);

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
    if (!workspaceHydrated || !workspaceUserId || isSharedViewer) return;
    const timer = window.setTimeout(() => {
      const workspace = {
        openApps,
        activeAppKey,
        context: {
          boundingBoxFolder: localStorage.getItem("utoolity.bounding-box.folder"),
          polygonFolder: localStorage.getItem("utoolity.polygon.folder"),
        },
      };
      const serializableApps = openApps.map((item) => ({
        app: item.app,
        ...(item.filePath !== undefined ? { filePath: item.filePath } : {}),
        ...(item.window ? {
          window: {
            position: { x: item.window.position.x, y: item.window.position.y },
            size: { width: item.window.size.width, height: item.window.size.height },
            maximized: item.window.maximized,
            minimized: item.window.minimized,
          },
        } : {}),
      }));
      localStorage.setItem(
        `utoolity.open-apps.${workspaceUserId}`,
        JSON.stringify(serializableApps),
      );
      // Geometry stays local while the pointer moves; send one settled snapshot
      // over the existing authenticated WebSocket after the gesture.
      window.dispatchEvent(new CustomEvent("utoolity:workspace-state-changed", {
        detail: workspace,
      }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [openApps, activeAppKey, workspaceHydrated, workspaceUserId, isSharedViewer]);

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
      // Explicit locking is available only from the system tray.
      return;
    } else if (action === "fullscreen") {
      const request = document.documentElement.requestFullscreen;
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else if (request) {
        void request.call(document.documentElement);
      }
    } else if (action === "wallpaper") {
      if (WALLPAPERS.length) {
        const current = normalizeWallpaperId(root.dataset.wallpaper ?? readWallpaperPreference());
        const index = WALLPAPERS.findIndex(({ id }) => id === current);
        saveWallpaperPreference(WALLPAPERS[(index + 1 + WALLPAPERS.length) % WALLPAPERS.length].id);
      }
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
    // Wallpaper selection uses saveWallpaperPreference() rather than the
    // useUserPreference hook, so persist its change event explicitly.
    // Theme, grain, lockscreen and icon size already persist through their hook.
    const persistWallpaper = (event: Event) => {
      const wallpaperId = (event as CustomEvent<string>).detail;
      if (typeof wallpaperId !== "string" || !wallpaperId) return;
      void api("/api/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify({ "utoolity.wallpaper": wallpaperId }),
      }).catch((error) => {
        console.warn("Unable to persist profile wallpaper.", error);
      });
    };
    window.addEventListener("utoolity:wallpaper-changed", persistWallpaper);
    return () => window.removeEventListener("utoolity:wallpaper-changed", persistWallpaper);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const values = [
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
          if (key !== "utoolity.wallpaper" && key !== "utoolity.theme") {
            localStorage.setItem(key, value);
          }
        });
        // The authenticated profile is the source of truth for persisted settings.
        // If it has no explicit theme, use the OS preference rather than a stale
        // theme left by another profile in this browser.
        if (preferences["utoolity.theme"] === "dark" || preferences["utoolity.theme"] === "light") {
          const savedTheme = preferences["utoolity.theme"];
          localStorage.setItem("utoolity.theme", savedTheme);
          root.classList.toggle("dark", savedTheme === "dark");
          root.classList.toggle("light", savedTheme === "light");
          root.style.colorScheme = savedTheme;
          setIsDark(savedTheme === "dark");
        } else {
          localStorage.removeItem("utoolity.theme");
          const deviceTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
          root.classList.toggle("dark", deviceTheme === "dark");
          root.classList.toggle("light", deviceTheme === "light");
          root.style.colorScheme = deviceTheme;
          setIsDark(deviceTheme === "dark");
        }
        if (preferences["utoolity.wallpaper"]) {
          saveWallpaperPreference(preferences["utoolity.wallpaper"]);
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
    <main className="desktop-canvas relative min-h-dvh w-full select-none" onContextMenu={openMenu}>
      <DesktopBackground />
      {!hideDesktopChrome && <DesktopApps onOpen={openApp} />}
      {!hideDesktopChrome && <Profile onSleep={onSleep} />}
      {!hideDesktopChrome && !isSharedViewer && (
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
          windowKey={key}
          title={appTitles[app]}
          active={activeAppKey === key}
          offset={{ x: (index % 3) * 28, y: (index % 3) * 24 }}
          initialState={windowState}
          onStateChange={(nextWindowState) => {
            updateWindowState(key, nextWindowState);
            if (!isSharedViewer || sharedPermission === "editor") {
              window.dispatchEvent(new CustomEvent("utoolity:workspace-state-changed", {
                detail: {
                  openApps: openApps.map((item) => `${item.app}:${item.filePath ?? ""}` === key ? { ...item, window: nextWindowState } : item),
                  activeAppKey,
                  context: {
                    boundingBoxFolder: localStorage.getItem("utoolity.bounding-box.folder"),
                    polygonFolder: localStorage.getItem("utoolity.polygon.folder"),
                  },
                },
              }));
            }
          }}
          onFocus={() => {
            if (isSharedViewer) {
              if (sharedPermission === "editor") {
                setActiveAppKey(key);
                window.dispatchEvent(new CustomEvent("utoolity:shared-command-outgoing", { detail: { command: "focus-app", payload: key } }));
              }
              return;
            }
            setActiveAppKey(key);
          }}
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
      {isSharedViewer && (
        <div className="fixed left-4 top-4 z-[1001] flex items-center gap-3 rounded-full border border-border bg-card/90 px-4 py-2 text-xs shadow-lg backdrop-blur-xl">
          <span>Viewing shared desktop</span>
          <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold">{sharedPermission === "editor" ? "Editor" : "View only"}</span>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("utoolity:leave-shared-session"))} className="rounded-full border border-border px-2 py-1 hover:bg-muted">Leave</button>
        </div>
      )}
      <CollaborationPanel />
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
