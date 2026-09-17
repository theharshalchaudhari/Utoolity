/**
 * Reading a batch of images and writing its outputs, in the browser.
 *
 * Two backends sit behind one {@link BatchSource} interface:
 *
 * - **folder** — the File System Access API. The user picks their image
 *   folder and every output is written back into it, so the tool behaves like
 *   the desktop app and the images never leave the machine. Chromium only.
 * - **memory** — the fallback. Images come from a drop or a file input, and
 *   everything written is collected into one ZIP the user downloads. Works in
 *   every browser, but cannot write beside the originals.
 *
 * All of the file *content* is produced by `@repo/roi-core`, which is shared
 * with the desktop app; this module only moves bytes around.
 */

import {
  COVERAGE_NAME,
  IMG_EXTS,
  JSON_NAME,
  MAP_NAME,
  NO_ROI_DIR,
  PRINTED_DIR,
  REPORT_NAME,
  XLSX_NAME,
  buildJson,
  buildStats,
  buildWorkbook,
  canonicalize,
  dumpCoverageJson,
  dumpFullJson,
  dumpMapJson,
  naturalCompare,
  parseWorkbook,
  renderReportHtml,
  runExports,
  viewColumns,
  type CanonRow,
  type ExportKind,
  type MaskSpec,
} from "@repo/roi-core";

import type { BatchImage, BatchSource, OutputFile, SaveSummary } from "@/types/roi";

// ── helpers ───────────────────────────────────────────────────

export function isImageName(name: string): boolean {
  const lower = name.toLowerCase();
  return IMG_EXTS.some((ext) => lower.endsWith(ext));
}

/** True when this browser can write results back into the image folder. */
export function supportsFolderAccess(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

function splitPath(path: string): { dirs: string[]; file: string } {
  const parts = path.split("/").filter(Boolean);
  const file = parts.pop() ?? "";
  return { dirs: parts, file };
}

async function toBlob(data: Blob | string): Promise<Blob> {
  return typeof data === "string" ? new Blob([data], { type: "text/plain" }) : data;
}

// ── folder backend (File System Access) ───────────────────────

async function ensurePermission(handle: FileSystemDirectoryHandleExt): Promise<boolean> {
  const query = await handle.queryPermission?.({ mode: "readwrite" });
  if (query === "granted") return true;
  const request = await handle.requestPermission?.({ mode: "readwrite" });
  return request === "granted";
}

function folderSource(
  handle: FileSystemDirectoryHandleExt,
  images: BatchImage[],
  canWrite: boolean,
): BatchSource {
  const dirFor = async (dirs: string[]): Promise<FileSystemDirectoryHandleExt> => {
    let current = handle;
    for (const dir of dirs) {
      current = await current.getDirectoryHandle(dir, { create: true });
    }
    return current;
  };

  return {
    mode: "folder",
    folderName: handle.name,
    images,
    canWriteInPlace: canWrite,

    readBytes: async (path) => {
      try {
        const { dirs, file } = splitPath(path);
        let current = handle;
        for (const dir of dirs) current = await current.getDirectoryHandle(dir);
        const fileHandle = await current.getFileHandle(file);
        return new Uint8Array(await (await fileHandle.getFile()).arrayBuffer());
      } catch {
        return null; // not there, which is the normal case for a fresh batch
      }
    },

    readText: async (path) => {
      try {
        const { dirs, file } = splitPath(path);
        let current = handle;
        for (const dir of dirs) current = await current.getDirectoryHandle(dir);
        const fileHandle = await current.getFileHandle(file);
        return await (await fileHandle.getFile()).text();
      } catch {
        return null;
      }
    },

    write: async ({ path, data }) => {
      const { dirs, file } = splitPath(path);
      const target = await dirFor(dirs);
      const fileHandle = await target.getFileHandle(file, { create: true });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(typeof data === "string" ? data : await toBlob(data));
      } finally {
        await writable.close();
      }
    },

    copyImage: async (name, intoDir) => {
      const source = images.find((img) => img.name === name);
      if (!source) return;
      const target = await dirFor([intoDir]);
      const fileHandle = await target.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(await source.getFile());
      } finally {
        await writable.close();
      }
    },

    finish: async () => null, // already on disk
  };
}

/**
 * Ask for a folder and read the images in it. Returns null when the user
 * cancels the picker.
 */
export async function openFolderBatch(): Promise<BatchSource | null> {
  if (!supportsFolderAccess()) throw new Error("This browser cannot open a folder.");
  let handle: FileSystemDirectoryHandleExt;
  try {
    handle = await window.showDirectoryPicker!({ id: "roi-studio", mode: "readwrite" });
  } catch {
    return null; // the user dismissed the picker
  }

  const canWrite = await ensurePermission(handle);
  const images: BatchImage[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind !== "file" || !isImageName(entry.name)) continue;
    const fileHandle = entry;
    images.push({ name: entry.name, getFile: () => fileHandle.getFile() });
  }
  images.sort((a, b) => naturalCompare(a.name, b.name));
  return folderSource(handle, images, canWrite);
}

// ── memory backend (drag-drop / file input) ───────────────────

/** Read a batch from dropped or selected files, delivering outputs as a ZIP. */
export function openFileBatch(files: readonly File[], folderName = "batch"): BatchSource {
  const images: BatchImage[] = files
    .filter((file) => isImageName(file.name))
    .map((file) => ({ name: file.name, getFile: () => Promise.resolve(file) }))
    .sort((a, b) => naturalCompare(a.name, b.name));

  const outputs = new Map<string, Blob | string>();
  const byName = new Map(files.map((file) => [file.name, file]));

  return {
    mode: "memory",
    folderName,
    images,
    canWriteInPlace: false,

    readBytes: async (path) => {
      const existing = byName.get(path);
      if (!existing) return null;
      return new Uint8Array(await existing.arrayBuffer());
    },

    readText: async (path) => {
      const existing = byName.get(path);
      return existing ? await existing.text() : null;
    },

    write: async ({ path, data }) => {
      outputs.set(path, data);
    },

    copyImage: async (name, intoDir) => {
      const file = byName.get(name);
      if (file) outputs.set(`${intoDir}/${name}`, file);
    },

    finish: async () => {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const [path, data] of outputs) {
        zip.file(path, typeof data === "string" ? data : await toBlob(data));
      }
      return await zip.generateAsync({ type: "blob" });
    },
  };
}

/** Hand the ZIP to the user. A no-op in folder mode, where nothing is pending. */
export async function deliver(source: BatchSource, filename: string): Promise<void> {
  const blob = await source.finish();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── reopening a batch ─────────────────────────────────────────

/**
 * Load whatever the folder already holds, so a batch can be picked up where it
 * was left. Falls back to the `.bak` copy the desktop app leaves behind.
 */
export async function loadExistingRows(source: BatchSource): Promise<CanonRow[]> {
  for (const name of [XLSX_NAME, `${XLSX_NAME}.bak`]) {
    const bytes = await source.readBytes(name);
    if (!bytes) continue;
    const raw = await parseWorkbook(bytes);
    const rows = raw.map((row) => canonicalize(row)).filter((row) => row.image_name);
    if (rows.length) return rows;
  }
  return [];
}

// ── rasterising ───────────────────────────────────────────────

function canvasFor(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  return canvas;
}

async function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("could not encode the image"));
    }, "image/png");
  });
}

/** One 8-bit-looking PNG per annotated image, ROIs filled white on black. */
export async function rasterizeMask(spec: MaskSpec): Promise<Blob> {
  const canvas = canvasFor(spec.width, spec.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("could not get a 2D context");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  for (const poly of spec.polys) {
    if (poly.length < 3) continue;
    ctx.beginPath();
    poly.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }
  return await canvasBlob(canvas);
}

export interface PrintedOptions {
  colour: string;
  fillAlpha: number;
  lineWidth: number;
}

/** A copy of the image with its ROIs burnt in, for `printed_roi/`. */
export async function renderPrintedPreview(
  file: File,
  polys: readonly (readonly [number, number][])[],
  options: PrintedOptions,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = canvasFor(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("could not get a 2D context");
    ctx.drawImage(bitmap, 0, 0);
    ctx.lineWidth = options.lineWidth;
    ctx.strokeStyle = options.colour;
    ctx.fillStyle = options.colour;
    ctx.globalAlpha = Math.min(1, Math.max(0, options.fillAlpha / 100));
    for (const poly of polys) {
      if (poly.length < 3) continue;
      ctx.beginPath();
      poly.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.globalAlpha = Math.min(1, Math.max(0, options.fillAlpha / 100));
    }
    return await canvasBlob(canvas);
  } finally {
    bitmap.close();
  }
}

// ── saving ────────────────────────────────────────────────────

export interface SaveOptions {
  useSiteFormat?: boolean;
  printed?: PrintedOptions;
  /** Write `no_roi/` and `printed_roi/` copies. Off makes saving much faster. */
  writeCopies?: boolean;
  onProgress?: (done: number, total: number, label: string) => void;
}

const DEFAULT_PRINTED: PrintedOptions = {
  colour: "#00dc64",
  fillAlpha: 70,
  lineWidth: 3,
};

/**
 * Write the spreadsheet, both JSON files, and optionally the `no_roi/` and
 * `printed_roi/` copies. Errors are collected rather than thrown, so one
 * unwritable file does not lose the rest of the save.
 */
export async function saveBatch(
  source: BatchSource,
  rows: readonly CanonRow[],
  options: SaveOptions = {},
): Promise<SaveSummary> {
  const summary: SaveSummary = { written: [], warnings: [], errors: [] };
  const { onProgress } = options;
  const steps: [string, () => Promise<void>][] = [];

  steps.push([
    XLSX_NAME,
    async () => {
      const bytes = await buildWorkbook(rows, {
        columns: viewColumns(options.useSiteFormat ?? false),
      });
      await source.write({
        path: XLSX_NAME,
        data: new Blob([bytes as unknown as BlobPart], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      });
    },
  ]);

  const { full, map, warnings } = buildJson(rows, source.folderName);
  summary.warnings.push(...warnings);

  steps.push([
    JSON_NAME,
    async () => source.write({ path: JSON_NAME, data: dumpFullJson(full) }),
  ]);
  steps.push([MAP_NAME, async () => source.write({ path: MAP_NAME, data: dumpMapJson(map) })]);

  if (options.writeCopies ?? true) {
    const printed = options.printed ?? DEFAULT_PRINTED;
    for (const row of rows) {
      const image = source.images.find((img) => img.name === row.image_name);
      if (!image) continue;
      if (row.row_type === "no_roi") {
        steps.push([
          `${NO_ROI_DIR}/${row.image_name}`,
          async () => source.copyImage(row.image_name, NO_ROI_DIR),
        ]);
      } else if (row.row_type === "roi" && row.pixel_coords) {
        steps.push([
          `${PRINTED_DIR}/${row.image_name}`,
          async () => {
            const { parseMultiPolys } = await import("@repo/roi-core");
            const polys = parseMultiPolys(row.pixel_coords);
            const blob = await renderPrintedPreview(await image.getFile(), polys, printed);
            await source.write({ path: `${PRINTED_DIR}/${row.image_name}`, data: blob });
          },
        ]);
      }
    }
  }

  let done = 0;
  for (const [label, run] of steps) {
    onProgress?.(done, steps.length, label);
    try {
      await run();
      summary.written.push(label);
    } catch (error) {
      summary.errors.push(`${label}: ${(error as Error).message}`);
    }
    done += 1;
  }
  onProgress?.(steps.length, steps.length, "done");
  return summary;
}

/** Write the HTML report and the machine-readable coverage numbers. */
export async function saveReport(
  source: BatchSource,
  rows: readonly CanonRow[],
): Promise<SaveSummary> {
  const summary: SaveSummary = { written: [], warnings: [], errors: [] };
  const stats = buildStats(
    rows,
    source.images.map((img) => img.name),
    source.folderName,
  );
  for (const [path, text] of [
    [REPORT_NAME, renderReportHtml(stats)],
    [COVERAGE_NAME, dumpCoverageJson(stats)],
  ] as const) {
    try {
      await source.write({ path, data: text });
      summary.written.push(path);
    } catch (error) {
      summary.errors.push(`${path}: ${(error as Error).message}`);
    }
  }
  return summary;
}

/** Run the selected export formats, rasterising masks as it goes. */
export async function saveExports(
  source: BatchSource,
  rows: readonly CanonRow[],
  kinds: readonly ExportKind[],
  onProgress?: (done: number, total: number, label: string) => void,
): Promise<SaveSummary> {
  const summary: SaveSummary = { written: [], warnings: [], errors: [] };
  const { files, masks, warnings } = runExports(kinds, rows, source.folderName);
  summary.warnings.push(...warnings.filter((w, i, all) => all.indexOf(w) === i));

  const total = files.length + masks.length;
  let done = 0;
  const step = async (label: string, run: () => Promise<void>): Promise<void> => {
    onProgress?.(done, total, label);
    try {
      await run();
      summary.written.push(label);
    } catch (error) {
      summary.errors.push(`${label}: ${(error as Error).message}`);
    }
    done += 1;
  };

  for (const file of files) {
    await step(file.path, () => source.write({ path: file.path, data: file.text }));
  }
  for (const spec of masks) {
    await step(spec.path, async () =>
      source.write({ path: spec.path, data: await rasterizeMask(spec) }),
    );
  }
  onProgress?.(total, total, "done");
  return summary;
}

export type { OutputFile };
