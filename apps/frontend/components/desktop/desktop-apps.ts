import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Clapperboard,
  Image as ImageIcon,
  MessageCircle,
  ScanLine,
  Scissors,
  Video,
  FileVideo,
  Images,
  Tags,
  Scan,
  FolderKanban,
  Settings2,
  Sparkles,
} from "lucide-react";

export type ToolApp = {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  description: string;
};

export type DesktopCategory = {
  id: string;
  name: string;
  icon: LucideIcon;
  tone: "blue" | "violet" | "green" | "orange" | "slate";
  description: string;
  apps: ToolApp[];
};

export const desktopCategories: DesktopCategory[] = [
  {
    id: "annotation",
    name: "Annotation",
    icon: ScanLine,
    tone: "blue",
    description: "Label images and prepare training datasets.",
    apps: [
      {
        id: "polygon-annotation",
        name: "Polygon Annotation",
        path: "/tools/polygon-annotation",
        icon: ScanLine,
        description: "Create polygon masks and labels.",
      },
      {
        id: "bounding-box",
        name: "Bounding Box",
        path: "/tools/bounding-box",
        icon: Scan,
        description: "Draw and edit object bounding boxes.",
      },
    ],
  },
  {
    id: "video",
    name: "Video",
    icon: Clapperboard,
    tone: "violet",
    description: "Convert, trim and combine video files.",
    apps: [
      {
        id: "video-to-images",
        name: "Video to Images",
        path: "/tools/video-to-images",
        icon: Images,
        description: "Extract frames from video files.",
      },
      {
        id: "video-trim",
        name: "Video Trim",
        path: "/tools/video-trim",
        icon: Scissors,
        description: "Trim clips to the required duration.",
      },
      {
        id: "video-converter",
        name: "Video Converter",
        path: "/tools/video-converter",
        icon: Video,
        description: "Convert video formats.",
      },
      {
        id: "video-merge",
        name: "Video Merge",
        path: "/tools/video-merge",
        icon: FileVideo,
        description: "Combine multiple video clips.",
      },
    ],
  },
  {
    id: "image",
    name: "Image",
    icon: ImageIcon,
    tone: "green",
    description: "Convert and manage image datasets.",
    apps: [
      {
        id: "image-converter",
        name: "Image Converter",
        path: "/tools/image-converter",
        icon: ImageIcon,
        description: "Convert image formats and files.",
      },
      {
        id: "image-classification-shortcut",
        name: "Image Classification",
        path: "/tools/image-classification",
        icon: Tags,
        description: "Classify images into dataset labels.",
      },
      {
        id: "augmentation",
        name: "Augmentation",
        path: "/tools/augmentation",
        icon: Sparkles,
        description: "Generate augmented image datasets.",
      },
    ],
  },
  {
    id: "Roi",
    name: "Roi",
    icon: ScanLine,
    tone: "blue",
    description: "Configure Roi.",
    apps: [
      {
        id: "roi-tool",
        name: "Roi Tool",
        path: "/tools/roi-tool",
        icon: ScanLine,
        description: "Configure and manage regions of interest.",
      }
    ],
  },
  {
    id: "chat",
    name: "Chat",
    icon: MessageCircle,
    tone: "orange",
    description: "Open the Utoolity assistant.",
    apps: [
      {
        id: "chat-assistant",
        name: "Chat",
        path: "/chat",
        icon: MessageCircle,
        description: "Chat with the Utoolity assistant.",
      },
    ],
  },
  {
    id: "other",
    name: "Other",
    icon: Boxes,
    tone: "slate",
    description: "More utilities and workspace tools.",
    apps: [
      {
        id: "workspace-tools",
        name: "Workspace",
        path: "/",
        icon: FolderKanban,
        description: "Return to the desktop workspace.",
      },
      {
        id: "settings",
        name: "Settings",
        path: "/settings",
        icon: Settings2,
        description: "Manage your profile and preferences.",
      },
    ],
  },
];