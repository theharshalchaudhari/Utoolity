# Utoolity V2 — Media Utility Platform

Utoolity is a pnpm monorepo built with **Next.js, React, TypeScript, Tailwind CSS, and Fastify**. It provides reusable media-processing tools through a shared frontend and backend architecture.

This README replaces the previous README and serves as the primary technical reference for interns and AI coding assistants. Read it before making changes. Reuse the existing architecture, components, API conventions, and workspace configuration instead of building an independent project.

## 1. Project Architecture

| Location | Responsibility |
|---|---|
| `apps/frontend/` | Next.js pages, components, hooks, and API clients |
| `apps/backend/` | Fastify routes, validation, file handling, and processing |
| `packages/ui/` | Shared shadcn components |
| `packages/theme/` | Tweakcn theme variables |
| `packages/config/` | Shared project configuration |
| `pnpm-workspace.yaml` | Workspace packages and dependency catalog |

### Mandatory rules

- Use **Fastify + TypeScript** for all new backend endpoints.
- Do not introduce Express, Multer, Python, or a separate backend application.
- Use `@fastify/multipart` for new Fastify multipart handling.
- Keep frontend presentation separate from backend processing.
- Reuse existing API clients, hooks, shared folder selectors, and UI components.
- Validate all incoming data and never trust client-provided filesystem paths.
- Inspect existing code before creating a new utility or duplicating functionality.

## 2. Fork, Clone, and Submit a Pull Request

All contributions must be made through a fork of the original repository. Do not clone the original repository to create an independent project.

Original repository:

`https://github.com/theharshalchaudhari/Utoolity`

### Step 1 — Fork the repository

Open the original repository on GitHub and select **Fork**. Create the fork under your own GitHub account.

Your fork will have a URL similar to:

`https://github.com/YOUR_USERNAME/Utoolity`

Replace `YOUR_USERNAME` with your GitHub username.

### Step 2 — Clone your fork

Clone your fork, not the original repository.

```bash
git clone https://github.com/YOUR_USERNAME/Utoolity.git
cd Utoolity
```

Configure the remotes:

```bash
git remote rename origin fork
git remote add upstream https://github.com/theharshalchaudhari/Utoolity.git
git remote -v
```

- `fork` points to your fork, where you have permission to push.
- `upstream` points to the original Utoolity repository.

### Step 3 — Work on `main` only

**Do not create an additional feature branch.** For assigned intern tasks, work directly on the `main` branch of your fork and submit the pull request from that branch.

Before starting, synchronize your fork with upstream:

```bash
git switch main
git fetch upstream
git merge --ff-only upstream/main
git push fork main
```

If the fast-forward merge fails, stop and resolve the divergence properly. Do not force-push or overwrite work without understanding the difference.

Implement your assigned changes on your fork's `main` branch. Commit only the relevant source changes.

### Step 4 — Validate and commit

```bash
git status
git diff --check
git diff
```

Run the relevant type checks, lint commands, and builds before committing.

```bash
git add <relevant-files>
git commit -m "feat: implement assigned task"
git push fork main
```

Replace `<relevant-files>` with the actual files you changed. Never stage environment secrets, local datasets, caches, or generated artifacts.

### Step 5 — Create the pull request

Open your fork on GitHub and select **Contribute → Open pull request**, or use the repository's pull-request interface.

Configure the pull request as follows:

| Setting | Value |
|---|---|
| Base repository | `theharshalchaudhari/Utoolity` |
| Base branch | `main` |
| Head repository | `YOUR_USERNAME/Utoolity` |
| Compare branch | `main` |

The direction must be:

`YOUR_USERNAME/Utoolity:main` → `theharshalchaudhari/Utoolity:main`

Do not submit a PR against your own fork. Do not create a separate branch for this workflow.

Include a description of the changes, affected features, validation commands and actual results, screenshots where relevant, and any known limitations. Review the diff before creating the PR and address requested changes through subsequent commits on your fork's `main`.

## 3. Workspace and Dependencies

The existing workspace is defined by the root `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "packages/config/*"
```

The root catalog is the source of truth for dependency versions.

Important catalog entries include:

| Dependency | Version |
|---|---|
| React / React DOM | `19.2.6` |
| Next.js | `16.2.11` |
| Tailwind CSS | `4.3.0` |
| TypeScript | `6.0.3` |
| Turborepo | `2.9.16` |
| Fastify | `5.6.2` |
| `@fastify/cookie` | `11.0.2` |
| `@fastify/cors` | `11.1.0` |
| `@fastify/session` | `11.1.0` |
| `@fastify/multipart` | `^9.0.3` |
| Sharp | `0.33.4` |
| Zod | `3.23.8` |
| Axios | `1.20.0` |
| Lucide React | `1.17.0` |

The full catalog in `pnpm-workspace.yaml` is authoritative.

### Dependency rules

- Use `"catalog:"` for dependencies managed by the workspace catalog.
- Use `"workspace:*"` for internal workspace packages.
- Never hardcode catalog-managed versions in individual `package.json` files.
- Do not independently upgrade dependencies without a concrete requirement.
- Preserve the existing pnpm configuration and lockfile.
- Do not create nested workspaces or duplicate shared dependencies.

### Installation

Check the root `package.json` for the expected Node.js and pnpm versions, then run:

```bash
pnpm install
```

Configure local environment files using the existing `.env.example` files and application configuration. Never commit real secrets, session keys, access tokens, or private API credentials.

Start development using the existing root scripts:

```bash
pnpm dev
```

Inspect `package.json` before assuming any script exists.

## 4. Shared shadcn Components and Theme

### Installing shadcn components

Shared shadcn components belong in `packages/ui/`.

```bash
cd packages/ui
pnpm dlx shadcn@latest add button card dialog input switch tabs tooltip
```

Install only the components required for your task. Check generated imports, aliases, exports, and the existing `cn` convention.

For third-party registries, configure the exact registry endpoint provided by the component's official documentation. Do not invent registry URLs.

### Theme rules

**Use the existing Tweakcn theme through Tailwind CSS. Do not hardcode colors.**

Use semantic classes such as:

- `bg-background`, `text-foreground`
- `bg-card`, `text-card-foreground`
- `bg-primary`, `text-primary-foreground`
- `bg-muted`, `text-muted-foreground`
- `border-border`, `bg-accent`, `ring-ring`

Do not introduce hex, RGB, HSL, or fixed palette colors in feature components. Reuse shared shadcn components, the existing typography, and the configured theme variables. Avoid separate CSS files when Tailwind utilities and existing theme configuration are sufficient.

## 5. Utoolity V2 — Augmentation

The augmentation feature contains four tasks: image-only augmentation, image-and-annotation augmentation, class balancing, and synthetic image generation.

### Required locations

```text
apps/frontend/
├── app/tools/augmentation/page.tsx
├── api/augmentation.api.ts
├── hooks/useAugmentation.ts
└── components/augmentation/
    ├── AugmentationImportButton.tsx
    └── ...

apps/backend/src/
├── app.ts
├── routes/augmentation.routes.ts
└── augmentation/
    ├── sher.ts
    └── ...
```

All augmentation processing modules must live in `apps/backend/src/augmentation/`. All feature UI components must live in `apps/frontend/components/augmentation/`.

Reuse the existing shared folder selector under `apps/frontend/components/shared/` and follow the established upload and folder-selection workflow.

`AugmentationImportButton.tsx` should follow the pattern in `apps/frontend/components/bounding-box/BoundingBoxImportButton.tsx`. Extend the existing selector's event handling for augmentation without breaking other tools.

### Task 1 — Image-only augmentation

Input: `images/` and `labels/`.

Supported operations:

- Brightness
- Exposure
- Blur
- Noise
- Saturation
- Hue
- Grayscale
- Motion Blur
- Camera Gain

Use Roboflow-style toggle cards with a preview, name, description, toggle, and configuration controls where relevant.

Generate uniquely named images without changing object geometry. Preserve corresponding TXT annotations unchanged when producing paired dataset output. Never modify the originals.

### Task 2 — Image and annotation augmentation

Supported operations:

- Horizontal flip and vertical flip
- Rotation and configurable 360-degree rotation schedules
- Shear, crop, zoom, cutout, and mosaic

Transform images and YOLO annotations together. Preserve class IDs and update normalized bounding boxes correctly after geometric transformations. Validate annotations, clip boxes to image boundaries, and reject malformed or zero-area boxes.

For `X` rotation steps, generate angles at multiples of `360 / X`. For example, `X = 4` produces `90°`, `180°`, `270°`, and `360°`. The full-turn result duplicates the original orientation; retain it only as explicitly configured by the task requirements.

Output image and TXT filenames must match.

### Task 3 — Class balancing

Calculate class instance counts from valid YOLO TXT annotations.

**Auto Balance:** Prefer images containing only the target class, images with a higher target-class ratio, and images containing fewer competing classes. Recalculate counts as samples are generated. Avoid unnecessarily increasing majority classes.

**Custom Balance:** Allow class selection, selection of specific or all eligible images, and a target instance count. Generate only the required additional samples.

Support annotation-aware object extraction and background placement where needed. Display before/after class counts and report cases where exact balancing is impossible without affecting other classes.

### Task 4 — PNG object and background generation

Input folders:

```text
backgrounds/
objects/
```

Read PNG transparency, detect visible object boundaries, resize and place objects on backgrounds, and generate correctly normalized YOLO bounding boxes.

Support multiple generated samples and optional common augmentations. Keep image geometry and annotations synchronized.

Example output:

```text
synthetic_001.jpg
synthetic_001.txt
```

### Shared implementation

All four tasks must reuse the common augmentation implementation, including `apps/backend/src/augmentation/sher.ts`.

Do not create separate transformation engines for balancing or synthetic generation. Reuse common image transforms, geometric transforms, annotation parsing, validation, and output generation.

## 6. Fastify API Contracts

All augmentation endpoints use the `/api/tools/augmentation` prefix. Register their route plugin in `apps/backend/src/app.ts` using Fastify.

The contracts below define the expected API behavior for implementation. Keep them consistent across frontend and backend; if the existing shared selector or job system requires a different transport, update the contracts and callers together.

### Common conventions

- JSON requests use `Content-Type: application/json`.
- Dataset references use an opaque `datasetId` issued by the existing dataset selection/import flow.
- Job references use an opaque `jobId` returned by the backend.
- Never accept an arbitrary absolute filesystem path from the browser as authorization to read or write files.
- Class IDs are non-negative integers. YOLO bounding-box values are normalized to `[0, 1]`.
- Numeric values must be finite. Reject invalid parameters with a `400` response.
- Use `404` for unavailable datasets/jobs, `413` for payloads exceeding configured limits, `409` for incompatible job or dataset states, and `500` for unexpected server errors.
- All processing must use bounded concurrency and preserve original inputs.

### Endpoint 1 — Inspect a dataset

`POST /api/tools/augmentation/datasets/inspect`

Request:

```json
{
  "datasetId": "dataset_opaque_id"
}
```

Response:

```json
{
  "datasetId": "dataset_opaque_id",
  "folderName": "training-dataset",
  "totalImages": 120,
  "totalTxt": 118,
  "validPairs": 118,
  "missingLabels": 2,
  "invalidLabels": 0,
  "classes": [
    {
      "classId": 0,
      "instanceCount": 420,
      "imageCount": 95
    }
  ],
  "warnings": []
}
```

Requirements:

- Count supported images and TXT files.
- Match annotations to images by basename.
- Validate YOLO annotation syntax, class IDs, and bounding-box coordinates.
- Report missing labels and invalid annotations.
- Calculate class instance counts and distinct image counts.
- Do not modify the dataset during inspection.

### Endpoint 2 — Start image augmentation

`POST /api/tools/augmentation/jobs/augment`

Request:

```json
{
  "datasetId": "dataset_opaque_id",
  "mode": "image-only",
  "operations": [
    {
      "type": "brightness",
      "enabled": true,
      "params": {
        "factor": 1.2
      }
    },
    {
      "type": "blur",
      "enabled": false,
      "params": {
        "sigma": 1
      }
    }
  ],
  "output": {
    "name": "augmented-dataset"
  }
}
```

Supported modes:

- `image-only`
- `image-annotation`

Only enabled operations are executed. The backend must validate each operation against its schema and ignore no invalid enabled configuration silently.

Response:

```json
{
  "jobId": "job_opaque_id",
  "status": "queued",
  "message": "Augmentation job queued"
}
```

Use `202 Accepted` for a queued job.

### Endpoint 3 — Start class balancing

`POST /api/tools/augmentation/jobs/balance`

Request:

```json
{
  "datasetId": "dataset_opaque_id",
  "mode": "auto",
  "targetCount": 420,
  "operations": [
    {
      "type": "horizontal-flip",
      "enabled": true,
      "params": {}
    },
    {
      "type": "brightness",
      "enabled": true,
      "params": {
        "factor": 1.1
      }
    }
  ],
  "output": {
    "name": "balanced-dataset"
  }
}
```

For custom balancing:

```json
{
  "datasetId": "dataset_opaque_id",
  "mode": "custom",
  "classId": 2,
  "targetCount": 500,
  "imageSelection": {
    "mode": "selected",
    "imageIds": ["image_opaque_id_1", "image_opaque_id_2"]
  },
  "operations": [
    {
      "type": "horizontal-flip",
      "enabled": true,
      "params": {}
    }
  ],
  "output": {
    "name": "custom-balanced-dataset"
  }
}
```

Rules:

- `mode` must be `auto` or `custom`.
- `targetCount` must be a positive integer within configured limits.
- `classId` is required for custom balancing.
- `imageSelection.mode` must be `selected` or `all`.
- Selected image IDs must belong to the referenced dataset.
- The backend must recalculate counts and stop at the target or report why it cannot be reached.
- Prevent uncontrolled oversampling and excessive generated outputs.

Return a queued job using the same response structure as the augmentation endpoint.

### Endpoint 4 — Generate synthetic images

`POST /api/tools/augmentation/jobs/synthetic`

Request:

```json
{
  "backgroundDatasetId": "background_dataset_id",
  "objectDatasetId": "object_dataset_id",
  "count": 100,
  "placement": {
    "scaleMin": 0.1,
    "scaleMax": 0.4,
    "margin": 0.02
  },
  "operations": [
    {
      "type": "brightness",
      "enabled": true,
      "params": {
        "factor": 1.1
      }
    }
  ],
  "output": {
    "name": "synthetic-dataset"
  }
}
```

Requirements:

- Both datasets must be accessible and contain supported files.
- Objects must support alpha transparency.
- Generate valid bounding boxes from the visible pasted object.
- Keep annotations synchronized with subsequent geometric transformations.
- Use the shared augmentation engine.

### Endpoint 5 — Retrieve job status

`GET /api/tools/augmentation/jobs/:jobId`

Response:

```json
{
  "jobId": "job_opaque_id",
  "status": "running",
  "progress": {
    "completed": 45,
    "total": 100,
    "percent": 45
  },
  "message": "Processing images",
  "result": null,
  "errors": []
}
```

Allowed status values:

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

Requirements:

- `percent` must be an integer between `0` and `100`.
- `completed` and `total` must be non-negative integers.
- A completed job must have `percent: 100`.
- Report errors in a structured form.
- Do not expose arbitrary server filesystem paths or sensitive implementation details.

### Endpoint 6 — Retrieve completed results

`GET /api/tools/augmentation/jobs/:jobId/results`

Response:

```json
{
  "jobId": "job_opaque_id",
  "status": "completed",
  "output": {
    "name": "augmented-dataset",
    "imageCount": 100,
    "labelCount": 100,
    "downloadUrl": "/api/tools/augmentation/jobs/job_opaque_id/download"
  },
  "classCountsBefore": [],
  "classCountsAfter": [],
  "warnings": []
}
```

Requirements:

- Results must be available only for completed jobs.
- Return image and label counts, class distributions when applicable, and warnings.
- Provide a controlled download endpoint or the existing project's equivalent.
- Verify job ownership/access before returning results or downloads.

### Parameter ranges and validation

Use the following ranges as the initial API/UI contract. If an existing processing library imposes stricter constraints, enforce the stricter bounds consistently.

| Parameter | Valid range |
|---|---|
| Brightness factor | `0.0–2.0` |
| Exposure adjustment | `-4.0–4.0` EV |
| Blur sigma | `0.1–20.0` |
| Noise standard deviation | `0–100` on an 8-bit intensity scale |
| Saturation factor | `0.0–3.0` |
| Hue shift | `-180–180` degrees |
| Camera gain factor | `0.0–4.0` |
| Motion blur kernel size | Odd integer `3–51` |
| Rotation angle | `-180–180` degrees |
| 360-degree rotation steps | Integer `2–36` |
| Shear | `-45–45` degrees per axis |
| Crop fraction | `0.1–1.0` per dimension |
| Zoom factor | `0.5–2.0` |
| Cutout area fraction | `0.0–0.5` |
| Mosaic source images | Exactly `4` |
| Synthetic sample count | Integer `1–5000`, subject to resource limits |
| Synthetic object scale | `0.05–1.0` of the background's shorter dimension |
| Placement margin | `0.0–0.2` of the background dimension |
| Custom balance target | Positive integer up to a configurable limit of `100000` instances per class |

For the synthetic request, `scaleMin` and `scaleMax` must each be within the object-scale range, and `scaleMin` must not exceed `scaleMax`.

Additional validation:

- Reject `NaN`, infinity, negative counts, unknown operation types, and unexpected parameters.
- Require integers for counts, class IDs, kernel sizes, and rotation steps.
- Validate normalized YOLO coordinates and ensure boxes have positive width and height.
- Validate output names and prevent path traversal.
- Set configurable limits for input files, total dataset size, generated images, concurrent jobs, and processing duration.
- The limits in this table are API-level constraints, not permission to exceed the server's configured upload or memory limits.

### API implementation rules

- Define shared TypeScript request/response types and Zod schemas.
- Keep the frontend API client aligned with the contracts above.
- Register the route plugin in `apps/backend/src/app.ts` with the `/api/tools/augmentation` prefix.
- Implement processing in the augmentation modules, not directly in route handlers.
- Reuse the common implementation in `apps/backend/src/augmentation/sher.ts`.
- Use the existing job-management pattern if one already exists.
- Do not add a database, queue service, or another infrastructure dependency without a demonstrated requirement.

## 7. Validation and Build Checks

Before committing, run the applicable checks from the repository root:

```bash
pnpm install
pnpm --filter frontend check-types
pnpm --filter frontend lint
pnpm --filter backend typecheck
pnpm --filter backend lint
pnpm build
```

Verify the actual scripts in each package. If a command is not defined, use the existing equivalent.

Do not claim a check passed unless it was actually executed successfully. Fix errors introduced by your changes and document unrelated pre-existing failures accurately.

## 8. Git Ignore and Submission Safety

The root `.gitignore` must exclude local dependencies, environment secrets, generated build outputs, caches, temporary files, and runtime datasets.

At minimum, check for:

```gitignore
node_modules/
.next/
out/
build/
dist/
.turbo/
.cache/
.parcel-cache/
coverage/
storybook-static/

.env
.env.*
!.env.example
!.env.*.example

apps/backend/data/
apps/backend/uploads/
apps/backend/outputs/

*.tsbuildinfo
*.log
*.tmp
*.temp
```

Merge these rules with the existing configuration rather than replacing it blindly.

**Do not ignore `pnpm-lock.yaml`.** It must remain tracked in Git for reproducible installations. Preserve source files, workspace configuration, required assets, and GitHub workflows.

Before creating a source ZIP, remove or exclude `.next`, `.cache`, `.turbo`, `node_modules`, build outputs, temporary files, real environment files, secrets, and local datasets. Inspect the archive before sharing it.

Before pushing, check the staged diff, environment safety, and build results. Never force-push to resolve a synchronization problem without understanding the consequences.

## 9. Final Submission Checklist

- [ ] Work is based on a fork of the original Utoolity repository.
- [ ] Changes are committed to the fork's `main` branch; no extra branch is created.
- [ ] Pull request targets `theharshalchaudhari/Utoolity:main`.
- [ ] Existing workspace and catalog versions are preserved.
- [ ] Backend changes use Fastify and TypeScript.
- [ ] Shared folder selection, API clients, and UI components are reused.
- [ ] All augmentation scripts and UI components are in the required directories.
- [ ] The four tasks reuse common processing and annotation validation.
- [ ] Tweakcn theme variables are used without hardcoded colors.
- [ ] Originals remain unchanged and generated annotations are validated.
- [ ] Type checks, lint, builds, and relevant tests have been executed.
- [ ] No secrets, local datasets, caches, or generated artifacts are committed.
- [ ] The pull request includes a clear summary and actual validation results.

**Utoolity V2:** Extend the existing platform, reuse its architecture, centralize dependencies, and submit tested changes through a fork-based pull request.