/**
 * The spreadsheet, built to match what `openpyxl` writes in
 * `_write_xlsx` (`apps/roi-studio/roi_studio/core/store.py`).
 *
 * The formatting is not decoration: coordinate cells carry text like
 * `[[[231, 203], ...]]`, and without the `"@"` text format Excel rewrites
 * them, so a saved batch would no longer parse. Site ids like `007` would
 * likewise lose their leading zeros.
 *
 * `exceljs` is the one dependency in this package. It is imported lazily so a
 * page that never saves never pays for it, and it resolves to a prebuilt
 * browser bundle when bundled for the web.
 */

import {
  COLUMN_WIDTHS,
  DEFAULT_COLUMN_WIDTH,
  FULL_VIEW,
  HEADER_FILL,
  SITE_VIEW,
  TEXT_COLUMNS,
} from "./config.ts";
import { project, type CanonRow } from "./store.ts";

/** The column layout to write: the full schema, or the reduced site layout. */
export function viewColumns(useSiteFormat = false): readonly string[] {
  return useSiteFormat ? SITE_VIEW : FULL_VIEW;
}

export interface WorkbookOptions {
  /** Defaults to {@link FULL_VIEW}. */
  columns?: readonly string[];
  sheetName?: string;
}

/**
 * Build `roi_annotations.xlsx` and return its bytes.
 *
 * One sheet, one row per image, a frozen and filterable header, and every
 * text column pinned to text so nothing is reinterpreted on the way back in.
 */
export async function buildWorkbook(
  rows: readonly CanonRow[],
  options: WorkbookOptions = {},
): Promise<Uint8Array> {
  const columns = options.columns ?? FULL_VIEW;
  const { default: ExcelJS } = await import("exceljs");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ROI Studio";
  const sheet = workbook.addWorksheet(options.sheetName ?? "ROI");

  sheet.columns = columns.map((name) => ({
    header: name,
    key: name,
    width: COLUMN_WIDTHS[name] ?? DEFAULT_COLUMN_WIDTH,
  }));

  const header = sheet.getRow(1);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${HEADER_FILL}` },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  for (const row of rows) {
    const added = sheet.addRow(project(row, columns));
    // text format on the data cells only, exactly as openpyxl does it
    columns.forEach((name, i) => {
      if (TEXT_COLUMNS.has(name)) added.getCell(i + 1).numFmt = "@";
    });
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  if (rows.length) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: columns.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

/**
 * Read a spreadsheet back into raw rows, keyed by its header.
 *
 * The values are returned as written, so the caller passes each one through
 * `canonicalize` to bring an older or hand-edited file up to the current
 * schema. Never throws: an unreadable file yields no rows, so one bad
 * spreadsheet cannot stop a folder from opening.
 */
export async function parseWorkbook(
  bytes: Uint8Array,
): Promise<Record<string, unknown>[]> {
  let ExcelJS;
  try {
    ({ default: ExcelJS } = await import("exceljs"));
  } catch {
    return [];
  }
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("ROI") ?? workbook.worksheets[0];
    if (!sheet) return [];

    const header: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      header[col - 1] = String(cell.value ?? "").trim();
    });
    if (header.length === 0) return [];

    const rows: Record<string, unknown>[] = [];
    for (let r = 2; r <= sheet.rowCount; r += 1) {
      const row = sheet.getRow(r);
      const out: Record<string, unknown> = {};
      let hasValue = false;
      header.forEach((name, i) => {
        if (!name) return;
        const raw = row.getCell(i + 1).value;
        // a formula or rich-text cell still has a plain result to read
        const value =
          raw && typeof raw === "object"
            ? ((raw as { result?: unknown; text?: unknown }).result ??
              (raw as { text?: unknown }).text ??
              "")
            : raw;
        if (value !== null && value !== undefined && value !== "") hasValue = true;
        out[name] = value ?? "";
      });
      if (hasValue) rows.push(out);
    }
    return rows;
  } catch {
    return [];
  }
}
