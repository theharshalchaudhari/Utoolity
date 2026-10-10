"use client";

import { useEffect, useState } from "react";
import { Folder, Image, ScanLine, Settings2, Sparkles, Video } from "lucide-react";
import type { DesktopAppId } from "./ToolContent";
import { cn } from "@/lib/utils";

type DesktopApp = {
  id: string;
  label: string;
  icon: typeof Folder;
  frameSet: "folder" | "image" | "video" | "settings";
  iconClassName: string;
  route?: DesktopAppId;
  tools?: Array<{ label: string; route: DesktopAppId }>;
};

type IconSize = "small" | "medium" | "large";

const iconDimensions: Record<IconSize, { tile: string; art: string; button: string; text: string }> = {
  small: { tile: "size-[50px]", art: "size-11", button: "w-[64px]", text: "text-xs" },
  medium: { tile: "size-[60px]", art: "size-[52px]", button: "w-[84px]", text: "text-sm" },
  large: { tile: "size-[74px]", art: "size-16", button: "w-[104px]", text: "text-sm" },
};

const apps: DesktopApp[] = [
  { id: "files", label: "Folder", icon: Folder, frameSet: "folder", iconClassName: "bg-accent text-primary-foreground", route: "files" },
  {
    id: "images",
    label: "Images",
    icon: Image,
    frameSet: "image",
    iconClassName: "bg-accent text-accent-foreground",
    tools: [
      { label: "Image Converter", route: "image-converter" },
      { label: "Image Classification", route: "image-classification" },
    ],
  },
  {
    id: "augmentation",
    label: "Augmentation",
    icon: Sparkles,
    frameSet: "image",
    iconClassName: "bg-primary text-primary-foreground",
    route: "augmentation",
  },
  {
    id: "videos",
    label: "Videos",
    icon: Video,
    frameSet: "video",
    iconClassName: "bg-secondary text-secondary-foreground",
    tools: [
      { label: "Video Converter", route: "video-converter" },
      { label: "Video Trim", route: "video-trim" },
      { label: "Video Merge", route: "video-merge" },
      { label: "Video to Images", route: "video-to-images" },
    ],
  },
  {
    id: "annotation",
    label: "Annotation",
    icon: ScanLine,
    frameSet: "image",
    iconClassName: "bg-muted text-foreground",
    tools: [
      { label: "Bounding Box", route: "bounding-box" },
      { label: "Polygon Annotation", route: "polygon-annotation" },
    ],
  },
  { id: "settings", label: "Settings", icon: Settings2, frameSet: "settings", iconClassName: "bg-card text-card-foreground", route: "settings" },
  { id: "gallery", label: "Gallery", icon: Image, frameSet: "image", iconClassName: "bg-primary text-primary-foreground", route: "gallery" },
  { id: "notepad", label: "Notepad", icon: Settings2, frameSet: "settings", iconClassName: "bg-secondary text-secondary-foreground", route: "notepad" },
];

const frameCount = 28;
const hoverFrameEnd = Math.floor(frameCount / 2);

function AnimatedIcon({
  frameSet,
  artClassName,
}: {
  frameSet: DesktopApp["frameSet"];
  artClassName: string;
}) {
  const [frame, setFrame] = useState(0);
  const [direction, setDirection] = useState<"idle" | "forward" | "reverse">("idle");

  useEffect(() => {
    if (direction === "idle") return;
    const timer = window.setInterval(() => {
      setFrame((current) => {
        const next = direction === "forward" ? current + 1 : current - 1;
        if (
          (direction === "forward" && next >= hoverFrameEnd) ||
          (direction === "reverse" && next <= 0)
        ) {
          setDirection("idle");
          return direction === "forward" ? hoverFrameEnd : 0;
        }
        return next;
      });
    }, 24);
    return () => window.clearInterval(timer);
  }, [direction]);

  return (
    <span
      className="flex size-full items-center justify-center"
      onMouseEnter={() => setDirection("forward")}
      onMouseLeave={() => setDirection("reverse")}
    >
      <img
        src={`/Icons/frames/${frameSet}/frame-${String(frame).padStart(2, "0")}.png`}
        alt=""
        className={cn("pointer-events-none object-contain", artClassName)}
        draggable={false}
      />
    </span>
  );
}

export default function DesktopApps({ onOpen }: { onOpen: (app: DesktopAppId) => void }) {
  const [openTools, setOpenTools] = useState<string | null>(null);
  const [orderedApps, setOrderedApps] = useState(apps);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [iconSize, setIconSize] = useState<IconSize>("large");

  useEffect(() => {
    const applyStoredSize = () => {
      const stored =
        document.documentElement.dataset.desktopIconSize ??
        window.localStorage.getItem("utoolity.icon-size");
      if (stored === "small" || stored === "medium" || stored === "large") {
        setIconSize(stored);
      }
    };
    applyStoredSize();
    window.addEventListener("utoolity:icon-size-changed", applyStoredSize);
    return () =>
      window.removeEventListener("utoolity:icon-size-changed", applyStoredSize);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("utoolity.desktop-app-order") ?? "null") as string[] | null;
      if (!saved) return;
      const byId = new Map(apps.map((app) => [app.id, app]));
      const restored = saved.map((id) => byId.get(id)).filter((app): app is DesktopApp => Boolean(app));
      setOrderedApps([...restored, ...apps.filter((app) => !saved.includes(app.id))]);
    } catch (error) {
      if (!(error instanceof SyntaxError) && !(error instanceof DOMException)) throw error;
    }
  }, []);

  const moveApp = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setOrderedApps((current) => {
      const next = [...current];
      const from = next.findIndex((app) => app.id === draggedId);
      const to = next.findIndex((app) => app.id === targetId);
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      localStorage.setItem("utoolity.desktop-app-order", JSON.stringify(next.map((app) => app.id)));
      return next;
    });
    setDraggedId(null);
  };

  return (
    <div className="desktop-app-grid absolute left-6 top-24 z-20 grid w-[190px] grid-cols-2 gap-3" data-desktop-interactive>
      {orderedApps.map((app) => {
        const dimensions = iconDimensions[iconSize];
        return (
          <div key={app.id} className="relative" draggable onDragStart={() => setDraggedId(app.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveApp(app.id)}>
            <button
              type="button"
              className={`desktop-app-icon group flex ${dimensions.button} flex-col items-center gap-2 rounded-2xl p-2 text-center ${dimensions.text} font-bold text-primary-foreground`}
              onClick={() => {
                if (app.tools) setOpenTools(openTools === app.id ? null : app.id);
                else if (app.route) onOpen(app.route);
              }}
            >
              <span className={cn("flex items-center justify-center rounded-full shadow-lg transition group-hover:-translate-y-0.5", dimensions.tile, app.iconClassName)}>
                <AnimatedIcon frameSet={app.frameSet} artClassName={dimensions.art} />
              </span>
              {app.label}
            </button>
            {openTools === app.id && app.tools && (
              <div className="absolute left-[100px] top-0 z-30 w-52 rounded-2xl border border-border bg-popover p-2 text-sm text-popover-foreground shadow-2xl">
                {app.tools.map((tool) => (
                  <button
                    key={tool.route}
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left font-semibold hover:bg-white/90"
                    onClick={() => onOpen(tool.route)}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
