"use client";

import { motion } from "framer-motion";
import { X, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@repo/ui/shadcn/tooltip";

const tools = [
  { name: "Chat", href: "/chat", icon: "/logo/chat.svg", scale: 1 },
  { name: "Video to Images", href: "/tools/video-to-images", icon: "/logo/video_to_image.svg", scale: 1.17 },
  { name: "Video Trim", href: "/tools/video-trim", icon: "/logo/video_trim.svg", scale: 1 },
  { name: "Video Converter", href: "/tools/video-converter", icon: "/logo/video_convert.svg", scale: 1 },
  { name: "Image Converter", href: "/tools/image-converter", icon: "/logo/img_convert.svg", scale: 1 },
  { name: "Image Classification", href: "/tools/image-classification", icon: "/logo/img_classification.svg", scale: 1.1 },
  { name: "Polygon Annotation", href: "/tools/polygon-annotation", icon: "/logo/polygon_annotation.svg", scale: 0.9 },
  { name: "Bounding Box", href: "/tools/bounding-box", icon: "/logo/bounding_box.svg", scale: 0.9 },
  { name: "Video Merge", href: "/tools/video-merge", icon: "/logo/video_merge.svg", scale: 0.95 },
];

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="fixed bottom-5 left-4 top-5 z-50 flex flex-col items-start gap-2">
        <motion.div
          animate={{ width: collapsed ? 64 : 240 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-14 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-background/10 bg-foreground shadow-lg"
        >
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="group absolute left-0 top-0 flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)]"
          >
            <span
              className="h-10 w-10 shrink-0 bg-background transition-colors duration-200 group-hover:bg-primary"
              style={{
                mask: "url(/logo/cms_logo.svg) center / contain no-repeat",
                WebkitMask: "url(/logo/cms_logo.svg) center / contain no-repeat",
                transform: "scale(1)",
              }}
            />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-background transition-colors duration-200 hover:text-primary"
            style={{
              opacity: collapsed ? 0 : 1,
              pointerEvents: collapsed ? "none" : "auto",
            }}
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </motion.div>

        <motion.div
          animate={{ width: collapsed ? 64 : 240 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-background/10 bg-foreground shadow-lg"
        >
          <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-5">
            <div className="space-y-2">
              {tools.map((tool) => {
                const link = (
                  <Link
                    href={tool.href}
                    className="group relative flex h-11 w-full items-center text-background transition-colors duration-200 hover:text-primary"
                  >
                    <span
                      className="absolute left-3 h-9 w-10 shrink-0 bg-background transition-colors duration-200 group-hover:bg-primary"
                      style={{
                        mask: `url(${tool.icon}) center / contain no-repeat`,
                        WebkitMask: `url(${tool.icon}) center / contain no-repeat`,
                        transform: `scale(${tool.scale})`,
                      }}
                    />

                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.18, delay: 0.24 }}
                        className="absolute left-[60px] whitespace-nowrap text-sm font-semibold"
                      >
                        {tool.name}
                      </motion.span>
                    )}
                  </Link>
                );

                return collapsed ? (
                  <Tooltip key={tool.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>
                      {tool.name}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div key={tool.href}>{link}</div>
                );
              })}
            </div>
          </nav>

          <div className="shrink-0 border-t border-background/10 px-2 py-3">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/profile"
                    className="group relative flex h-11 w-full items-center text-background transition-colors duration-200 hover:text-primary"
                  >
                    <UserRound
                      className="absolute left-3 h-6 w-6 shrink-0"
                      strokeWidth={1.5}
                    />
                  </Link>
                </TooltipTrigger>

                <TooltipContent side="right" sideOffset={10}>
                  Profile
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/profile"
                className="group relative flex h-11 w-full items-center text-background transition-colors duration-200 hover:text-primary"
              >
                <UserRound
                  className="absolute left-3 h-6 w-6 shrink-0"
                  strokeWidth={1.5}
                />

                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18, delay: 0.24 }}
                  className="absolute left-[60px] whitespace-nowrap text-sm font-semibold"
                >
                  Profile
                </motion.span>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}

export default Sidebar;