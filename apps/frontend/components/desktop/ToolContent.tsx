"use client";

import Settings from "@/components/settings/Settings";
import FileManager from "@/components/files/FileManager";
import PolygonAnnotationPage from "@/app/tools/polygon-annotation/page";
import VideoConverterPage from "@/app/tools/video-converter/page";
import ImageConverterPage from "@/app/tools/image-converter/page";
import ImageClassificationPage from "@/app/tools/image-classification/page";
import VideoTrimPage from "@/app/tools/video-trim/page";
import VideoMergePage from "@/app/tools/video-merge/page";
import VideoToImagesPage from "@/app/tools/video-to-images/page";
import BoundingBoxPage from "@/app/tools/bounding-box/page";
import AugmentationPage from "@/app/tools/augmentation/page";
import Gallery from "@/components/files/Gallery";
import Notepad from "@/components/files/Notepad";

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
  files: "Files",
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

export default function ToolContent({ app, filePath, onOpenFile }: { app: DesktopAppId; filePath?: string; onOpenFile?: (path: string, type: "image" | "text") => void }) {
  switch (app) {
    case "files": return <FileManager onOpenFile={onOpenFile} />;
    case "settings": return <Settings />;
    case "polygon-annotation": return <PolygonAnnotationPage />;
    case "video-converter": return <VideoConverterPage />;
    case "image-converter": return <ImageConverterPage />;
    case "image-classification": return <ImageClassificationPage />;
    case "video-trim": return <VideoTrimPage />;
    case "video-merge": return <VideoMergePage />;
    case "video-to-images": return <VideoToImagesPage />;
    case "bounding-box": return <BoundingBoxPage />;
    case "augmentation": return <AugmentationPage />;
    case "gallery": return <Gallery />;
    case "notepad": return <Notepad initialPath={filePath} />;
  }
}
