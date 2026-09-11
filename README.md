# Media Utility Tool

````markdown
## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm 8.15.0 or higher
- FFmpeg installed on your system (required for backend video/image processing)

Verify FFmpeg is installed:

```bash
ffmpeg -version
```

If not installed, download from https://ffmpeg.org/download.html and add it to your PATH.

### Step 1: Clone the Repository

```bash
git clone https://github.com/theharshalchaudhari/Utoolity.git
cd Utoolity
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Set Up Environment Variables

**Frontend** — create `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Backend** — create `apps/backend/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
```

### Step 4: Start Development Servers

Run both frontend and backend together:

```bash
pnpm dev
```

Or run them separately:

```bash
pnpm dev:frontend    # Frontend at http://localhost:3000
pnpm dev:backend     # Backend at http://localhost:5000
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

### Step 5: Access Your Assigned Tool

Navigate to your tool's route:

```
http://localhost:3000/tools/{your-tool-route}
```

| Task | Tool Name | Route Path |
|------|-----------|------------|
| Task 1 | Video to Images | `/tools/video-to-images` |
| Task 2 | Video Trim | `/tools/video-trim` |
| Task 3 | Video Format Converter | `/tools/video-converter` |
| Task 4 | Image Format Converter | `/tools/image-converter` |
| Task 5 | Image Separation/Classification | `/tools/image-classification` |
| Task 6 | Polygon ROI Annotation | `/tools/polygon-annotation` |
| Task 7 | Bounding Box Annotation | `/tools/bounding-box` |
| Task 8 | Video Merge | `/tools/video-merge` |

### Step 6: Production Build

```bash
pnpm build
pnpm start
```

---

## How to Use This README

### For Contributors

1. Read the entire README to understand the project structure and guidelines
2. Identify your assigned task from the Task Allocation section
3. Review the Component and File Ownership section for your specific tool
4. Follow the Development Guidelines when building your tool
5. Ensure all Required Features are implemented
6. Use theme variables throughout (no hardcoded colors)
7. Submit your work for review

### For AI Assistants

When providing assistance, follow this structure:

1. Ask which task number or tool name the user is working on
2. Provide guidance specific to that tool's components, hooks, and API files
3. Ensure all code follows the theme guidelines and file structure
4. Reference the appropriate route path and file locations
5. Verify implementation against the Required Features checklist
6. Confirm proper use of shadcn/ui components from `@repo/ui`
7. Ensure TypeScript types are properly defined
8. Remember: frontend uses `api/` (HTTP calls), backend uses `services/` (media processing)

## Project Overview

A comprehensive web-based media utility platform built with Next.js, TypeScript, and Tailwind CSS. This monorepo project consists of multiple video and image processing tools with a **separated frontend and backend architecture**.

- **Frontend** (`apps/frontend/`) — UI, state, user interactions. Calls the backend via HTTP.
- **Backend** (`apps/backend/`) — All media processing (FFmpeg, Sharp), file I/O, business logic.
- **Shared Packages** (`packages/`) — Theme, UI components, configs.

## Architecture Overview

### Responsibility Split (Read This First)

| Layer | Location | Job | Naming |
|-------|----------|-----|--------|
| Frontend UI | `apps/frontend/app/`, `apps/frontend/components/` | Render UI, handle user input | — |
| Frontend state | `apps/frontend/hooks/` | Manage state, call `api/` | `useXxx.ts` |
| Frontend HTTP | `apps/frontend/api/` | Call backend endpoints | `xxx.api.ts` |
| Backend routing | `apps/backend/src/routes/` | Map URL → controller | `xxx.routes.ts` |
| Backend HTTP | `apps/backend/src/controllers/` | Parse request, call service | `xxx.controller.ts` |
| Backend processing | `apps/backend/src/services/` | FFmpeg / Sharp / file I/O | `xxx.service.ts` |

**Rules to avoid confusion:**

- Frontend NEVER contains media processing logic.
- Backend NEVER renders UI.
- Frontend uses `api/` (not "services") for HTTP calls.
- Backend uses `services/` (not "api") for processing logic.

### Data Flow

```
User
  ↓
Frontend Component (components/<tool>/)
  ↓
Frontend Hook (hooks/useXxx.ts)
  ↓
Frontend API client (api/xxx.api.ts)  →  HTTP  →
                                        Backend Route (routes/xxx.routes.ts)
                                          ↓
                                        Backend Controller (controllers/xxx.controller.ts)
                                          ↓
                                        Backend Service (services/xxx.service.ts)  →  FFmpeg / Sharp
                                          ↓
                                        Response (JSON + file URL)
  ←  HTTP  ←
Frontend Hook updates state
  ↓
Frontend Component re-renders
```

## Repository Structure

```
apps/
├── frontend/                          # Next.js frontend (UI only)
│   │
│   ├── app/                           # Routes only - NO component logic
│   │   ├── (auth)/                    # Authentication routes
│   │   ├── dashboard/                 # Dashboard route
│   │   ├── tools/                     # All tool routes
│   │   │   ├── page.tsx               # Tools listing page
│   │   │   ├── video-to-images/page.tsx
│   │   │   ├── video-trim/page.tsx
│   │   │   ├── video-converter/page.tsx
│   │   │   ├── image-converter/page.tsx
│   │   │   ├── image-classification/page.tsx
│   │   │   ├── polygon-annotation/page.tsx
│   │   │   ├── bounding-box/page.tsx
│   │   │   └── video-merge/page.tsx
│   │   ├── admin/                     # Admin routes
│   │   ├── globals.css                # Global styles (imports theme)
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Landing page
│   │
│   ├── components/                    # All UI components
│   │   ├── shared/                    # Used by multiple tools
│   │   │   ├── navbar/Navbar.tsx
│   │   │   ├── sidebar/Sidebar.tsx
│   │   │   ├── file-upload/FileUpload.tsx
│   │   │   ├── loading/LoadingState.tsx
│   │   │   ├── error/ErrorState.tsx
│   │   │   └── empty-state/EmptyState.tsx
│   │   │
│   │   ├── video-to-images/           # Tool-specific components
│   │   ├── video-trim/
│   │   ├── video-converter/
│   │   ├── image-converter/
│   │   ├── image-classification/
│   │   ├── polygon-annotation/
│   │   ├── bounding-box/
│   │   └── video-merge/
│   │
│   ├── hooks/                         # One hook per tool
│   │   ├── useVideoToImages.ts
│   │   ├── useVideoTrim.ts
│   │   ├── useVideoConverter.ts
│   │   ├── useImageConverter.ts
│   │   ├── useImageClassification.ts
│   │   ├── usePolygonAnnotation.ts
│   │   ├── useBoundingBox.ts
│   │   ├── useVideoMerge.ts
│   │   └── useProcessingMode.ts
│   │
│   ├── api/                           # HTTP clients (one per tool)
│   │   ├── client.ts                  # Axios instance → backend
│   │   ├── auth.api.ts
│   │   ├── videoToImages.api.ts
│   │   ├── videoTrim.api.ts
│   │   ├── videoConverter.api.ts
│   │   ├── imageConverter.api.ts
│   │   ├── imageClassification.api.ts
│   │   ├── polygonAnnotation.api.ts
│   │   ├── boundingBox.api.ts
│   │   └── videoMerge.api.ts
│   │
│   ├── lib/                           # Utilities and configuration
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   ├── routes.ts
│   │   └── config.ts
│   │
│   ├── types/                         # TypeScript types
│   │   ├── common.ts
│   │   ├── user.ts
│   │   ├── tool.ts
│   │   └── activity.ts
│   │
│   ├── public/                        # Static assets
│   │
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── components.json                # shadcn/ui configuration
│   └── .env.example
│
└── backend/                           # Express + TypeScript API
    │
    ├── src/
    │   │
    │   ├── routes/                    # URL → controller mapping
    │   │   ├── auth.routes.ts
    │   │   ├── videoToImages.routes.ts
    │   │   ├── videoTrim.routes.ts
    │   │   ├── videoConverter.routes.ts
    │   │   ├── imageConverter.routes.ts
    │   │   ├── imageClassification.routes.ts
    │   │   ├── polygonAnnotation.routes.ts
    │   │   ├── boundingBox.routes.ts
    │   │   └── videoMerge.routes.ts
    │   │
    │   ├── controllers/               # HTTP request → service
    │   │   ├── videoToImages.controller.ts
    │   │   ├── videoTrim.controller.ts
    │   │   ├── videoConverter.controller.ts
    │   │   ├── imageConverter.controller.ts
    │   │   ├── imageClassification.controller.ts
    │   │   ├── polygonAnnotation.controller.ts
    │   │   ├── boundingBox.controller.ts
    │   │   └── videoMerge.controller.ts
    │   │
    │   ├── services/                  # Actual media processing
    │   │   ├── videoToImages.service.ts
    │   │   ├── videoTrim.service.ts
    │   │   ├── videoConverter.service.ts
    │   │   ├── imageConverter.service.ts
    │   │   ├── imageClassification.service.ts
    │   │   ├── polygonAnnotation.service.ts
    │   │   ├── boundingBox.service.ts
    │   │   └── videoMerge.service.ts
    │   │
    │   ├── middleware/
    │   │   ├── auth.middleware.ts
    │   │   ├── upload.middleware.ts   # Multer config
    │   │   └── error.middleware.ts
    │   │
    │   ├── utils/
    │   │   ├── ffmpeg.ts
    │   │   ├── fileUtils.ts
    │   │   └── logger.ts
    │   │
    │   ├── types/
    │   │   └── index.ts
    │   │
    │   ├── config/
    │   │   └── index.ts
    │   │
    │   ├── app.ts                     # Express app setup
    │   └── server.ts                  # Entry point
    │
    ├── uploads/                       # Temp uploads (gitignored)
    ├── outputs/                       # Processed files (gitignored)
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

## Packages Structure

```
packages/
├── theme/                  # Theme package
│   ├── theme.css          # Theme variables (colors, shadows, fonts)
│   ├── custom.css         # Custom overrides
│   └── package.json
│
├── ui/                     # Shared UI components
│   ├── index.ts
│   ├── shadcn/            # shadcn/ui components (shared across apps)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── progress.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── tooltip.tsx
│   │   └── sonner.tsx
│   ├── shared/            # Shared components
│   ├── lib/
│   │   └── utils.ts       # Re-exports cn from the cn package
│   └── package.json
│
└── config/
    ├── eslint-config/
    └── typescript-config/
        ├── base.json
        ├── nextjs.json
        ├── react-library.json
        └── package.json
```

## The `cn` Utility

The project uses the official [`cn`](https://www.npmjs.com/package/cn) package for merging Tailwind class names. It replaces the older `clsx` + `tailwind-merge` combo.

**Import it directly:**

```tsx
import { cn } from "cn";

<div className={cn("px-4", isActive && "bg-primary")} />
```

**Or via `@repo/ui`** (for backwards compatibility):

```tsx
import { cn } from "@repo/ui/lib/utils";
```

`packages/ui/lib/utils.ts` is just a one-line re-export:

```ts
export { cn } from "cn";
```

Any package that imports `cn` directly must list it in its own `package.json`:

```json
{
  "dependencies": {
    "cn": "catalog:"
  }
}
```

`cn` is version-pinned in `pnpm-workspace.yaml` under the catalog (currently `0.2.6`).

## Adding New shadcn/ui Components

All shared shadcn/ui components live in `packages/ui/shadcn/` so they can be reused across apps.

### Step 1: Run shadcn CLI from `packages/ui`

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name>
```

Example — add tooltip:

```bash
cd packages/ui
pnpm dlx shadcn@latest add tooltip
```

> **Important:** Use `pnpm dlx`, not `pnpm exec`. `exec` only runs locally installed binaries; `dlx` fetches and runs the package temporarily (like `npx`).

shadcn reads `packages/ui/components.json` and creates `packages/ui/shadcn/tooltip.tsx`.

### Step 2: Verify the `cn` import

The generated file uses:

```tsx
import { cn } from "cn";
```

This resolves because `cn` is a dependency of `@repo/ui`. Leave it as-is.

### Step 3: Export from the package entry

In `packages/ui/index.ts`:

```ts
export * from "./shadcn/tooltip";
```

### Step 4: Ensure `packages/ui/package.json` exposes the subpath

```json
{
  "name": "@repo/ui",
  "exports": {
    ".": "./index.ts",
    "./shadcn/*": "./shadcn/*.tsx",
    "./shared/*": "./shared/*.tsx",
    "./lib/*": "./lib/*.ts"
  }
}
```

### Step 5: Consume from any app

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/shadcn/tooltip";
```

### Step 6: Install

From repo root:

```bash
pnpm install
```

## Theme and Styling

All components must use theme variables from the `@repo/theme` package. Hardcoded colors are strictly prohibited.

### Available Theme Variables

| Variable | Usage | Example |
|----------|-------|---------|
| background | Page background | `bg-background` |
| foreground | Text color | `text-foreground` |
| primary | Primary actions/buttons | `bg-primary` |
| primary-foreground | Text on primary | `text-primary-foreground` |
| secondary | Secondary elements | `bg-secondary` |
| secondary-foreground | Text on secondary | `text-secondary-foreground` |
| muted | Muted backgrounds | `bg-muted` |
| muted-foreground | Muted text | `text-muted-foreground` |
| accent | Accent elements | `bg-accent` |
| accent-foreground | Text on accent | `text-accent-foreground` |
| border | Borders | `border-border` |
| card | Card backgrounds | `bg-card` |
| card-foreground | Text on card | `text-card-foreground` |
| popover | Popover backgrounds | `bg-popover` |
| popover-foreground | Text on popover | `text-popover-foreground` |
| destructive | Destructive actions | `bg-destructive` |
| destructive-foreground | Text on destructive | `text-destructive-foreground` |
| ring | Focus rings | `ring-ring` |
| input | Input fields | `bg-input` |

### Correct Theme Usage Example

```tsx
<div className="bg-background text-foreground border border-border">
  <h1 className="text-foreground">Welcome</h1>
  <button className="bg-primary text-primary-foreground hover:bg-primary/90">
    Click Me
  </button>
  <p className="text-muted-foreground">Helper text</p>
</div>
```

### Incorrect Hardcoded Colors Example

```tsx
<div className="bg-white text-black border border-gray-300">
  <h1 className="text-black">Welcome</h1>
  <button className="bg-blue-500 text-white hover:bg-blue-600">
    Click Me
  </button>
  <p className="text-gray-500">Helper text</p>
</div>
```

### Typography

All text must use the Poppins font family, which is enforced through the theme and custom.css overrides.

## Task Allocation

### Tool Routes and Responsibilities

| Task | Tool Name | Route Path |
|------|-----------|------------|
| Task 1 | Video to Images | `/tools/video-to-images` |
| Task 2 | Video Trim | `/tools/video-trim` |
| Task 3 | Video Format Converter | `/tools/video-converter` |
| Task 4 | Image Format Converter | `/tools/image-converter` |
| Task 5 | Image Separation/Classification | `/tools/image-classification` |
| Task 6 | Polygon ROI Annotation | `/tools/polygon-annotation` |
| Task 7 | Bounding Box Annotation | `/tools/bounding-box` |
| Task 8 | Video Merge | `/tools/video-merge` |

### Component and File Ownership

Each tool has exactly **three frontend files** (page, hook, API client) plus its components, and **three backend files** (route, controller, service). No overlaps, no duplication.

#### Task 1: Video to Images

**Frontend:**
- Route: `apps/frontend/app/tools/video-to-images/page.tsx`
- Components: `apps/frontend/components/video-to-images/`
  - `VideoUploader.tsx`
  - `ExtractionSettings.tsx`
  - `FramePreview.tsx`
  - `ProcessingProgress.tsx`
- Hook: `apps/frontend/hooks/useVideoToImages.ts`
- API client: `apps/frontend/api/videoToImages.api.ts`

**Backend:**
- Route: `apps/backend/src/routes/videoToImages.routes.ts`
- Controller: `apps/backend/src/controllers/videoToImages.controller.ts`
- Service: `apps/backend/src/services/videoToImages.service.ts`

#### Task 2: Video Trim

**Frontend:**
- Route: `apps/frontend/app/tools/video-trim/page.tsx`
- Components: `apps/frontend/components/video-trim/`
  - `VideoUploader.tsx`
  - `TrimControls.tsx`
  - `TimeSelector.tsx`
  - `TrimProgress.tsx`
- Hook: `apps/frontend/hooks/useVideoTrim.ts`
- API client: `apps/frontend/api/videoTrim.api.ts`

**Backend:**
- Route: `apps/backend/src/routes/videoTrim.routes.ts`
- Controller: `apps/backend/src/controllers/videoTrim.controller.ts`
- Service: `apps/backend/src/services/videoTrim.service.ts`

#### Task 3: Video Format Converter

**Frontend:**
- Route: `apps/frontend/app/tools/video-converter/page.tsx`
- Components: `apps/frontend/components/video-converter/`
  - `VideoUploader.tsx`
  - `ConversionSettings.tsx`
  - `ConversionProgress.tsx`
- Hook: `apps/frontend/hooks/useVideoConverter.ts`
- API client: `apps/frontend/api/videoConverter.api.ts`

**Backend:**
- Route: `apps/backend/src/routes/videoConverter.routes.ts`
- Controller: `apps/backend/src/controllers/videoConverter.controller.ts`
- Service: `apps/backend/src/services/videoConverter.service.ts`

#### Task 4: Image Format Converter

**Frontend:**
- Route: `apps/frontend/app/tools/image-converter/page.tsx`
- Components: `apps/frontend/components/image-converter/`
  - `ImageUploader.tsx`
  - `ConversionSettings.tsx`
  - `ConversionSummary.tsx`
- Hook: `apps/frontend/hooks/useImageConverter.ts`
- API client: `apps/frontend/api/imageConverter.api.ts`

**Backend:**
- Route: `apps/backend/src/routes/imageConverter.routes.ts`
- Controller: `apps/backend/src/controllers/imageConverter.controller.ts`
- Service: `apps/backend/src/services/imageConverter.service.ts`

#### Task 5: Image Separation/Classification

**Frontend:**
- Route: `apps/frontend/app/tools/image-classification/page.tsx`
- Components: `apps/frontend/components/image-classification/`
  - `ImageViewer.tsx`
  - `ClassificationControls.tsx`
  - `FolderManager.tsx`
  - `ClassificationSummary.tsx`
- Hook: `apps/frontend/hooks/useImageClassification.ts`
- API client: `apps/frontend/api/imageClassification.api.ts`

**Backend:**
- Route: `apps/backend/src/routes/imageClassification.routes.ts`
- Controller: `apps/backend/src/controllers/imageClassification.controller.ts`
- Service: `apps/backend/src/services/imageClassification.service.ts`

#### Task 6: Polygon ROI Annotation

**Frontend:**
- Route: `apps/frontend/app/tools/polygon-annotation/page.tsx`
- Components: `apps/frontend/components/polygon-annotation/`
  - `AnnotationCanvas.tsx`
  - `PolygonToolbar.tsx`
  - `PolygonList.tsx`
  - `ClassSelector.tsx`
- Hook: `apps/frontend/hooks/usePolygonAnnotation.ts`
- API client: `apps/frontend/api/polygonAnnotation.api.ts`

**Backend:**
- Route: `apps/backend/src/routes/polygonAnnotation.routes.ts`
- Controller: `apps/backend/src/controllers/polygonAnnotation.controller.ts`
- Service: `apps/backend/src/services/polygonAnnotation.service.ts`

#### Task 7: Bounding Box Annotation

**Frontend:**
- Route: `apps/frontend/app/tools/bounding-box/page.tsx`
- Components: `apps/frontend/components/bounding-box/`
  - `AnnotationCanvas.tsx`
  - `BoundingBoxToolbar.tsx`
  - `LabelControls.tsx`
  - `BoundingBoxList.tsx`
- Hook: `apps/frontend/hooks/useBoundingBox.ts`
- API client: `apps/frontend/api/boundingBox.api.ts`

**Backend:**
- Route: `apps/backend/src/routes/boundingBox.routes.ts`
- Controller: `apps/backend/src/controllers/boundingBox.controller.ts`
- Service: `apps/backend/src/services/boundingBox.service.ts`

#### Task 8: Video Merge

**Frontend:**
- Route: `apps/frontend/app/tools/video-merge/page.tsx`
- Components: `apps/frontend/components/video-merge/`
  - `VideoUploader.tsx`
  - `VideoList.tsx`
  - `VideoMetadata.tsx`
  - `MergeControls.tsx`
  - `MergeProgress.tsx`
- Hook: `apps/frontend/hooks/useVideoMerge.ts`
- API client: `apps/frontend/api/videoMerge.api.ts`

**Backend:**
- Route: `apps/backend/src/routes/videoMerge.routes.ts`
- Controller: `apps/backend/src/controllers/videoMerge.controller.ts`
- Service: `apps/backend/src/services/videoMerge.service.ts`

## Development Guidelines

### Frontend — UI Components

- Use shadcn/ui components from `@repo/ui` whenever possible
- Shared components → `apps/frontend/components/shared/`
- Tool-specific components → `apps/frontend/components/{tool-name}/`
- When you need a new shadcn component, add it via `packages/ui` (see "Adding New shadcn/ui Components"), not inside the frontend app

### Frontend — Pages

- Pages assemble components only. No logic.
- One `page.tsx` per route.

```tsx
// apps/frontend/app/tools/video-merge/page.tsx
import VideoUploader from "@/components/video-merge/VideoUploader";
import VideoList from "@/components/video-merge/VideoList";
import MergeControls from "@/components/video-merge/MergeControls";

export default function VideoMergePage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Video Merge Tool</h1>
      <VideoUploader />
      <VideoList />
      <MergeControls />
    </div>
  );
}
```

### Frontend — Sidebar (with Tooltips)

The sidebar uses `Tooltip` from `@repo/ui` to show tool names on hover.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
            style={{ transform: `translateY(${activeIndex * 56}px)` }}
          >
            <div className="absolute -top-4.5 right-0 h-9 w-9 rounded-br-[36px] bg-foreground" />
            <div className="absolute -bottom-4.5 right-0 h-9 w-9 rounded-tr-[36px] bg-foreground" />
          </div>
        )}

        <TooltipProvider delayDuration={200}>
          {tools.map((tool) => (
            <Tooltip key={tool.href}>
              <TooltipTrigger asChild>
                <Link
                  href={tool.href}
                  className="relative z-10 flex h-14 w-19 items-center justify-center"
                >
                  <Icon
                    name="Icon1"
                    size={23}
                    className={
                      isActive(tool.href)
                        ? "text-foreground"
                        : "text-background"
                    }
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                {tool.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>
    </aside>
  );
};

export default Sidebar;
```

### Frontend — Hooks

- One hook per tool. Manages state. Calls the tool's API client. Returns state + actions.

```ts
// apps/frontend/hooks/useVideoMerge.ts
import { useState, useCallback } from "react";
import { videoMergeApi } from "@/api/videoMerge.api";

export function useVideoMerge() {
  const [videos, setVideos] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState(0);

  const mergeVideos = useCallback(async () => {
    setIsMerging(true);
    try {
      await videoMergeApi.merge(videos, {});
    } finally {
      setIsMerging(false);
    }
  }, [videos]);

  return { videos, isMerging, progress, mergeVideos, setVideos };
}
```

### Frontend — API Clients

- One API client per tool.
- Only job: send HTTP request to backend, return parsed response.
- No state, no processing, no business logic.

```ts
// apps/frontend/api/videoMerge.api.ts
import { api } from "./client";

export const videoMergeApi = {
  async merge(videos: File[], settings: Record<string, unknown>) {
    const formData = new FormData();
    videos.forEach((v) => formData.append("videos", v));
    formData.append("settings", JSON.stringify(settings));

    const { data } = await api.post("/tools/video-merge", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async getStatus(jobId: string) {
    const { data } = await api.get(`/tools/video-merge/status/${jobId}`);
    return data;
  },
};
```

### Frontend — Shared API Client

```ts
// apps/frontend/api/client.ts
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});
```

### Backend — Routes

- One route file per tool. Maps URL → controller. Nothing else.

```ts
// apps/backend/src/routes/videoMerge.routes.ts
import { Router } from "express";
import { upload } from "../middleware/upload.middleware";
import * as controller from "../controllers/videoMerge.controller";

const router = Router();

router.post("/", upload.array("videos"), controller.merge);
router.get("/status/:jobId", controller.getStatus);

export default router;
```

### Backend — Controllers

- Parse HTTP request → call service → send response.
- No processing logic here.

```ts
// apps/backend/src/controllers/videoMerge.controller.ts
import { Request, Response } from "express";
import * as service from "../services/videoMerge.service";

export async function merge(req: Request, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    const settings = JSON.parse(req.body.settings);
    const result = await service.merge(files, settings);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function getStatus(req: Request, res: Response) {
  const status = await service.getStatus(req.params.jobId);
  res.json(status);
}
```

### Backend — Services

- Actual media processing lives here: FFmpeg, Sharp, file I/O.
- No HTTP awareness — takes plain inputs, returns plain outputs.

```ts
// apps/backend/src/services/videoMerge.service.ts
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import { v4 as uuid } from "uuid";

export async function merge(files: Express.Multer.File[], settings: unknown) {
  const jobId = uuid();
  const outputPath = path.join(__dirname, "../../outputs", `${jobId}.mp4`);
  // FFmpeg concat logic here
  return { jobId, outputPath, status: "processing" };
}

export async function getStatus(jobId: string) {
  return { jobId, status: "completed" };
}
```

### Backend — App Setup

```ts
// apps/backend/src/app.ts
import express from "express";
import cors from "cors";
import videoMergeRoutes from "./routes/videoMerge.routes";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

app.use("/api/tools/video-merge", videoMergeRoutes);

export default app;
```

### Backend — TypeScript Config Notes

- `apps/backend/tsconfig.json` must set `outDir: "./dist"` and `rootDir: "./src"` so compiled `.js` files land in `dist/`, not next to the `.ts` sources.
- `packages/config/typescript-config/base.json` sets `declaration: false` and `declarationMap: false`. If a package ever needs `.d.ts` files, override both together in that package's tsconfig — setting only one triggers a TS error.
- The backend `start` script points to `dist/server.js`.
- The backend `dev` script uses `tsx watch src/server.ts` (no build step needed in dev).

### Backend — Monorepo Build Notes

- Running `turbo build` compiles each package. The backend emits into `dist/`, the frontend builds `.next/`.
- Never commit compiled `.js` files inside `src/`. Add these to `.gitignore`:
  ```
  dist/
  uploads/
  outputs/
  .env
  *.js
  *.js.map
  !*.config.js
  ```
- If a `.js` file accidentally appears next to a `.ts` source (because `outDir` was missing), delete it and rebuild.

## Required Features

### All Tools Must Include

- File upload with drag and drop support
- Progress bar showing processing status
- Clear success and error messages with toast notifications
- Theme-aware styling with no hardcoded colors
- Responsive design compatible with mobile devices
- Loading states during processing
- Error handling with user-friendly messages
- Backend API integration with proper error responses

### Tool-Specific Features

#### Task 1: Video to Images

- Upload single or multiple videos
- Extract every Nth frame
- Extract by total frame count
- Progress bar with total images count
- Output folder selection
- Preview first extracted frame (bonus)
- Resize images option (bonus)

#### Task 2: Video Trim

- Upload video(s)
- Start time input (HH:MM:SS)
- End time input (HH:MM:SS)
- Display video duration
- Support multiple format videos
- Multiple time segments (bonus)
- Preview cropped clip (bonus)
- Merge multiple trimmed clips (bonus)

#### Task 3: Video Format Converter

- Upload single or multiple videos
- Display input format
- Convert to MP4
- Conversion progress tracking
- Error handling for unsupported formats
- H.264 support
- Resolution selection (720p/1080p) (bonus)
- Compression option (bonus)

#### Task 4: Image Format Converter

- Upload images or folder
- Output folder selection
- Display total images count
- Display successfully converted count
- Quality slider (bonus)
- Resize option (bonus)

#### Task 5: Image Classification

- Image viewer with scroll support
- Classification controls
- Create multiple folders
- Final count per folder
- Undo last operation (bonus)
- CSV/TXT report download (bonus)

#### Task 6: Polygon Annotation

- Draw polygon ROI on images
- Multiple polygons per image
- Edit polygon vertices
- Delete polygon
- Duplicate polygon
- Undo/Redo actions
- Multiple polygon classes
- Save coordinates (pixel and normalized)
- Zoom and pan support
- Keyboard shortcuts (bonus)
- Copy polygon to next image (bonus)

#### Task 7: Bounding Box Annotation

- Draw bounding boxes on images or videos
- Resize bounding box
- Move bounding box
- Delete bounding box
- Multiple bounding boxes per image
- Choose bounding box color
- Add custom text/label
- Choose text color
- Choose line thickness

#### Task 8: Video Merge

- Upload 2 or more videos
- Support multiple formats (MP4, AVI, MOV, MKV, WMV, FLV, WEBM, MPEG, M4V, TS)
- Drag and drop reordering
- Display video information (duration, resolution, FPS, format)
- Output folder selection
- H.264 (MP4) output
- Handle different resolutions and frame rates
- Merge progress tracking

## Important Rules

### Required Practices

- Use theme variables for all colors
- Use Poppins font for all text
- Use shadcn/ui components from `@repo/ui`
- Use `cn` from the `cn` package for class merging
- Keep `app/` folder for routes only
- Place components in `components/` folder
- Follow the defined file structure
- Create one hook per tool (`hooks/`)
- Create one API client per tool (`api/`)
- Create one route, controller, and service per tool (backend)
- Use TypeScript for type safety
- Keep frontend and backend logic separated
- All media processing must happen in the backend
- Add new shadcn components via `packages/ui`, never directly in the frontend

### Prohibited Practices

- Hardcoding colors
- Using fonts other than Poppins
- Adding component logic in `app/` folder
- Creating nested routes for tools
- Duplicating shared components
- Writing inline styles
- Ignoring error handling
- Skipping loading states
- Performing FFmpeg/Sharp processing in the frontend
- Calling `fetch` directly from components (use `api/`)
- Putting processing logic in controllers (use `services/`)
- Committing compiled `.js` files from `src/`
- Rebuilding `clsx` + `tailwind-merge` locally (use the `cn` package)

## UI and UX Guidelines

### Color Usage

| Element | Class | Description |
|---------|-------|-------------|
| Page Background | `bg-background` | Main page background |
| Text | `text-foreground` | Primary text color |
| Subtle Text | `text-muted-foreground` | Secondary or helper text |
| Primary Buttons | `bg-primary text-primary-foreground` | Main action buttons |
| Secondary Buttons | `bg-secondary text-secondary-foreground` | Alternative buttons |
| Cards | `bg-card text-card-foreground border-border` | Content containers |
| Inputs | `border-input bg-background` | Form inputs |
| Borders | `border-border` | Divider lines |
| Destructive | `bg-destructive text-destructive-foreground` | Delete or remove actions |
| Focus Rings | `ring-ring` | Keyboard focus indicator |

### Component Usage

| Need | Use This |
|------|----------|
| Button | `@repo/ui/shadcn/button` |
| Card | `@repo/ui/shadcn/card` |
| Input | `@repo/ui/shadcn/input` |
| Dialog | `@repo/ui/shadcn/dialog` |
| Dropdown | `@repo/ui/shadcn/dropdown-menu` |
| Progress | `@repo/ui/shadcn/progress` |
| Select | `@repo/ui/shadcn/select` |
| Tabs | `@repo/ui/shadcn/tabs` |
| Tooltip | `@repo/ui/shadcn/tooltip` |
| Toast | `@repo/ui/shadcn/sonner` |

## API Integration

### Backend Endpoints

All endpoints served by the backend at `http://localhost:5000/api`:

```
POST /api/tools/video-to-images
POST /api/tools/video-trim
POST /api/tools/video-converter
POST /api/tools/image-converter
POST /api/tools/image-classification
POST /api/tools/polygon-annotation
POST /api/tools/bounding-box
POST /api/tools/video-merge
```

## Submission Requirements

Each submission must include:

- Working UI component
- Clean and readable code
- All required features implemented
- Proper theme usage throughout
- Error handling with user-friendly messages
- TypeScript types defined for all props and state
- Backend route, controller, and service for the assigned tool
- Frontend hook and API client for the assigned tool

## Support

For questions or clarification:

- Review the README.md in each package
- Check the `@repo/ui` for available components
- Check the `@repo/theme` for available styles
- Request clarification before starting development

---

**Media Utility Tool**
````