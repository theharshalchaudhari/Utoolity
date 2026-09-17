/**
 * Tests for the spreadsheet.
 *
 * The formatting here is load-bearing: a coordinate cell must come back as the
 * text that went in, or a saved batch stops parsing. `test/compat.test.ts` also reads
 * one of these files with openpyxl, the library the desktop app uses.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { parseMultiPolys, polysToNorm } from "../src/geometry.ts";
import type { MultiPoly } from "../src/geometry.ts";
import { canonicalize, makeRow, type CanonRow } from "../src/store.ts";
import { buildWorkbook, parseWorkbook, viewColumns } from "../src/xlsx.ts";

const POLY: MultiPoly = [
  [
    [231, 203],
    [494, 280],
    [400, 480],
  ],
];

function rows(): CanonRow[] {
  return [
    makeRow({
      fname: "S1_cam1_a.jpg",
      rowType: "roi",
      polysPx: POLY,
      normPolys: polysToNorm(POLY, 640, 480),
      comment: "first",
      width: 640,
      height: 480,
      kinds: ["polygon"],
    }),
    makeRow({ fname: "S2_cam2_a.jpg", rowType: "no_roi", width: 640, height: 480 }),
  ];
}

async function readBack(bytes: Uint8Array) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet("ROI");
  assert.ok(sheet, "expected a sheet named ROI");
  return sheet;
}

test("the workbook has the canonical header, frozen and filterable", async () => {
  const sheet = await readBack(await buildWorkbook(rows()));
  const header = sheet.getRow(1);
  assert.deepEqual(
    (header.values as unknown[]).slice(1),
    [...viewColumns(false)],
  );
  // the header stays visible while scrolling a long batch
  assert.equal(sheet.views[0]?.state, "frozen");
  assert.equal((sheet.views[0] as { ySplit?: number }).ySplit, 1);
  // read back as a range string, the same form openpyxl's auto_filter.ref uses
  assert.equal(sheet.autoFilter, "A1:M3");
  const first = header.getCell(1);
  assert.equal(first.font?.bold, true);
  assert.equal((first.fill as { fgColor?: { argb?: string } })?.fgColor?.argb, "FF2F6BD8");
});

test("coordinate cells survive as text and parse straight back", async () => {
  const sheet = await readBack(await buildWorkbook(rows()));
  const columns = viewColumns(false);
  const pixelCol = columns.indexOf("pixel_coords") + 1;
  const cell = sheet.getRow(2).getCell(pixelCol);
  assert.equal(cell.numFmt, "@", "pixel coords must be pinned to text");
  assert.equal(cell.value, "[[[231, 203], [494, 280], [400, 480]]]");
  // the whole point of the text format: it still parses
  assert.deepEqual(parseMultiPolys(cell.value), POLY);
  // the header itself is not text-formatted, matching openpyxl
  assert.notEqual(sheet.getRow(1).getCell(pixelCol).numFmt, "@");
});

test("numeric columns stay numeric", async () => {
  const sheet = await readBack(await buildWorkbook(rows()));
  const columns = viewColumns(false);
  const widthCol = columns.indexOf("image_width") + 1;
  const cell = sheet.getRow(2).getCell(widthCol);
  assert.equal(cell.value, 640);
  assert.equal(cell.numFmt, undefined);
});

test("the site layout collapses the coordinate columns into one", async () => {
  const columns = viewColumns(true);
  assert.ok(columns.includes("roi_coordinate"));
  assert.equal(columns.includes("pixel_coords"), false);
  const sheet = await readBack(await buildWorkbook(rows(), { columns }));
  const coordCol = columns.indexOf("roi_coordinate") + 1;
  // The reduced layout carries the normalised coordinates. Note 400/640 is
  // exactly 0.625 and rounds to 0.62, not 0.63 — Python breaks halves towards
  // even, and a whole value is written bare as `1`.
  assert.equal(sheet.getRow(2).getCell(coordCol).value, "[[[0.36, 0.42], [0.77, 0.58], [0.62, 1]]]");
});

test("an empty batch still writes a valid, header-only sheet", async () => {
  const sheet = await readBack(await buildWorkbook([]));
  assert.equal(sheet.rowCount, 1);
  // no rows means no filter range to set
  assert.equal(sheet.autoFilter, undefined);
});

test("a written workbook reads back into canonical rows", async () => {
  const bytes = await buildWorkbook(rows());
  const raw = await parseWorkbook(bytes);
  assert.equal(raw.length, 2);
  assert.equal(raw[0]?.image_name, "S1_cam1_a.jpg");
  assert.equal(raw[0]?.pixel_coords, "[[[231, 203], [494, 280], [400, 480]]]");

  // and through canonicalize they are the rows we started with
  const restored = raw.map((r) => canonicalize(r));
  assert.deepEqual(restored[0], rows()[0]);
  assert.deepEqual(restored[1], rows()[1]);
});

test("parsing a file that is not a spreadsheet yields no rows", async () => {
  assert.deepEqual(await parseWorkbook(new Uint8Array([1, 2, 3, 4])), []);
  assert.deepEqual(await parseWorkbook(new Uint8Array()), []);
});
