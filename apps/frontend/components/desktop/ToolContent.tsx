"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export type DesktopAppId =
  | "files"
  | "settings"
  | "polygon-annotation"
  | "video-converter"
  | "image-converter"
  | "image-classification"
  | "video-trim"
  | "video-merge"
  | "video-to-images"
  | "bounding-box"
  | "augmentation"
  | "gallery"
  | "notepad";

export const appTitles: Record<DesktopAppId, string> = {
  files: "File Manager",
  settings: "Settings",
  "polygon-annotation": "Polygon Annotation",
  "video-converter": "Video Converter",
  "image-converter": "Image Converter",
  "image-classification": "Image Classification",
  "video-trim": "Video Trim",
  "video-merge": "Video Merge",
  "video-to-images": "Video to Images",
  "bounding-box": "Bounding Box",
  augmentation: "Augmentation",
  gallery: "Gallery",
  notepad: "Notepad",
};

const toolComponents: Record<
  DesktopAppId,
  ComponentType<{ filePath?: string; onOpenFile?: (path: string, type: "image" | "text") => void }>
> = {
  files: dynamic(() => import("@/components/files/FileManager")),
  settings: dynamic(() => import("@/components/settings/Settings")),
  "polygon-annotation": dynamic(() => import("@/components/polygon-annotation/PolygonAnnotationStudio")),
  "video-converter": dynamic(() => import("@/app/tools/video-converter/page")),
  "image-converter": dynamic(() => import("@/app/tools/image-converter/page")),
  "image-classification": dynamic(() => import("@/app/tools/image-classification/page")),
  "video-trim": dynamic(() => import("@/app/tools/video-trim/page")),
  "video-merge": dynamic(() => import("@/app/tools/video-merge/page")),
  "video-to-images": dynamic(() => import("@/app/tools/video-to-images/page")),
  "bounding-box": dynamic(() => import("@/components/bounding-box/BoundingBoxStudio")),
  augmentation: dynamic(() => import("@/app/tools/augmentation/page")),
  gallery: dynamic(() => import("@/components/files/Gallery")),
  notepad: dynamic(() => import("@/components/files/Notepad")),
};

export default function ToolContent({
  app,
  filePath,
  onOpenFile,
}: {
  app: DesktopAppId;
  filePath?: string;
  onOpenFile?: (path: string, type: "image" | "text") => void;
}) {
  const ActiveTool = toolComponents[app];
  return <ActiveTool filePath={filePath} onOpenFile={onOpenFile} />;
}
