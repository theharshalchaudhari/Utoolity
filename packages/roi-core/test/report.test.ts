/**
 * Parity tests for the batch statistics.
 *
 * The expected numbers come from `build_stats` in
 * `apps/roi-studio/roi_studio/core/report.py`, so the web dashboard and the
 * desktop dashboard agree, and roi_coverage.json is interchangeable.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { polysToNorm } from "../src/geometry.ts";
import type { MultiPoly } from "../src/geometry.ts";
import * as rp from "../src/report.ts";
import { makeRow, type CanonRow } from "../src/store.ts";

// 1250px of a 100x100 frame = 12.5%
const QUARTER: MultiPoly = [
  [
    [0, 0],
    [50, 0],
    [50, 50],
  ],
];
// the whole frame = 100%
const FULL: MultiPoly = [
  [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
  ],
];

const FILES = ["S1_cam1_a.jpg", "S1_cam1_b.jpg", "S2_cam2_a.jpg", "S3_cam3_z.jpg"];

function rows(): CanonRow[] {
  return [
    makeRow({
      fname: "S1_cam1_a.jpg",
      rowType: "roi",
      polysPx: QUARTER,
      normPolys: polysToNorm(QUARTER, 100, 100),
      comment: "has a note",
      width: 100,
      height: 100,
      kinds: ["rect"],
    }),
    makeRow({
      fname: "S1_cam1_b.jpg",
      rowType: "roi",
      polysPx: FULL,
      normPolys: polysToNorm(FULL, 100, 100),
      width: 100,
      height: 100,
      kinds: ["circle"],
    }),
    makeRow({ fname: "S2_cam2_a.jpg", rowType: "no_roi", width: 100, height: 100 }),
  ];
}

test("totals match the desktop dashboard", () => {
  const { totals } = rp.buildStats(rows(), FILES, "/batch");
  assert.deepEqual(totals, {
    images: 4,
    annotated: 2,
    no_roi: 1,
    polygons: 2,
    cameras: 3,
    cameras_covered: 1,
    cameras_no_roi: 1,
    kinds: { polygon: 0, rect: 1, circle: 1 },
    folder: "/batch",
    remaining: 1,
    cameras_missing: ["S3_3"],
    mean_coverage: 56.25,
  });
});

test("per-camera coverage is the highest single frame, not a sum", () => {
  const { cameras } = rp.buildStats(rows(), FILES, "/batch");
  assert.deepEqual(cameras, [
    {
      roi_key: "S1_1",
      site_id: "S1",
      cam_number: "cam1",
      images: 2,
      annotated: 2,
      no_roi: 0,
      todo: 0,
      polygons: 2,
      coverage: 100,
    },
    {
      roi_key: "S2_2",
      site_id: "S2",
      cam_number: "cam2",
      images: 1,
      annotated: 0,
      no_roi: 1,
      todo: 0,
      polygons: 0,
      coverage: 0,
    },
    {
      roi_key: "S3_3",
      site_id: "S3",
      cam_number: "cam3",
      images: 1,
      annotated: 0,
      no_roi: 0,
      todo: 1,
      polygons: 0,
      coverage: 0,
    },
  ]);
});

test("images in the folder but never annotated still appear, as todo", () => {
  const { images } = rp.buildStats(rows(), FILES, "/batch");
  assert.deepEqual(images.map((i) => i.image_name), FILES);
  assert.deepEqual(images[0], {
    image_name: "S1_cam1_a.jpg",
    roi_key: "S1_1",
    site_id: "S1",
    cam_number: "cam1",
    polygons: 1,
    kinds: ["rect"],
    status: "roi",
    comment: "has a note",
    width: 100,
    height: 100,
    coverage: 12.5,
    in_folder: true,
  });
  // the untouched file is discovered from the folder listing alone
  assert.deepEqual(images[3], {
    image_name: "S3_cam3_z.jpg",
    roi_key: "S3_3",
    site_id: "S3",
    cam_number: "cam3",
    polygons: 0,
    kinds: [],
    status: "todo",
    comment: "",
    width: 0,
    height: 0,
    coverage: 0,
    in_folder: true,
  });
});

test("an ROI beats a later no_roi for the same image", () => {
  const mixed = [
    rows()[0]!,
    makeRow({ fname: "S1_cam1_a.jpg", rowType: "no_roi", width: 100, height: 100 }),
  ];
  const { images } = rp.buildStats(mixed, [], "/batch");
  assert.equal(images[0]?.status, "roi");
});

test("coverage falls back to normalised area when the size is unknown", () => {
  const row = makeRow({
    fname: "S1_cam1_a.jpg",
    rowType: "roi",
    normPolys: polysToNorm(QUARTER, 100, 100),
  });
  const { images } = rp.buildStats([{ ...row, pixel_coords: "" }], [], "/batch");
  // 0.125 of the frame, from the normalised polygon's own area
  assert.equal(images[0]?.coverage, 12.5);
});

test("an empty batch produces zeroed totals rather than throwing", () => {
  const { totals, images, cameras } = rp.buildStats([], [], "");
  assert.equal(totals.images, 0);
  assert.equal(totals.mean_coverage, 0);
  assert.deepEqual(images, []);
  assert.deepEqual(cameras, []);
});

test("coverage JSON carries the totals and the per-camera rows", () => {
  const stats = rp.buildStats(rows(), FILES, "/batch");
  const text = rp.dumpCoverageJson(stats, new Date(2026, 8, 17, 12, 0, 0));
  const parsed = JSON.parse(text) as {
    generator: string;
    totals: { images: number; mean_coverage: number };
    cameras: { roi_key: string }[];
  };
  assert.equal(parsed.generator, "ROI Studio v1.0.0");
  assert.equal(parsed.totals.images, 4);
  assert.equal(parsed.totals.mean_coverage, 56.25);
  assert.deepEqual(parsed.cameras.map((c) => c.roi_key), ["S1_1", "S2_2", "S3_3"]);
  // floats keep their Python spelling, so a whole coverage reads 100.0
  assert.match(text, /"coverage": 100\.0/);
  assert.match(text, /"generated_at": "2026-09-17T12:00:00"/);
});

test("the HTML report is self-contained and escapes user text", () => {
  const nasty = makeRow({
    fname: "S9_cam9_x.jpg",
    rowType: "roi",
    polysPx: QUARTER,
    normPolys: polysToNorm(QUARTER, 100, 100),
    comment: '<script>alert("x")</script>',
    width: 100,
    height: 100,
  });
  const html = rp.renderReportHtml(rp.buildStats([nasty], [], "/batch"));
  assert.match(html, /^<!doctype html>/);
  // no network dependency at all
  assert.equal(/<(script|link)\b/i.test(html), false);
  assert.equal(html.includes("<script>alert"), false);
  assert.match(html, /&lt;script&gt;/);
  // the numbers made it in
  assert.match(html, /ROI batch report/);
  assert.match(html, /12\.5%/);
});

test("the report renders an empty batch without a division by zero", () => {
  const html = rp.renderReportHtml(rp.buildStats([], [], "/batch"));
  assert.match(html, /Nothing drawn yet/);
  assert.equal(html.includes("NaN"), false);
});
