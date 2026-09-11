"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/shadcn/tooltip";

const tools = [
  { href: "/tools/video-to-images", label: "Video to Images" },
  { href: "/tools/video-trim", label: "Video Trim" },
  { href: "/tools/video-converter", label: "Video Converter" },
  { href: "/tools/image-converter", label: "Image Converter" },
  { href: "/tools/image-classification", label: "Image Classification" },
  { href: "/tools/polygon-annotation", label: "Polygon Annotation" },
  { href: "/tools/bounding-box", label: "Bounding Box" },
  { href: "/tools/video-merge", label: "Video Merge" },
];

const Sidebar = () => {
  const pathname = usePathname();

  const activeIndex = tools.findIndex((t) => pathname === t.href);

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="fixed top-6 bottom-6 left-4 z-50 flex w-19 flex-col items-center overflow-visible rounded-full bg-foreground shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
      <nav className="relative flex w-full flex-col items-center">
        {activeIndex !== -1 && (
          <div
            className="pointer-events-none absolute top-0 left-0 z-0 h-14 w-full rounded-r-[28px] bg-background transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]"
            style={{
              transform: `translateY(${activeIndex * 56}px)`,
            }}
          >
            <div className="absolute -top-4.5 right-0 h-9 w-9 rounded-br-[36px] bg-foreground" />
            <div className="absolute -bottom-4.5 right-0 h-9 w-9 rounded-tr-[36px] bg-foreground" />
          </div>
        )}

        {tools.map((tool) => (
          <Tooltip key={tool.href}>
            <TooltipTrigger asChild>
              <Link
                href={tool.href}
                className="relative z-10 flex h-14 w-19 items-center justify-center"
              >
                <Icon
                  name="Icon1"
                  size={30}
                  className={
                    isActive(tool.href) ? "text-foreground" : "text-background"
                  }
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;