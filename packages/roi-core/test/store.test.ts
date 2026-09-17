/**
 * Parity tests for the row schema and the JSON files.
 *
 * The expected file text here was produced by
 * `apps/roi-studio/roi_studio/core/store.py`, whitespace included. These are
 * the files downstream code reads, so the comparison is deliberately on the
 * exact text rather than on a parsed structure.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { polysToNorm } from "../src/geometry.ts";
import type { MultiPoly } from "../src/geometry.ts";
import * as store from "../src/store.ts";
import type { CanonRow } from "../src/store.ts";

const FIXED = new Date(2026, 8, 17, 12, 0, 0);

const tri = (a: number, b: number): MultiPoly => [
  [
    [a, a],
    [b, a],
    [b, b],
  ],
];

function sampleRows(): CanonRow[] {
  return [
    store.makeRow({
      fname: "S1_cam1_a.jpg",
      rowType: "roi",
      polysPx: tri(10, 90),
      normPolys: polysToNorm(tri(10, 90), 100, 100),
      width: 100,
      height: 100,
      kinds: ["rect"],
    }),
    store.makeRow({
      fname: "S1_cam1_b.jpg",
      rowType: "roi",
      polysPx: tri(20, 80),
      normPolys: polysToNorm(tri(20, 80), 100, 100),
      comment: "second frame",
      width: 100,
      height: 100,
      kinds: ["circle"],
    }),
    store.makeRow({
      fname: "S2_cam2_a.jpg",
      rowType: "roi",
      polysPx: tri(0, 50),
      normPolys: polysToNorm(tri(0, 50), 100, 100),
      width: 100,
      height: 100,
    }),
    store.makeRow({
      fname: "S3_cam3_a.jpg",
      rowType: "no_roi",
      comment: "nothing here",
      width: 100,
      height: 100,
    }),
  ];
}

test("makeRow fills the canonical row from the filename", () => {
  const row = sampleRows()[0]!;
  assert.deepEqual(row, {
    image_name: "S1_cam1_a.jpg",
    roi_key: "S1_1",
    site_id: "S1",
    cam_number: "cam1",
    pixel_coords: "[[[10, 10], [90, 10], [90, 90]]]",
    normalized_coords: "[[[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]]]",
    total_polygons: 1,
    image_width: 100,
    image_height: 100,
    row_type: "roi",
    comment: "",
    shape_types: '["rect"]',
    shape_classes: "",
  });
});

test("a no_roi row carries no geometry and no count", () => {
  const row = sampleRows()[3]!;
  assert.equal(row.row_type, "no_roi");
  assert.equal(row.total_polygons, 0);
  assert.equal(row.pixel_coords, "");
  assert.equal(row.shape_types, "");
  assert.equal(row.comment, "nothing here");
  assert.equal(row.roi_key, "S3_3");
});

test("buildJson merges images that share a camera, and warns about it", () => {
  const { full, warnings } = store.buildJson(sampleRows(), "/batch", FIXED);
  assert.deepEqual(warnings, ["merged S1_cam1_b.jpg into S1_1"]);
  assert.equal(full.roi_count, 2);
  assert.equal(full.no_roi_count, 1);
  assert.equal(full.total_polygons, 3);
  // both frames' polygons land under the one camera key
  assert.equal(full.rois.S1_1?.length, 2);
  assert.deepEqual(full.shapes.S1_1, ["rect", "circle"]);
  assert.deepEqual(full.no_roi, ["S3_3"]);
  assert.deepEqual(full.sources.S1_1, ["S1_cam1_a.jpg", "S1_cam1_b.jpg"]);
});

test("a key with any ROI never appears in no_roi", () => {
  const rows = [
    store.makeRow({ fname: "S1_cam1_a.jpg", rowType: "no_roi" }),
    store.makeRow({
      fname: "S1_cam1_b.jpg",
      rowType: "roi",
      polysPx: tri(10, 90),
      normPolys: polysToNorm(tri(10, 90), 100, 100),
      width: 100,
      height: 100,
    }),
  ];
  const { full } = store.buildJson(rows, "/batch", FIXED);
  assert.deepEqual(full.no_roi, []);
  assert.equal(full.roi_count, 1);
});

test("a row with no roi_key is reported rather than dropped silently", () => {
  const row = store.makeRow({ fname: "x.jpg", rowType: "roi" });
  const { warnings } = store.buildJson([{ ...row, roi_key: "" }], "/batch", FIXED);
  assert.deepEqual(warnings, ["no roi_key for x.jpg"]);
});

test("pixel coords with no image size are reported, not quietly shipped", () => {
  const row = store.makeRow({
    fname: "S1_cam1_a.jpg",
    rowType: "roi",
    polysPx: tri(10, 90),
    // no normPolys, because the size was unknown
  });
  const { warnings, full } = store.buildJson([row], "/batch", FIXED);
  assert.deepEqual(warnings, [
    "S1_cam1_a.jpg has pixel coords but no image size - re-save it to include it in the JSON",
  ]);
  assert.equal(full.roi_count, 0);
});

test("dumpFullJson writes the exact file the desktop app writes", () => {
  const { full } = store.buildJson(sampleRows(), "/batch", FIXED);
  full.generated_at = "FIXED";
  assert.equal(
    store.dumpFullJson(full),
    `{
  "generated_at": "FIXED",
  "generator": "ROI Studio v1.0.0",
  "source_folder": "/batch",
  "coordinate_space": "normalized",
  "decimals": 2,
  "roi_count": 2,
  "no_roi_count": 1,
  "total_polygons": 3,
  "rois": {
    "S1_1": [[[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]], [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8]]],
    "S2_2": [[[0.0, 0.0], [0.5, 0.0], [0.5, 0.5]]]
  },
  "shapes": {
    "S1_1": ["rect", "circle"],
    "S2_2": ["polygon"]
  },
  "no_roi": ["S3_3"],
  "sources": {
    "S1_1": ["S1_cam1_a.jpg", "S1_cam1_b.jpg"],
    "S2_2": ["S2_cam2_a.jpg"],
    "S3_3": ["S3_cam3_a.jpg"]
  }
}
`,
  );
});

test("dumpMapJson writes one camera per line", () => {
  const { map } = store.buildJson(sampleRows(), "/batch", FIXED);
  assert.equal(
    store.dumpMapJson(map),
    `{
    "S1_1": [[[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]], [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8]]],
    "S2_2": [[[0.0, 0.0], [0.5, 0.0], [0.5, 0.5]]]
}
`,
  );
});

test("an empty batch still serialises to valid JSON", () => {
  const { full, map } = store.buildJson([], "/batch", FIXED);
  assert.equal(store.dumpMapJson(map), "{}\n");
  const text = store.dumpFullJson(full);
  assert.doesNotThrow(() => JSON.parse(text) as unknown);
  assert.match(text, /"rois": \{\}/);
});

test("classes are written only when the batch actually uses them", () => {
  const plain = store.buildJson(sampleRows(), "/batch", FIXED).full;
  assert.equal(plain.classes, undefined);
  assert.equal(store.dumpFullJson(plain).includes('"classes"'), false);

  const classed = store.makeRow({
    fname: "S1_cam1_a.jpg",
    rowType: "roi",
    polysPx: tri(10, 90),
    normPolys: polysToNorm(tri(10, 90), 100, 100),
    width: 100,
    height: 100,
    kinds: ["rect"],
    classes: ["vehicle"],
  });
  assert.equal(classed.shape_classes, '["vehicle"]');
  const { full } = store.buildJson([classed], "/batch", FIXED);
  assert.deepEqual(full.classes?.S1_1, ["vehicle"]);
  assert.match(store.dumpFullJson(full), /"classes": \{\n {4}"S1_1": \["vehicle"\]\n {2}\}/);
});

test("canonicalize recovers a legacy site-layout row", () => {
  const row = store.canonicalize({
    site_id: "OLD_cam7_x.jpg",
    roi_coordinate: "[[0.1,0.1],[0.9,0.1],[0.9,0.9]]",
  });
  assert.equal(row.image_name, "OLD_cam7_x.jpg");
  assert.equal(row.roi_key, "OLD_7");
  assert.equal(row.normalized_coords, "[[[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]]]");
  assert.equal(row.shape_types, '["polygon"]');
  // the raw site_id wins over the derived one, as upstream
  assert.equal(row.site_id, "OLD_cam7_x.jpg");
});

test("canonicalize derives normalized coords from pixels when the size is known", () => {
  const row = store.canonicalize({
    image_name: "P_cam2_z.png",
    pixel_coords: "[[[10,10],[90,10],[90,90]]]",
    image_width: "100",
    image_height: "100",
  });
  assert.equal(row.normalized_coords, "[[[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]]]");
  assert.equal(row.roi_key, "P_2");
});

test("canonicalize survives junk in the numeric cells", () => {
  const row = store.canonicalize({
    image_name: "J_cam1_a.jpg",
    total_polygons: "abc",
    image_width: "12.9",
    image_height: "",
  });
  assert.equal(row.total_polygons, 0);
  assert.equal(row.image_width, 12);
  assert.equal(row.image_height, 0);
  assert.equal(row.row_type, "roi");
});

test("canonicalize reads back a classed row", () => {
  const row = store.canonicalize({
    image_name: "S1_cam1_a.jpg",
    pixel_coords: "[[[10,10],[90,10],[90,90]]]",
    image_width: "100",
    image_height: "100",
    shape_classes: '["vehicle"]',
  });
  assert.equal(row.shape_classes, '["vehicle"]');
  // a missing cell is the normal case and pads to the default class
  assert.deepEqual(store.parseShapeClasses("", 2), ["roi", "roi"]);
  assert.deepEqual(store.parseShapeClasses('["sky"]', 3), ["sky", "roi", "roi"]);
  assert.deepEqual(store.parseShapeClasses("not json", 1), ["roi"]);
});

test("row collection helpers", () => {
  const rows = sampleRows();
  assert.deepEqual(store.imageNames(rows), [
    "S1_cam1_a.jpg",
    "S1_cam1_b.jpg",
    "S2_cam2_a.jpg",
    "S3_cam3_a.jpg",
  ]);
  assert.equal(store.purgeRows(rows, "S1_cam1_a.jpg").length, 3);
  assert.equal(store.rowsFor(rows, "S1_cam1_b.jpg").length, 1);
  assert.equal(store.rowFor(rows, "nope.jpg"), null);
  assert.deepEqual(store.project(rows[0]!, ["image_name", "roi_coordinate", "shape_types"]), {
    image_name: "S1_cam1_a.jpg",
    roi_coordinate: "[[[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]]]",
    shape_types: '["rect"]',
  });
});
