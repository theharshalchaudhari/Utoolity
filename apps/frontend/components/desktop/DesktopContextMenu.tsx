"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Expand,
  Folder,
  LayoutGrid,
  LockKeyhole,
  Palette,
  Settings,
  Sun,
} from "lucide-react";

type MenuAction =
  | "icons"
  | "bigger-icons"
  | "wallpaper"
  | "theme"
  | "fullscreen"
  | "lock"
  | "settings";

type Props = {
  open: boolean;
  x: number;
  y: number;
  isDark: boolean;
  onAction: (action: MenuAction) => void;
  onClose: () => void;
};

type MenuIcon = typeof Folder;

const items: Array<
  | { label: string; action: MenuAction; disabled?: boolean; icon: MenuIcon; iconClassName: string }
  | { divider: true }
> = [
  { label: "Change icon size", action: "icons", icon: LayoutGrid, iconClassName: "bg-accent text-accent-foreground" },
  { label: "Next wallpaper", action: "wallpaper", icon: Palette, iconClassName: "bg-card text-card-foreground" },
  { label: "Switch to light mode", action: "theme", icon: Sun, iconClassName: "bg-primary text-primary-foreground" },
  { label: "Full screen", action: "fullscreen", icon: Expand, iconClassName: "bg-secondary text-secondary-foreground" },
  { label: "Lock screen", action: "lock", icon: LockKeyhole, iconClassName: "bg-destructive text-destructive-foreground" },
  { divider: true },
  { label: "Settings", action: "settings", icon: Settings, iconClassName: "bg-card text-card-foreground" },
];

export default function DesktopContextMenu({
  open,
  x,
  y,
  isDark,
  onAction,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const margin = 8;
    setPosition({
      left: Math.max(margin, Math.min(x + 6, window.innerWidth - rect.width - margin)),
      top: Math.max(margin, Math.min(y + 6, window.innerHeight - rect.height - margin)),
    });
  }, [open, x, y]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const reposition = () => {
      const rect = menuRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        left: Math.max(8, Math.min(x + 6, window.innerWidth - rect.width - 8)),
        top: Math.max(8, Math.min(y + 6, window.innerHeight - rect.height - 8)),
      });
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("resize", reposition);
    };
  }, [open, onClose, x, y]);

  if (!open) return null;

  const menuItems = items.map((item) =>
    "divider" in item || item.action !== "theme"
      ? item
      : { ...item, label: isDark ? "Switch to light mode" : "Switch to dark mode" },
  );

  return (
    <ul
      ref={menuRef}
      role="menu"
      aria-label="Desktop menu"
      data-desktop-interactive
      style={{ left: position.left, top: position.top }}
      className="desktop-context-menu fixed z-[100] w-[220px] rounded-[20px] p-2 text-sm font-semibold"
    >
      {menuItems.map((item, index) => {
        if ("divider" in item) {
          return <li key={`divider-${index}`} role="separator" className="my-1.5 h-px bg-border" />;
        }
        const Icon = item.icon;
        return (
          <li key={item.action} role="none">
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                onAction(item.action);
                onClose();
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-popover-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex items-center gap-2.5">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${item.iconClassName}`}>
                  <Icon size={14} strokeWidth={2.2} />
                </span>
                <span>{item.label}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export type { MenuAction };
