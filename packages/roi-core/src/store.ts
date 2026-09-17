/**
 * The canonical row and the output files built from it.
 *
 * Port of the pure half of `apps/roi-studio/roi_studio/core/store.py`. The
 * desktop app's `AnnotationStore` also owns atomic writes, a folder lock and
 * external-change detection; none of that is meaningful in a browser, so this
 * module stops at producing the file *text* and leaves delivery to the caller.
 *
 * One column is new here: `shape_classes`. The desktop app has no notion of
 * classes, so it is written only when a batch actually uses one, keeping output
 * byte-identical to the desktop app's for un-classed batches.
 */

import {
  APP_VERSION,
  CANON_COLUMNS,
  DEFAULT_CLASS,
  NDIGITS,
  ROW_TYPES,
  type RowType,
} from "./config.ts";
import * as geo from "./geometry.ts";
import type { MultiPoly } from "./geometry.ts";

export interface CanonRow {
  image_name: string;
  roi_key: string;
  site_id: string;
  cam_number: string;
  pixel_coords: string;
  normalized_coords: string;
  total_polygons: number;
  image_width: number;
  image_height: number;
  row_type: RowType;
  comment: string;
  shape_types: string;
  shape_classes: string;
}

export interface MakeRowInput {
  fname: string;
  rowType: RowType;
  polysPx?: MultiPoly;
  normPolys?: MultiPoly;
  comment?: string;
  width?: number;
  height?: number;
  kinds?: readonly string[];
  classes?: readonly string[];
}

/** True when every class is the default, i.e. the batch does not use classes. */
function classesAreDefault(classes: readonly string[]): boolean {
  return classes.every((c) => !c || c === DEFAULT_CLASS);
}

export function makeRow(input: MakeRowInput): CanonRow {
  const {
    fname,
    rowType,
    polysPx = [],
    normPolys = [],
    comment = "",
    width = 0,
    height = 0,
    kinds = [],
    classes = [],
  } = input;
  const [siteId, camToken] = geo.extractSiteCam(fname);
  const isRoi = rowType === "roi";
  return {
    image_name: fname,
    roi_key: geo.makeRoiKey(fname),
    site_id: siteId,
    cam_number: camToken,
    pixel_coords: geo.fmtPolys(polysPx),
    normalized_coords: geo.fmtPolys(normPolys),
    total_polygons: isRoi ? polysPx.length : 0,
    image_width: Math.trunc(width || 0),
    image_height: Math.trunc(height || 0),
    row_type: (ROW_TYPES as readonly string[]).includes(rowType) ? rowType : "roi",
    comment: comment || "",
    shape_types: isRoi ? geo.fmtShapeTypes(kinds) : "",
    // only recorded when it carries information the desktop app would not
    shape_classes: isRoi && !classesAreDefault(classes) ? geo.jsonSpaced(classes) : "",
  };
}

/** Python's `int(float(x))`: parse as a number, then truncate towards zero. */
function intOfFloat(value: unknown, fallback: number): number {
  const text = String(value ?? "").trim();
  if (!text) return 0; // Python's `x or 0` makes a blank cell a zero, not the fallback
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

/**
 * Bring any legacy or imported row up to the current schema.
 *
 * Older builds wrote either the site layout (`roi_coordinate`) or the full
 * layout, and toggling between them left rows carrying both. Everything folds
 * back into one shape here.
 */
export function canonicalize(raw: Record<string, unknown>): CanonRow {
  const text: Record<string, string> = {};
  for (const key of CANON_COLUMNS) {
    const value = raw[key];
    text[key] = value === null || value === undefined ? "" : String(value).trim();
  }

  let fname = text.image_name ?? "";
  if (!fname) {
    // some very old files put the bare basename in site_id
    fname = String(raw.site_id ?? "").trim();
  }

  let normalized = text.normalized_coords ?? "";
  if (!normalized) {
    const legacy = raw.roi_coordinate;
    if (legacy) {
      const polys = geo.parseMultiPolys(legacy);
      if (polys.length) normalized = geo.fmtPolys(polys);
    }
  }

  // re-render both coordinate cells in the current bracket format
  let pixel = text.pixel_coords ?? "";
  if (pixel) pixel = geo.fmtPolys(geo.parseMultiPolys(pixel));
  if (normalized) normalized = geo.fmtPolys(geo.parseMultiPolys(normalized));

  let siteId = text.site_id ?? "";
  let camNumber = text.cam_number ?? "";
  let roiKey = text.roi_key ?? "";
  if (fname) {
    const [derivedSite, derivedCam] = geo.extractSiteCam(fname);
    siteId = siteId || derivedSite;
    camNumber = camNumber || derivedCam;
    roiKey = roiKey || geo.makeRoiKey(fname);
  }

  const rawType = text.row_type || "roi";
  const rowType: RowType = (ROW_TYPES as readonly string[]).includes(rawType)
    ? (rawType as RowType)
    : "roi";

  const count = geo.parseMultiPolys(pixel || normalized).length;
  const width = intOfFloat(text.image_width, 0);
  const height = intOfFloat(text.image_height, 0);

  // The JSON export is built from normalized_coords. A legacy row that only
  // has pixels would otherwise vanish, so derive them when the size is known.
  if (!normalized && pixel && width && height) {
    const px = geo.parseMultiPolys(pixel);
    if (px.length) normalized = geo.fmtPolys(geo.polysToNorm(px, width, height));
  }

  const classes = parseShapeClasses(text.shape_classes, count);

  return {
    image_name: fname,
    roi_key: roiKey,
    site_id: siteId,
    cam_number: camNumber,
    pixel_coords: pixel,
    normalized_coords: normalized,
    total_polygons: intOfFloat(text.total_polygons, count),
    image_width: width,
    image_height: height,
    row_type: rowType,
    comment: text.comment ?? "",
    // padded to the polygon count, so a file written before the column
    // existed describes plain polygons
    shape_types: count ? geo.fmtShapeTypes(geo.parseShapeTypes(text.shape_types, count)) : "",
    shape_classes: count && !classesAreDefault(classes) ? geo.jsonSpaced(classes) : "",
  };
}

/**
 * Read the shape_classes cell, padded to `count` with the default class. A
 * missing cell is the normal case for anything the desktop app wrote.
 */
export function parseShapeClasses(cell: unknown, count = 0): string[] {
  const classes: string[] = [];
  if (cell) {
    let s = String(cell).trim();
    if (s.startsWith("'")) s = s.slice(1).trim();
    try {
      const parsed: unknown = JSON.parse(s);
      if (Array.isArray(parsed)) {
        for (const c of parsed) classes.push(String(c) || DEFAULT_CLASS);
      }
    } catch {
      // an unreadable cell simply means no classes were recorded
    }
  }
  if (count) {
    while (classes.length < count) classes.push(DEFAULT_CLASS);
    return classes.slice(0, count);
  }
  return classes;
}

// ── row collections ───────────────────────────────────────────

export function purgeRows(rows: readonly CanonRow[], fname: string): CanonRow[] {
  return rows.filter((r) => r.image_name !== fname);
}

export function rowsFor(rows: readonly CanonRow[], fname: string): CanonRow[] {
  return rows.filter((r) => r.image_name === fname);
}

export function rowFor(rows: readonly CanonRow[], fname: string): CanonRow | null {
  return rows.find((r) => r.image_name === fname) ?? null;
}

/** Unique image names, in first-seen order. */
export function imageNames(rows: readonly CanonRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    if (!seen.has(row.image_name)) {
      seen.add(row.image_name);
      out.push(row.image_name);
    }
  }
  return out;
}

/** Reduce a row to one spreadsheet layout's columns. */
export function project(
  row: CanonRow,
  view: readonly string[],
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const key of view) {
    if (key === "roi_coordinate") {
      out[key] = row.normalized_coords ?? "";
    } else {
      out[key] = (row as unknown as Record<string, string | number>)[key] ?? "";
    }
  }
  return out;
}

// ── JSON build ────────────────────────────────────────────────

export interface FullJson {
  generated_at: string;
  generator: string;
  source_folder: string;
  coordinate_space: string;
  decimals: number;
  roi_count: number;
  no_roi_count: number;
  total_polygons: number;
  rois: Record<string, MultiPoly>;
  shapes: Record<string, string[]>;
  classes?: Record<string, string[]>;
  no_roi: string[];
  sources: Record<string, string[]>;
}

export interface BuildJsonResult {
  full: FullJson;
  map: Record<string, MultiPoly>;
  warnings: string[];
}

/** `datetime.now().isoformat(timespec="seconds")` — local time, no zone. */
function localIsoSeconds(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * Merge every image's polygons under its roi_key.
 *
 * Two images that share a site and camera (different timestamps) have their
 * polygon lists concatenated, in natural filename order. A key with at least
 * one ROI never appears in the no_roi list.
 */
export function buildJson(
  rows: readonly CanonRow[],
  folder = "",
  now: Date = new Date(),
): BuildJsonResult {
  const roiMap = new Map<string, MultiPoly>();
  const shapeMap = new Map<string, string[]>();
  const classMap = new Map<string, string[]>();
  const sources = new Map<string, string[]>();
  const noRoiKeys: string[] = [];
  const warnings: string[] = [];

  const ordered = [...rows].sort((a, b) => geo.naturalCompare(a.image_name, b.image_name));
  for (const row of ordered) {
    const key = String(row.roi_key ?? "").trim();
    const fname = row.image_name ?? "";
    if (!key) {
      warnings.push(`no roi_key for ${fname}`);
      continue;
    }
    if (row.row_type === "roi") {
      const polys = geo.parseMultiPolys(row.normalized_coords);
      if (polys.length === 0) {
        // An ROI row that cannot be normalised would vanish from the JSON.
        // Say so rather than quietly shipping a short file.
        if (row.pixel_coords) {
          warnings.push(
            `${fname} has pixel coords but no image size - re-save it to include it in the JSON`,
          );
        }
        continue;
      }
      if (roiMap.has(key)) warnings.push(`merged ${fname} into ${key}`);
      roiMap.set(key, [...(roiMap.get(key) ?? []), ...polys]);
      shapeMap.set(key, [
        ...(shapeMap.get(key) ?? []),
        ...geo.parseShapeTypes(row.shape_types, polys.length),
      ]);
      classMap.set(key, [
        ...(classMap.get(key) ?? []),
        ...parseShapeClasses(row.shape_classes, polys.length),
      ]);
      sources.set(key, [...(sources.get(key) ?? []), fname]);
    } else if (row.row_type === "no_roi") {
      if (!noRoiKeys.includes(key)) noRoiKeys.push(key);
      sources.set(key, [...(sources.get(key) ?? []), fname]);
    }
    // a "comment" row contributes nothing to the JSON
  }

  const liveNoRoi = noRoiKeys.filter((k) => !roiMap.has(k));
  const roiKeysSorted = [...roiMap.keys()].sort(geo.naturalCompare);

  const rounded: Record<string, MultiPoly> = {};
  for (const key of roiKeysSorted) {
    rounded[key] = (roiMap.get(key) ?? []).map((poly) =>
      poly.map(([x, y]): [number, number] => [
        geo.pyRound(x, NDIGITS),
        geo.pyRound(y, NDIGITS),
      ]),
    );
  }

  const shapes: Record<string, string[]> = {};
  for (const key of roiKeysSorted) shapes[key] = shapeMap.get(key) ?? [];

  const sourcesOut: Record<string, string[]> = {};
  for (const key of [...sources.keys()].sort(geo.naturalCompare)) {
    sourcesOut[key] = sources.get(key) ?? [];
  }

  const full: FullJson = {
    generated_at: localIsoSeconds(now),
    generator: `ROI Studio v${APP_VERSION}`,
    source_folder: folder,
    coordinate_space: "normalized",
    decimals: NDIGITS,
    roi_count: roiKeysSorted.length,
    no_roi_count: liveNoRoi.length,
    total_polygons: roiKeysSorted.reduce((sum, k) => sum + (rounded[k]?.length ?? 0), 0),
    rois: rounded,
    shapes,
    no_roi: [...liveNoRoi].sort(geo.naturalCompare),
    sources: sourcesOut,
  };

  // Only carried when the batch actually uses classes, so an un-classed batch
  // produces exactly the file the desktop app would.
  const usesClasses = roiKeysSorted.some((k) =>
    (classMap.get(k) ?? []).some((c) => c && c !== DEFAULT_CLASS),
  );
  if (usesClasses) {
    const classes: Record<string, string[]> = {};
    for (const key of roiKeysSorted) classes[key] = classMap.get(key) ?? [];
    full.classes = classes;
  }

  return { full, map: rounded, warnings };
}

// ── serialisation ─────────────────────────────────────────────

/**
 * Coordinates in the JSON files are Python floats, so a whole number is
 * written `0.0` rather than `0`. (The spreadsheet cell is the opposite: it
 * keeps whole numbers whole, which is what `fmtPolys` does.) JavaScript has
 * only one number type, so the distinction has to be restored here.
 */
function jsonSpacedFloats(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => jsonSpacedFloats(item)).join(", ")}]`;
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? `${value}.0` : String(value);
  }
  return JSON.stringify(value);
}

/**
 * Render `{"KEY": [[[x, y], ...]], ...}` with one line per key.
 *
 * `JSON.stringify(value, null, 2)` puts every single number on its own line,
 * which makes a 500-camera map unreadable.
 */
function compactMapBlock(
  mapping: Record<string, unknown>,
  itemIndent = "  ",
  closeIndent = "",
  floats = false,
): string {
  const keys = Object.keys(mapping);
  if (keys.length === 0) return "{}";
  const render = floats ? jsonSpacedFloats : geo.jsonSpaced;
  const parts = keys.map((k) => `${itemIndent}${JSON.stringify(k)}: ${render(mapping[k])}`);
  return `{\n${parts.join(",\n")}\n${closeIndent}}`;
}

/** The map file: one roi_key per line. */
export function dumpMapJson(roiMap: Record<string, MultiPoly>): string {
  return `${compactMapBlock(roiMap, "    ", "", true)}\n`;
}

/** The full record: metadata pretty-printed, coordinate maps compact. */
export function dumpFullJson(full: FullJson): string {
  const skip = new Set(["rois", "no_roi", "sources", "shapes", "classes"]);
  const lines = ["{"];
  for (const key of Object.keys(full)) {
    if (skip.has(key)) continue;
    const value = (full as unknown as Record<string, unknown>)[key];
    lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)},`);
  }
  lines.push(`  "rois": ${compactMapBlock(full.rois, "    ", "  ", true)},`);
  lines.push(`  "shapes": ${compactMapBlock(full.shapes, "    ", "  ")},`);
  if (full.classes) {
    lines.push(`  "classes": ${compactMapBlock(full.classes, "    ", "  ")},`);
  }
  lines.push(`  "no_roi": ${geo.jsonSpaced(full.no_roi)},`);
  lines.push(`  "sources": ${compactMapBlock(full.sources, "    ", "  ")}`);
  lines.push("}");
  return `${lines.join("\n")}\n`;
}
