/**
 * Types for the polygon ROI annotation tool.
 *
 * The annotation model itself (shapes, rows, geometry) lives in
 * `@repo/roi-core`, shared with the desktop app's file formats. These are the
 * browser-side concerns: how a batch was opened, and what the canvas is doing.
 */

import type { CanonRow, Shape } from "@repo/roi-core";

/**
 * How the batch was opened.
 *
 * - `folder`: the File System Access API. Outputs are written back into the
 *   image folder, exactly as the desktop app does.
 * - `memory`: the fallback for browsers without it. Images are read from a
 *   drop or a file input and every output is delivered as one ZIP.
 */
export type AccessMode = "folder" | "memory";

/** The drawing tool in use. Mirrors the desktop app's toolbar. */
export type Tool = "select" | "polygon" | "rect" | "circle" | "freehand";

/** One image in the batch. */
export interface BatchImage {
  name: string;
  /** Read the bytes. In folder mode this hits the disk on demand. */
  getFile: () => Promise<File>;
}

/** A file to write, relative to the batch folder. */
export interface OutputFile {
  path: string;
  data: Blob | string;
}

/**
 * Somewhere to read a batch from and write its outputs to. The two
 * implementations are in `services/polygonAnnotation.service.ts`.
 */
export interface BatchSource {
  mode: AccessMode;
  /** The folder's own name, used for the VOC `<folder>` element. */
  folderName: string;
  images: BatchImage[];
  /** True when outputs land beside the images rather than in a ZIP. */
  canWriteInPlace: boolean;
  /** Existing file content, for reopening a batch. Null when absent. */
  readText: (path: string) => Promise<string | null>;
  readBytes: (path: string) => Promise<Uint8Array | null>;
  write: (file: OutputFile) => Promise<void>;
  /** Copy one of the batch images into a subfolder, e.g. `no_roi/`. */
  copyImage: (name: string, intoDir: string) => Promise<void>;
  /** In memory mode, the ZIP of everything written. Null in folder mode. */
  finish: () => Promise<Blob | null>;
}

/** What the workspace is holding for the image on screen. */
export interface EditorState {
  shapes: Shape[];
  selected: number[];
  tool: Tool;
  className: string;
  dirty: boolean;
}

/** Everything persisted for the batch, keyed by image name. */
export type RowsByImage = Record<string, CanonRow>;

export interface SaveSummary {
  written: string[];
  warnings: string[];
  errors: string[];
}
