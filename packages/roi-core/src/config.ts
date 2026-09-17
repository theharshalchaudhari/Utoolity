/**
 * Constants shared by every part of the ROI tool.
 *
 * These mirror `apps/roi-studio/roi_studio/config.py` so a batch annotated in
 * the browser and a batch annotated in the desktop app produce the same files.
 * Changing a value here changes the output format, so keep the two in step.
 */

export const APP_NAME = "ROI Studio";
export const APP_VERSION = "1.0.0";
export const APP_AUTHOR = "Ashaz Qureshi";

/** Output file names, written beside the images. */
export const XLSX_NAME = "roi_annotations.xlsx";
export const JSON_NAME = "roi_annotations.json";
export const MAP_NAME = "roi_map.json";
export const REPORT_NAME = "roi_report.html";
export const COVERAGE_NAME = "roi_coverage.json";

/** Subfolders created inside the batch folder. */
export const NO_ROI_DIR = "no_roi";
export const PRINTED_DIR = "printed_roi";

export const IMG_EXTS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".bmp",
  ".gif",
  ".ppm",
  ".pgm",
  ".webp",
  ".tif",
  ".tiff",
] as const;

/** Shape limits and validation thresholds. */
export const MIN_POINTS = 3;
export const MAX_POINTS_PER_POLY = 500;
export const MAX_POLYS_PER_IMAGE = 50;
export const MIN_POLY_AREA_PX = 4.0;

/** Normalised coordinate precision. The YOLO exporter overrides this to 6. */
export const NDIGITS = 2;
export const YOLO_NDIGITS = 6;

/** Points used to draw a circle or ellipse as a polygon. */
export const CIRCLE_SEGMENTS = 64;

/** Screen-space hit tolerances, in CSS pixels before the zoom factor. */
export const SNAP_RADIUS = 12.0;
export const VERTEX_RADIUS = 7.0;
export const EDGE_TOLERANCE = 6.0;

export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 32.0;
export const ZOOM_STEP = 1.15;

export const MAX_UNDO_STEPS = 200;

export const SHAPE_POLYGON = "polygon";
export const SHAPE_RECT = "rect";
export const SHAPE_CIRCLE = "circle";
export const SHAPE_TYPES = [SHAPE_POLYGON, SHAPE_RECT, SHAPE_CIRCLE] as const;
export type ShapeKind = (typeof SHAPE_TYPES)[number];

export const ROW_TYPES = ["roi", "no_roi", "comment"] as const;
export type RowType = (typeof ROW_TYPES)[number];

/**
 * The default ROI class. The desktop app has no notion of classes and writes
 * every region as "roi", so this is what an un-classed shape reads back as.
 */
export const DEFAULT_CLASS = "roi";

/**
 * The canonical row. `shape_classes` is the one column the desktop app does
 * not write; it is optional everywhere and absent means "all DEFAULT_CLASS".
 */
export const CANON_COLUMNS = [
  "image_name",
  "roi_key",
  "site_id",
  "cam_number",
  "pixel_coords",
  "normalized_coords",
  "total_polygons",
  "image_width",
  "image_height",
  "row_type",
  "comment",
  "shape_types",
  "shape_classes",
] as const;
export type CanonColumn = (typeof CANON_COLUMNS)[number];

export const FULL_VIEW: readonly string[] = [...CANON_COLUMNS];

/** The reduced layout, where the two coordinate columns collapse into one. */
export const SITE_VIEW: readonly string[] = [
  "image_name",
  "roi_key",
  "site_id",
  "cam_number",
  "roi_coordinate",
  "total_polygons",
  "row_type",
  "comment",
  "shape_types",
  "shape_classes",
];

/** Columns forced to Excel text format, so coordinates survive a round trip. */
export const TEXT_COLUMNS: ReadonlySet<string> = new Set([
  "image_name",
  "roi_key",
  "site_id",
  "cam_number",
  "pixel_coords",
  "normalized_coords",
  "roi_coordinate",
  "row_type",
  "comment",
  "shape_types",
  "shape_classes",
]);

export const COLUMN_WIDTHS: Readonly<Record<string, number>> = {
  image_name: 46,
  roi_key: 18,
  site_id: 14,
  cam_number: 11,
  pixel_coords: 60,
  normalized_coords: 60,
  roi_coordinate: 60,
  total_polygons: 14,
  image_width: 12,
  image_height: 12,
  row_type: 10,
  comment: 30,
  shape_types: 22,
  shape_classes: 22,
};

export const DEFAULT_COLUMN_WIDTH = 16;

/** Header fill used by the desktop spreadsheet. */
export const HEADER_FILL = "2F6BD8";

export const DEFAULT_SETTINGS = {
  theme: "dark",
  use_site_format: false,
  printed_roi_colour: "#00dc64",
  printed_roi_fill_alpha: 70,
  printed_roi_line_width: 3,
  printed_label_colour: "#ffff00",
  roi_opacity: 28,
  roi_line_width: 2,
  show_crosshair: true,
  show_coordinates: true,
  snap_to_edges: true,
  snap_to_shapes: true,
  auto_advance_on_save: true,
  confirm_clear_all: true,
} as const;
