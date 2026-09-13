# ROI Studio

Polygon ROI annotation for camera batches. Point it at a folder of images,
draw regions with the tool that suits the shape, and get spreadsheets and JSON
that downstream code can read without cleaning anything up first.

Built with PySide6 (Qt 6). Runs on Windows, macOS and Linux from the same
source, with no operating-system-specific code paths.

**Author:** Ashaz Qureshi ([@AshazQ](https://github.com/AshazQ))

## Part of Utoolity

ROI Studio lives in the [Utoolity](../../README.md) monorepo as
`apps/roi-studio` and covers Task 6, Polygon ROI Annotation. It is a desktop
application, so it runs natively rather than inside the Next.js app; the web
route `/tools/polygon-annotation` describes it and points here.

From the repository root the usual pnpm/turbo commands reach it:

| Command | What it does |
|---|---|
| `pnpm --filter roi-studio setup` | same as `python bootstrap.py` |
| `pnpm roi-studio` | start the application |
| `pnpm --filter roi-studio test` | run every test suite (headless) |
| `pnpm --filter roi-studio lint` | byte-compile every module |
| `pnpm --filter roi-studio build:exe` | build a standalone executable |

These pick the local `.venv` automatically. `pnpm dev` and `pnpm build` leave
ROI Studio alone, so they never open a window or run PyInstaller.

---

## Getting started

### The one-command way

```
python bootstrap.py --shortcut --run
```

That creates a private environment in `.venv`, installs everything, verifies
the result, writes a desktop shortcut, and starts the application. No
administrator rights and nothing installed system-wide.

### Afterwards

```
python run.py
```

`run.py` finds `.venv` on its own, so this works whichever Python is first on
the path.

### Other ways in

| Command | What it does |
|---|---|
| `python bootstrap.py` | set up, verify, and stop |
| `python bootstrap.py --upgrade` | refresh the environment and dependencies |
| `python bootstrap.py --system` | install into the current interpreter instead of `.venv` |
| `python bootstrap.py --offline wheels/` | install from a folder of `.whl` files, no internet |
| `python run.py <folder>` | start with a batch already open |
| `python run.py --selftest` | verify the machine; no display needed |
| `python run.py --check` | print the environment report |
| `python build/build_exe.py` | build a standalone executable for this platform |

### Requirements

Python 3.9 or newer, plus three packages the bootstrap installs for you:
PySide6-Essentials, Pillow and openpyxl.

---

## Working through a batch

Open a folder and every supported image in it becomes a page to work through.
Two subfolders appear beside your images:

- `no_roi/` — a copy of each image you marked as having nothing to annotate
- `printed_roi/` — a copy of each annotated image with its ROIs burnt in

**Drawing.** `W` draws a polygon point by point, `B` drags out a rectangle,
`C` a circle or ellipse, and `G` traces freehand and simplifies the path into
a polygon. `V` returns to the select tool.

**Editing.** Drag a vertex to reshape. Drag inside a shape to move it.
Double-click an edge to insert a point, Ctrl+click a vertex to remove it.
Rectangles and circles get corner handles and keep their identity when the
file is reopened. Drag on empty space to rubber-band select several ROIs and
then align, distribute or match their sizes.

**Saving.** `S` saves and moves on. `N` files the image under `no_roi`.
Leaving an image commits whatever is on screen, so nothing is ever lost by
navigating — and a write that fails stops the move rather than silently
dropping the work.

**Doing many at once.** Fixed cameras produce batches where every frame wants
the same regions. `Ctrl+Shift+A` copies the ROIs you have drawn onto any set
of images — all of them, the ones from the same camera, the untouched ones, or
a hand-picked list — and the same dialog files a set of images under `no_roi`
in one step.

Press `?` for the full shortcut sheet, or `Ctrl+K` for the command palette,
which runs any command by name. Every shortcut can be rebound in Settings.

---

## What gets written

Every save writes all three of these, atomically:

| File | Contents |
|---|---|
| `roi_annotations.xlsx` | one row per image, text-formatted cells, frozen header, auto-filter |
| `roi_annotations.json` | the full record: metadata, counts, per-camera polygons, sources |
| `roi_map.json` | just `{roi_key: [[[x, y], …], …]}`, one camera per line |

Coordinates are JSON-style nested lists — `[[[232, 163], [494, 280], …]]` —
so a spreadsheet cell can be fed straight into `json.loads()`. A `roi_key`
column carries the canonical `SITE_CAM` id (`UBBRAP0226_cam3_….jpg` becomes
`UBBRAP0226_3`), and images that share a site and camera have their polygons
merged under that one key in the JSON.

### Columns

`image_name`, `roi_key`, `site_id`, `cam_number`, `pixel_coords`,
`normalized_coords`, `total_polygons`, `image_width`, `image_height`,
`row_type`, `comment`, `shape_types`

`shape_types` is the only addition to the previous build's schema; it records
`["rect", "circle", …]` in the same order as the polygons so shapes stay
editable as what they were drawn as. A compact layout with a single
`roi_coordinate` column is available in Settings, and you can define your own
column set and order there too.

### Other formats

`Ctrl+Shift+E` exports COCO, YOLO segmentation, Pascal VOC and binary masks,
each into its own subfolder, optionally narrowed to particular sites or
cameras. `Ctrl+I` imports or merges annotation files from other people, with
an explicit conflict report rather than a silent winner.

### The report

`F8` writes `roi_report.html` — a self-contained page with batch progress,
ROIs per camera, shape mix, coverage per camera and a row for every image. It
needs no network and opens anywhere. `roi_coverage.json` carries the same
numbers for machines. `F7` shows the same summary inside the application.

---

## How your work is protected

- Every file is written to a temporary file in the same folder, read back to
  prove it parses, and only then swapped into place. A crash, a power cut or a
  full disk cannot leave a half-written spreadsheet.
- The previous good copy is kept as `.bak`.
- If the spreadsheet is open in Excel, a timestamped sibling is written rather
  than losing the save.
- Unsaved work is drafted to disk every few seconds and offered back if the
  application stops unexpectedly.
- A lock file stops a second instance from writing the same outputs, and a
  stale lock is taken over rather than blocking you.
- Every save, export and decision is appended to `.roi_studio_audit.jsonl`,
  viewable at `F9`.
- A folder that cannot be written to opens read-only rather than failing.
- If the spreadsheet changed on disk since this session read it — another
  session, a sync client, someone editing in Excel — you are asked before it
  is overwritten.
- **Batch → Restore this image from the backup** brings an image's previous
  annotation back out of the `.bak` copy and puts it on the canvas for review
  before you keep it.

Polygons are validated on the way in: duplicate clicks are removed, points are
clamped inside the image, collapsed shapes are rejected, and self-intersecting
outlines are flagged.

---

## Layout

```
apps/roi-studio/
├── bootstrap.py           set-up script - standard library only
├── run.py                 launcher; finds .venv by itself
├── requirements.txt
├── pyproject.toml
├── package.json           pnpm/turbo scripts for the monorepo
├── scripts/py.mjs         runs those scripts with the right Python
├── build/build_exe.py     PyInstaller build for this platform
├── docs/DEPLOYMENT.md     getting it onto annotators' machines
├── roi_studio/
│   ├── app.py             entry point, environment checks, crash handling
│   ├── config.py          constants, paths, settings
│   ├── selftest.py        the offline test suite
│   ├── core/              no Qt in here - testable headless
│   │   ├── geometry.py    polygons, shapes, validation, parsing
│   │   ├── model.py       Shape objects
│   │   ├── store.py       canonical rows and the output files
│   │   ├── io_safe.py     atomic writes, backups, folder lock
│   │   ├── imaging.py     burnt-in previews
│   │   ├── exporters.py   COCO, YOLO, VOC, masks
│   │   ├── importers.py   import and merge
│   │   ├── report.py      the HTML report and coverage stats
│   │   ├── history.py     undo / redo
│   │   ├── session.py     drafts, audit log, session timer
│   │   └── push.py        optional HTTP delivery
│   └── ui/                everything Qt
│       ├── main_window.py layout, actions, the flow to disk
│       ├── canvas.py      drawing and direct manipulation
│       ├── panels.py      ROI list, vertex inspector, stats, minimap
│       ├── filmstrip.py   thumbnail navigator
│       ├── icons.py       vector icon set
│       ├── palette.py     themes and the stylesheet
│       ├── shortcuts.py   the action registry
│       └── dialogs/
└── tests/
    ├── run_all.py         runs every suite, one verdict
    ├── test_core.py       the self-test under pytest or as a script
    ├── test_gui.py        end-to-end GUI test, offscreen
    └── test_features.py   feature-level checks
```

The `core` package imports no Qt at all, which is why `--selftest` can verify
the entire persistence path on a machine with no display.

---

## Settings

Settings live in a per-user JSON file (`--check` prints the path) and cover
theme, canvas appearance, snapping, auto-advance, draft interval, the
spreadsheet layout and column order, the optional HTTP endpoint, and every
keyboard shortcut.

The printed-ROI colour, fill strength, outline width and label colour are
separate settings that apply **only** to the copies written into
`printed_roi/`. Changing them never changes what you see while drawing.

**Batch → Save these settings for this batch** writes a `.roi_studio.json`
beside the images holding the layout, columns, printed-preview appearance and
drawing preferences. Anyone who opens that folder picks them up for the
session, without their own preferences being changed.

---

## Troubleshooting

**It will not start.** Run `python run.py --check`. It prints the Python
version, which packages are present, and what is missing.

**Something looks wrong with the data.** Run `python run.py --selftest`. It
exercises parsing, validation, the spreadsheet round-trip, the JSON build,
every exporter, the importer, the atomic-write guard and the folder lock,
without needing a display.

**It crashed.** A report is written to the recovery folder shown in the
message, and your files on disk are untouched — every write is atomic.

**The spreadsheet will not update.** It is probably open in Excel. The
application writes a timestamped copy instead and says so in the status bar.

---

## Credits

ROI Studio was designed and written by **Ashaz Qureshi**
([@AshazQ](https://github.com/AshazQ)), who maintains it as part of Utoolity.
