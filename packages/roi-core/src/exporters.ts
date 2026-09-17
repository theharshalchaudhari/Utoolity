/**
 * COCO, YOLO, Pascal VOC and binary-mask exports.
 *
 * Port of `apps/roi-studio/roi_studio/core/exporters.py`. The desktop version
 * writes files directly; these functions return the file *contents* and their
 * relative paths, leaving delivery (File System Access, or a ZIP) to the
 * caller. Masks are the one exception: rasterising needs a canvas, so
 * {@link buildMaskSpecs} returns what to draw and the caller draws it.
 *
 * The desktop app hardcodes a single "roi" category. Here each shape carries a
 * class, so the class list drives COCO's `categories`, YOLO's class index and
 * VOC's `<name>`. A batch that uses no classes produces the same single-class
 * output the desktop app produces.
 */

import { APP_VERSION, DEFAULT_CLASS, YOLO_NDIGITS } from "./config.ts";
import * as geo from "./geometry.ts";
import type { MultiPoly, Poly } from "./geometry.ts";
import { pyDumps, pyFloat, type PyValue } from "./pyjson.ts";
import { parseShapeClasses, type CanonRow } from "./store.ts";

export interface ExportFile {
  /** Path relative to the batch folder, e.g. `export_yolo/labels/img1.txt`. */
  path: string;
  text: string;
}

export interface ExportResult {
  files: ExportFile[];
  warnings: string[];
}

export type ExportKind = "coco" | "yolo" | "voc" | "masks";

interface RoiRow {
  row: CanonRow;
  polys: MultiPoly;
}

/** Only rows that actually carry geometry, preferring pixel coordinates. */
function roiRows(rows: readonly CanonRow[]): RoiRow[] {
  const out: RoiRow[] = [];
  for (const row of rows) {
    if (row.row_type !== "roi") continue;
    let polys = geo.parseMultiPolys(row.pixel_coords);
    if (polys.length === 0) {
      const norm = geo.parseMultiPolys(row.normalized_coords);
      const w = Math.trunc(row.image_width || 0);
      const h = Math.trunc(row.image_height || 0);
      if (norm.length && w && h) polys = geo.normToPolys(norm, w, h);
    }
    if (polys.length) out.push({ row, polys });
  }
  return out;
}

/** Image size from the row, falling back to the shapes' own extent. */
function sizeOf(row: CanonRow, polys: MultiPoly): [number, number] {
  const w = Math.trunc(row.image_width || 0);
  const h = Math.trunc(row.image_height || 0);
  if (w && h) return [w, h];
  let maxX = 0;
  let maxY = 0;
  for (const poly of polys) {
    for (const [x, y] of poly) {
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return [Math.trunc(maxX) + 1, Math.trunc(maxY) + 1];
}

/** COCO-style [x, y, width, height]. */
function bbox(poly: Poly): [number, number, number, number] {
  const [x0, y0, x1, y1] = geo.polygonBounds(poly);
  return [x0, y0, x1 - x0, y1 - y0];
}

function stemOf(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return stem || "image";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * The class list, in the order that fixes each class's index.
 *
 * The default class is always index 0 when present, so a batch that never used
 * classes exports exactly as the desktop app's single-class output does.
 */
export function classList(rows: readonly CanonRow[]): string[] {
  const seen = new Set<string>();
  for (const { row, polys } of roiRows(rows)) {
    for (const cls of parseShapeClasses(row.shape_classes, polys.length)) {
      seen.add(cls || DEFAULT_CLASS);
    }
  }
  if (seen.size === 0) return [DEFAULT_CLASS];
  const rest = [...seen].filter((c) => c !== DEFAULT_CLASS).sort(geo.naturalCompare);
  return seen.has(DEFAULT_CLASS) ? [DEFAULT_CLASS, ...rest] : rest;
}

function classesFor(row: CanonRow, count: number): string[] {
  return parseShapeClasses(row.shape_classes, count).map((c) => c || DEFAULT_CLASS);
}

// ── COCO ──────────────────────────────────────────────────────

/** One COCO instance-segmentation file for the whole batch. */
export function exportCoco(
  rows: readonly CanonRow[],
  subdir = "export_coco",
  filename = "annotations.json",
  now: Date = new Date(),
): ExportResult {
  const warnings: string[] = [];
  const classes = classList(rows);
  const images: PyValue[] = [];
  const annotations: PyValue[] = [];
  let annId = 1;
  let imageId = 1;

  for (const { row, polys } of roiRows(rows)) {
    const [width, height] = sizeOf(row, polys);
    images.push({
      id: imageId,
      file_name: row.image_name,
      width,
      height,
      roi_key: row.roi_key,
    });
    const kinds = geo.parseShapeTypes(row.shape_types, polys.length);
    const rowClasses = classesFor(row, polys.length);
    polys.forEach((poly, i) => {
      const flat: PyValue[] = [];
      for (const [x, y] of poly) {
        flat.push(pyFloat(x), pyFloat(y));
      }
      const [bx, by, bw, bh] = bbox(poly);
      const cls = rowClasses[i] ?? DEFAULT_CLASS;
      annotations.push({
        id: annId,
        image_id: imageId,
        category_id: classes.indexOf(cls) + 1,
        segmentation: [flat],
        bbox: [pyFloat(bx), pyFloat(by), pyFloat(bw), pyFloat(bh)],
        area: pyFloat(geo.polygonArea(poly)),
        iscrowd: 0,
        shape_type: kinds[i] ?? "polygon",
      });
      annId += 1;
    });
    imageId += 1;
  }

  if (annotations.length === 0) warnings.push("no ROI rows to export");

  const payload: PyValue = {
    info: {
      description: "ROI Studio export",
      version: APP_VERSION,
      date_created: isoSeconds(now),
    },
    licenses: [],
    images,
    annotations,
    categories: classes.map((name, i) => ({
      id: i + 1,
      name,
      supercategory: "region",
    })),
  };

  return {
    files: [{ path: `${subdir}/${filename}`, text: pyDumps(payload, 1) }],
    warnings,
  };
}

function isoSeconds(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

// ── YOLO (segmentation format) ────────────────────────────────

/** One .txt of normalised polygons per image, plus a dataset stub. */
export function exportYolo(rows: readonly CanonRow[], subdir = "export_yolo"): ExportResult {
  const warnings: string[] = [];
  const files: ExportFile[] = [];
  const classes = classList(rows);

  for (const { row, polys } of roiRows(rows)) {
    const [width, height] = sizeOf(row, polys);
    const norm = geo.polysToNorm(polys, width, height, YOLO_NDIGITS);
    const rowClasses = classesFor(row, polys.length);
    const lines: string[] = [];
    norm.forEach((poly, i) => {
      if (poly.length < 3) return;
      const coords = poly
        .map(
          ([x, y]) =>
            `${geo.clamp(x, 0, 1).toFixed(6)} ${geo.clamp(y, 0, 1).toFixed(6)}`,
        )
        .join(" ");
      const index = Math.max(0, classes.indexOf(rowClasses[i] ?? DEFAULT_CLASS));
      lines.push(`${index} ${coords}`);
    });
    if (lines.length === 0) continue;
    files.push({
      path: `${subdir}/labels/${stemOf(row.image_name)}.txt`,
      text: `${lines.join("\n")}\n`,
    });
  }

  if (files.length === 0) warnings.push("no ROI rows to export");

  const names = classes.map((name, i) => `  ${i}: ${name}`).join("\n");
  files.push({
    path: `${subdir}/data.yaml`,
    text: `# ROI Studio export\npath: .\ntrain: images\nval: images\n\nnames:\n${names}\n`,
  });

  return { files, warnings };
}

// ── Pascal VOC ────────────────────────────────────────────────

/**
 * One XML per image. VOC describes axis-aligned boxes, so each polygon is
 * written as its bounding box and the exact points are kept in a custom
 * `<polygon>` child for anything that can use them.
 */
export function exportVoc(
  rows: readonly CanonRow[],
  folderName = "",
  subdir = "export_voc",
): ExportResult {
  const warnings: string[] = [];
  const files: ExportFile[] = [];

  for (const { row, polys } of roiRows(rows)) {
    const [width, height] = sizeOf(row, polys);
    const name = row.image_name;
    const parts = [
      "<annotation>",
      `  <folder>${escapeXml(folderName)}</folder>`,
      `  <filename>${escapeXml(name)}</filename>`,
      "  <source><database>ROI Studio</database></source>",
      `  <size><width>${width}</width><height>${height}</height><depth>3</depth></size>`,
      "  <segmented>1</segmented>",
    ];
    const kinds = geo.parseShapeTypes(row.shape_types, polys.length);
    const rowClasses = classesFor(row, polys.length);
    polys.forEach((poly, i) => {
      const [x0, y0, x1, y1] = geo.polygonBounds(poly);
      const pts = poly.map(([x, y]) => `${Math.trunc(x)},${Math.trunc(y)}`).join(" ");
      parts.push(
        "  <object>",
        `    <name>${escapeXml(rowClasses[i] ?? DEFAULT_CLASS)}</name>`,
        `    <shape_type>${escapeXml(kinds[i] ?? "polygon")}</shape_type>`,
        "    <pose>Unspecified</pose><truncated>0</truncated><difficult>0</difficult>",
        `    <bndbox><xmin>${Math.trunc(x0)}</xmin><ymin>${Math.trunc(y0)}</ymin>` +
          `<xmax>${Math.trunc(x1)}</xmax><ymax>${Math.trunc(y1)}</ymax></bndbox>`,
        `    <polygon>${pts}</polygon>`,
        "  </object>",
      );
    });
    parts.push("</annotation>");
    files.push({ path: `${subdir}/${stemOf(name)}.xml`, text: `${parts.join("\n")}\n` });
  }

  if (files.length === 0) warnings.push("no ROI rows to export");
  return { files, warnings };
}

// ── binary masks ──────────────────────────────────────────────

export interface MaskSpec {
  /** Path relative to the batch folder, e.g. `export_masks/img1_mask.png`. */
  path: string;
  width: number;
  height: number;
  polys: MultiPoly;
}

/**
 * What to rasterise for each annotated image: one 8-bit PNG with the ROIs
 * filled. Drawing needs a canvas, so the caller does it — see
 * `apps/frontend/services/polygonAnnotation.service.ts`.
 */
export function buildMaskSpecs(
  rows: readonly CanonRow[],
  subdir = "export_masks",
): { specs: MaskSpec[]; warnings: string[] } {
  const specs: MaskSpec[] = [];
  for (const { row, polys } of roiRows(rows)) {
    const [width, height] = sizeOf(row, polys);
    const usable = polys.filter((poly) => poly.length >= 3);
    if (usable.length === 0) continue;
    specs.push({
      path: `${subdir}/${stemOf(row.image_name)}_mask.png`,
      width: Math.max(1, width),
      height: Math.max(1, height),
      polys: usable,
    });
  }
  const warnings = specs.length === 0 ? ["no ROI rows to export"] : [];
  return { specs, warnings };
}

// ── filtering helpers ─────────────────────────────────────────

export interface RowFilter {
  sites?: readonly string[];
  cams?: readonly string[];
  roiKeys?: readonly string[];
  names?: readonly string[];
  rowTypes?: readonly string[];
}

/** Narrow an export to particular sites, cameras, keys, names or row types. */
export function filterRows(
  rows: readonly CanonRow[],
  filter: RowFilter = {},
): CanonRow[] {
  const { sites, cams, roiKeys, names, rowTypes } = filter;
  return rows.filter((row) => {
    if (sites?.length && !sites.includes(row.site_id)) return false;
    if (cams?.length && !cams.includes(row.cam_number)) return false;
    if (roiKeys?.length && !roiKeys.includes(row.roi_key)) return false;
    if (names?.length && !names.includes(row.image_name)) return false;
    if (rowTypes?.length && !rowTypes.includes(row.row_type)) return false;
    return true;
  });
}

/** Unique non-empty values of one field, in natural order. */
export function distinct(rows: readonly CanonRow[], field: keyof CanonRow): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = String(row[field] ?? "").trim();
    if (value) seen.add(value);
  }
  return [...seen].sort(geo.naturalCompare);
}

/** Run a subset of the exporters and merge their results. */
export function runExports(
  kinds: readonly ExportKind[],
  rows: readonly CanonRow[],
  folderName = "",
  now: Date = new Date(),
): ExportResult & { masks: MaskSpec[] } {
  const files: ExportFile[] = [];
  const warnings: string[] = [];
  const masks: MaskSpec[] = [];
  for (const kind of kinds) {
    if (kind === "coco") {
      const result = exportCoco(rows, "export_coco", "annotations.json", now);
      files.push(...result.files);
      warnings.push(...result.warnings);
    } else if (kind === "yolo") {
      const result = exportYolo(rows);
      files.push(...result.files);
      warnings.push(...result.warnings);
    } else if (kind === "voc") {
      const result = exportVoc(rows, folderName);
      files.push(...result.files);
      warnings.push(...result.warnings);
    } else if (kind === "masks") {
      const result = buildMaskSpecs(rows);
      masks.push(...result.specs);
      warnings.push(...result.warnings);
    }
  }
  return { files, warnings, masks };
}
