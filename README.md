# Media Utility Tool

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm 8.15.0 or higher

### Step 1: Clone the Repository

```bash
git clone https://github.com/theharshalchaudhari/Utoolity.git
cd Utoolity
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Start Development Server

```bash
pnpm dev
```

Your application will be available at: `http://localhost:3000`

### Step 4: Access Your Assigned Tool

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

### Step 5: Production Build

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
2. Provide guidance specific to that tool's components, hooks, and services
3. Ensure all code follows the theme guidelines and file structure
4. Reference the appropriate route path and file locations
5. Verify implementation against the Required Features checklist
6. Confirm proper use of shadcn/ui components from `@repo/ui`
7. Ensure TypeScript types are properly defined

## Project Overview

A comprehensive web-based media utility platform built with Next.js, TypeScript, and Tailwind CSS. This monorepo project consists of multiple video and image processing tools designed for local development with server deployment readiness.

## Repository Structure

```
apps/frontend/
│
├── app/                    # Routes only - NO component logic
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/         # Dashboard route
│   ├── tools/             # All tool routes
│   │   ├── page.tsx      # Tools listing page
│   │   ├── video-to-images/
│   │   │   └── page.tsx
│   │   ├── video-trim/
│   │   │   └── page.tsx
│   │   ├── video-converter/
│   │   │   └── page.tsx
│   │   ├── image-converter/
│   │   │   └── page.tsx
│   │   ├── image-classification/
│   │   │   └── page.tsx
│   │   ├── polygon-annotation/
│   │   │   └── page.tsx
│   │   ├── bounding-box/
│   │   │   └── page.tsx
│   │   └── video-merge/
│   │       └── page.tsx
│   ├── admin/             # Admin routes
│   ├── globals.css        # Global styles (imports theme)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
│
├── components/             # All UI components
│   ├── shared/            # Components used by multiple tools
│   │   ├── ui/           # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── sonner.tsx
│   │   ├── navbar/
│   │   │   └── Navbar.tsx
│   │   ├── sidebar/
│   │   │   └── Sidebar.tsx
│   │   ├── file-upload/
│   │   │   └── FileUpload.tsx
│   │   ├── loading/
│   │   │   └── LoadingState.tsx
│   │   ├── error/
│   │   │   └── ErrorState.tsx
│   │   └── empty-state/
│   │       └── EmptyState.tsx
│   │
│   ├── video-to-images/   # Tool-specific components
│   ├── video-trim/
│   ├── video-converter/
│   ├── image-converter/
│   ├── image-classification/
│   ├── polygon-annotation/
│   ├── bounding-box/
│   └── video-merge/
│
├── hooks/                  # Custom React hooks
│   ├── useVideoToImages.ts
│   ├── useVideoTrim.ts
│   ├── useVideoConverter.ts
│   ├── useImageConverter.ts
│   ├── useImageClassification.ts
│   ├── usePolygonAnnotation.ts
│   ├── useBoundingBox.ts
│   ├── useVideoMerge.ts
│   └── useProcessingMode.ts
│
├── services/               # API integration services
│   ├── api.ts
│   ├── auth.service.ts
│   ├── videoToImages.service.ts
│   ├── videoTrim.service.ts
│   ├── videoConverter.service.ts
│   ├── imageConverter.service.ts
│   ├── imageClassification.service.ts
│   ├── polygonAnnotation.service.ts
│   ├── boundingBox.service.ts
│   └── videoMerge.service.ts
│
├── lib/                    # Utilities and configuration
│   ├── utils.ts
│   ├── constants.ts
│   ├── routes.ts
│   └── config.ts
│
├── types/                  # TypeScript type definitions
│   ├── common.ts
│   ├── user.ts
│   ├── tool.ts
│   └── activity.ts
│
├── public/                 # Static assets
│
├── package.json
├── next.config.ts
├── tsconfig.json
├── components.json        # shadcn/ui configuration
└── .env.example
```

## Packages Structure

```
packages/
├── theme/                  # Theme package
│   ├── theme.css          # Theme variables (colors, shadows, fonts)
│   ├── custom.css         # Custom overrides and components
│   └── package.json
│
├── ui/                     # Shared UI components
│   ├── index.ts
│   ├── shadcn/            # shadcn/ui components
│   └── shared/            # Shared components
│
└── config/
    ├── eslint-config/     # Shared ESLint configuration
    └── typescript-config/ # Shared TypeScript configuration
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

#### Task 1: Video to Images

- **Route**: `app/tools/video-to-images/page.tsx`
- **Components**: `components/video-to-images/`
  - `VideoUploader.tsx`
  - `ExtractionSettings.tsx`
  - `FramePreview.tsx`
  - `ProcessingProgress.tsx`
- **Hook**: `hooks/useVideoToImages.ts`
- **Service**: `services/videoToImages.service.ts`

#### Task 2: Video Trim

- **Route**: `app/tools/video-trim/page.tsx`
- **Components**: `components/video-trim/`
  - `VideoUploader.tsx`
  - `TrimControls.tsx`
  - `TimeSelector.tsx`
  - `TrimProgress.tsx`
- **Hook**: `hooks/useVideoTrim.ts`
- **Service**: `services/videoTrim.service.ts`

#### Task 3: Video Format Converter

- **Route**: `app/tools/video-converter/page.tsx`
- **Components**: `components/video-converter/`
  - `VideoUploader.tsx`
  - `ConversionSettings.tsx`
  - `ConversionProgress.tsx`
- **Hook**: `hooks/useVideoConverter.ts`
- **Service**: `services/videoConverter.service.ts`

#### Task 4: Image Format Converter

- **Route**: `app/tools/image-converter/page.tsx`
- **Components**: `components/image-converter/`
  - `ImageUploader.tsx`
  - `ConversionSettings.tsx`
  - `ConversionSummary.tsx`
- **Hook**: `hooks/useImageConverter.ts`
- **Service**: `services/imageConverter.service.ts`

#### Task 5: Image Separation/Classification

- **Route**: `app/tools/image-classification/page.tsx`
- **Components**: `components/image-classification/`
  - `ImageViewer.tsx`
  - `ClassificationControls.tsx`
  - `FolderManager.tsx`
  - `ClassificationSummary.tsx`
- **Hook**: `hooks/useImageClassification.ts`
- **Service**: `services/imageClassification.service.ts`

#### Task 6: Polygon ROI Annotation

- **Route**: `app/tools/polygon-annotation/page.tsx`
- **Components**: `components/polygon-annotation/`
  - `AnnotationCanvas.tsx`
  - `PolygonToolbar.tsx`
  - `PolygonList.tsx`
  - `ClassSelector.tsx`
- **Hook**: `hooks/usePolygonAnnotation.ts`
- **Service**: `services/polygonAnnotation.service.ts`

#### Task 7: Bounding Box Annotation

- **Route**: `app/tools/bounding-box/page.tsx`
- **Components**: `components/bounding-box/`
  - `AnnotationCanvas.tsx`
  - `BoundingBoxToolbar.tsx`
  - `LabelControls.tsx`
  - `BoundingBoxList.tsx`
- **Hook**: `hooks/useBoundingBox.ts`
- **Service**: `services/boundingBox.service.ts`

#### Task 8: Video Merge

- **Route**: `app/tools/video-merge/page.tsx`
- **Components**: `components/video-merge/`
  - `VideoUploader.tsx`
  - `VideoList.tsx`
  - `VideoMetadata.tsx`
  - `MergeControls.tsx`
  - `MergeProgress.tsx`
- **Hook**: `hooks/useVideoMerge.ts`
- **Service**: `services/videoMerge.service.ts`

## Development Guidelines

### UI Components

- Use shadcn/ui components from the `@repo/ui` package whenever possible
- Place all custom components in the `components/` folder
- Place shared components in `components/shared/`
- Place tool-specific components in `components/{tool-name}/`

### Pages and Routes

- Pages must only assemble components
- No component logic in the `app/` folder
- Each route requires a `page.tsx` file

**Example Page Structure:**

```tsx
// app/tools/video-merge/page.tsx
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

### Components Structure

```
components/
├── shared/           # Used by multiple tools
│   ├── ui/           # shadcn/ui base components
│   ├── navbar/
│   ├── sidebar/
│   ├── file-upload/
│   ├── loading/
│   ├── error/
│   └── empty-state/
│
└── video-merge/      # Tool-specific
    ├── VideoUploader.tsx
    ├── VideoList.tsx
    ├── VideoMetadata.tsx
    ├── MergeControls.tsx
    └── MergeProgress.tsx
```

### Hooks

- Create one hook per tool
- Handle state management and logic
- Return state, actions, and loading/error states

**Example Hook Structure:**

```tsx
// hooks/useVideoMerge.ts
export function useVideoMerge() {
  const [videos, setVideos] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState(0);

  const mergeVideos = useCallback(async () => {
    // Logic here
  }, [videos]);

  return {
    videos,
    isMerging,
    progress,
    mergeVideos,
    addVideo,
    removeVideo,
    reorderVideos,
  };
}
```

### Services

- Create one service per tool
- Handle API calls and backend communication
- Return Promise-based results

**Example Service Structure:**

```tsx
// services/videoMerge.service.ts
export const videoMergeService = {
  async mergeVideos(videos: File[], settings: MergeSettings) {
    const formData = new FormData();
    videos.forEach(v => formData.append('videos', v));
    formData.append('settings', JSON.stringify(settings));

    const response = await fetch('/api/tools/video-merge', {
      method: 'POST',
      body: formData,
    });

    return response.json();
  },

  async getMergeStatus(jobId: string) {
    return await api.get(`/tools/video-merge/status/${jobId}`);
  },
};
```

## Required Features

### All Tools Must Include

- File upload with drag and drop support
- Progress bar showing processing status
- Clear success and error messages with toast notifications
- Theme-aware styling with no hardcoded colors
- Responsive design compatible with mobile devices
- Loading states during processing
- Error handling with user-friendly messages

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
- Keep `app/` folder for routes only
- Place components in `components/` folder
- Follow the defined file structure
- Create one hook per tool
- Create one service per tool
- Use TypeScript for type safety

### Prohibited Practices

- Hardcoding colors
- Using fonts other than Poppins
- Adding component logic in `app/` folder
- Creating nested routes for tools
- Duplicating shared components
- Writing inline styles
- Ignoring error handling
- Skipping loading states

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

## Support

For questions or clarification:

- Review the README.md in each package
- Check the `@repo/ui` for available components
- Check the `@repo/theme` for available styles
- Request clarification before starting development

---

**Media Utility Tool**