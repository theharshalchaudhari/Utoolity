/**
 * Parity tests for the geometry port.
 *
 * Every expected value in this file was produced by running the desktop app's
 * own Python against the same input, so a failure here means the web tool and
 * the desktop app would write different files for the same annotation. To
 * regenerate a value, call the matching function in
 * `apps/roi-studio/roi_studio/core/geometry.py`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import * as geo from "../src/geometry.ts";
import type { Poly } from "../src/geometry.ts";

test("pyRound matches Python's round(), halves and all", () => {
  // exact halves break towards even
  assert.deepEqual(
    [0.5, 1.5, 2.5, 3.5, -0.5, -1.5, -2.5, 231.5, 230.5].map((v) => geo.pyRound(v)),
    [0, 2, 2, 4, 0, -2, -2, 232, 230],
  );
  // and these are decided by the exact binary value, not the scaled one
  assert.deepEqual(
    [0.125, 0.135, 0.145, 2.675, 0.005, 0.015].map((v) => geo.pyRound(v, 2)),
    [0.12, 0.14, 0.14, 2.67, 0.01, 0.01],
  );
});

test("makeRoiKey derives SITE_CAM from the filename", () => {
  assert.equal(geo.makeRoiKey("UBBRAP0091_cam3_2026-08-14_16-34-48.jpg"), "UBBRAP0091_3");
  assert.equal(geo.makeRoiKey("UBBRAP0226_cam03_x.png"), "UBBRAP0226_3");
  assert.equal(geo.makeRoiKey("S1_cam00_a.png"), "S1_0");
  assert.equal(geo.makeRoiKey("UBBRAP0091_left.jpg"), "UBBRAP0091");
  assert.equal(geo.makeRoiKey("weirdname.jpg"), "weirdname");
  assert.equal(geo.makeRoiKey("site_9.jpg"), "site_9");
  // a leading underscore leaves no site token, so the basename stands
  assert.equal(geo.makeRoiKey("_cam3_a.jpg"), "_cam3_a");
});

test("camDigits strips leading zeros but keeps a zero camera", () => {
  assert.deepEqual(
    ["cam3", "9", "cam03", "cam00", "left", ""].map((t) => geo.camDigits(t)),
    ["3", "9", "3", "0", "", ""],
  );
});

test("naturalCompare sorts img2 before img10, case-insensitively", () => {
  const names = ["img10.jpg", "img2.jpg", "img1.jpg", "IMG3.jpg", "a_b10", "a_b9"];
  assert.deepEqual([...names].sort(geo.naturalCompare), [
    "a_b9",
    "a_b10",
    "img1.jpg",
    "img2.jpg",
    "IMG3.jpg",
    "img10.jpg",
  ]);
});

test("fmtPolys writes the spaced JSON the desktop app writes", () => {
  assert.equal(
    geo.fmtPolys([
      [
        [231, 203],
        [400, 203],
        [400, 480],
      ],
    ]),
    "[[[231, 203], [400, 203], [400, 480]]]",
  );
  assert.equal(
    geo.fmtPolys([
      [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
      [
        [7, 8],
        [9, 10],
        [11, 12],
      ],
    ]),
    "[[[1, 2], [3, 4], [5, 6]], [[7, 8], [9, 10], [11, 12]]]",
  );
  // whole numbers stay whole, the rest round to NDIGITS
  assert.equal(
    geo.fmtPolys([
      [
        [1.0, 2.5],
        [3.456, 4.0],
        [5, 6],
      ],
    ]),
    "[[[1, 2.5], [3.46, 4], [5, 6]]]",
  );
  assert.equal(geo.fmtPolys([]), "");
});

test("parseMultiPolys accepts the current, legacy and Excel-mangled forms", () => {
  const one = [
    [
      [1, 2],
      [3, 4],
      [5, 6],
    ],
  ];
  assert.deepEqual(geo.parseMultiPolys("[[[1, 2], [3, 4], [5, 6]]]"), one);
  assert.deepEqual(geo.parseMultiPolys("[[1, 2], [3, 4], [5, 6]]"), one);
  assert.deepEqual(geo.parseMultiPolys("'[[[1, 2], [3, 4], [5, 6]]]"), one);
  // an unreadable cell must never throw, so one bad row cannot stop a folder
  assert.deepEqual(geo.parseMultiPolys("not json"), []);
  assert.deepEqual(geo.parseMultiPolys("nan"), []);
  assert.deepEqual(geo.parseMultiPolys("[[]]"), []);
  assert.deepEqual(geo.parseMultiPolys(null), []);
});

test("shape type cells round-trip and pad", () => {
  assert.equal(geo.fmtShapeTypes(["rect", "circle", "bogus"]), '["rect", "circle", "polygon"]');
  assert.deepEqual(geo.parseShapeTypes('["rect"]', 3), ["rect", "polygon", "polygon"]);
  assert.deepEqual(geo.parseShapeTypes("", 2), ["polygon", "polygon"]);
  assert.deepEqual(geo.parseShapeTypes('["rect","circle","polygon"]', 2), ["rect", "circle"]);
});

test("validatePolygon rejects only shapes that cannot describe a region", () => {
  const ok = geo.validatePolygon([
    [0, 0],
    [10, 0],
    [10, 10],
  ]);
  assert.deepEqual(ok.poly, [
    [0, 0],
    [10, 0],
    [10, 10],
  ]);
  assert.deepEqual(ok.messages, []);

  const dupes = geo.validatePolygon([
    [0, 0],
    [0, 0],
    [10, 0],
    [10, 10],
  ]);
  assert.deepEqual(dupes.messages, ["removed 1 duplicate point(s)"]);
  assert.equal(dupes.poly?.length, 3);

  // a closing click on the first point is a duplicate, not a fourth vertex
  const closed = geo.validatePolygon([
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 0],
  ]);
  assert.deepEqual(closed.messages, ["removed 1 duplicate point(s)"]);
  assert.equal(closed.poly?.length, 3);

  const tooFew = geo.validatePolygon([
    [0, 0],
    [1, 1],
  ]);
  assert.equal(tooFew.poly, null);
  assert.deepEqual(tooFew.messages, ["needs at least 3 distinct points"]);

  const collinear = geo.validatePolygon([
    [0, 0],
    [1, 0],
    [2, 0],
  ]);
  assert.equal(collinear.poly, null);
  assert.deepEqual(collinear.messages, ["shape has no area"]);

  // clamping is a warning, and truncates rather than rounds
  const clamped = geo.validatePolygon(
    [
      [-5, -5],
      [100, 0],
      [100, 100],
    ],
    50,
    50,
  );
  assert.deepEqual(clamped.poly, [
    [0, 0],
    [49, 0],
    [49, 49],
  ]);
  assert.deepEqual(clamped.messages, ["clamped point(s) back inside the image"]);
});

test("normalisation round-trips and honours the digit count", () => {
  assert.deepEqual(
    geo.polysToNorm(
      [
        [
          [0, 0],
          [50, 25],
          [100, 50],
        ],
      ],
      100,
      50,
    ),
    [
      [
        [0, 0],
        [0.5, 0.5],
        [1, 1],
      ],
    ],
  );
  // two decimals by default, six for the YOLO exporter
  const eighths: Poly = [
    [1, 1],
    [3, 3],
    [5, 5],
  ];
  assert.deepEqual(geo.polysToNorm([eighths], 8, 8), [
    [
      [0.12, 0.12],
      [0.38, 0.38],
      [0.62, 0.62],
    ],
  ]);
  assert.deepEqual(
    geo.polysToNorm(
      [
        [
          [1, 1],
          [3, 3],
        ],
      ],
      8,
      8,
      6,
    ),
    [
      [
        [0.125, 0.125],
        [0.375, 0.375],
      ],
    ],
  );
  assert.deepEqual(
    geo.normToPolys(
      [
        [
          [0, 0],
          [0.5, 0.5],
          [1, 1],
        ],
      ],
      100,
      50,
    ),
    [
      [
        [0, 0],
        [50, 25],
        [100, 50],
      ],
    ],
  );
  assert.deepEqual(geo.polysToNorm([eighths], 0, 0), []);
});

test("rectToPolygon normalises corners, clockwise from top-left", () => {
  assert.deepEqual(geo.rectToPolygon(10, 20, 5, 8), [
    [5, 8],
    [10, 8],
    [10, 20],
    [5, 20],
  ]);
});

test("circleToPolygon starts at 3 o'clock and drops repeated pixels", () => {
  assert.deepEqual(geo.circleToPolygon(50, 50, 10, null, 8), [
    [60, 50],
    [57, 57],
    [50, 60],
    [43, 57],
    [40, 50],
    [43, 43],
    [50, 40],
    [57, 43],
  ]);
  // a small radius rounds neighbouring segments onto the same pixel, so 64
  // segments do not mean 64 points
  assert.equal(geo.circleToPolygon(50, 50, 10).length, 56);
});

test("isAxisAlignedRect ignores vertex order", () => {
  assert.equal(
    geo.isAxisAlignedRect([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]),
    true,
  );
  assert.equal(
    geo.isAxisAlignedRect([
      [10, 10],
      [0, 0],
      [10, 0],
      [0, 10],
    ]),
    true,
  );
  assert.equal(
    geo.isAxisAlignedRect([
      [0, 0],
      [10, 0],
      [10, 10],
      [5, 20],
    ]),
    false,
  );
  assert.equal(
    geo.isAxisAlignedRect([
      [0, 0],
      [10, 0],
      [10, 10],
    ]),
    false,
  );
});

test("simplifyPolygon collapses a traced straight run", () => {
  assert.deepEqual(
    geo.simplifyPolygon([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ]),
    [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ],
  );
  // too short to simplify: returned unchanged
  assert.deepEqual(
    geo.simplifyPolygon([
      [0, 0],
      [1, 1],
    ]),
    [
      [0, 0],
      [1, 1],
    ],
  );
});

test("transforms clamp and truncate with a size, round without one", () => {
  const poly: Poly = [
    [0, 0],
    [10, 10],
  ];
  assert.deepEqual(geo.translate(poly, -5.6, 3.4, 50, 50), [
    [0, 3],
    [4, 13],
  ]);
  assert.deepEqual(geo.translate(poly, -5.6, 3.4), [
    [-6, 3],
    [4, 13],
  ]);
  assert.deepEqual(geo.scaleAbout(poly, 5, 5, 2, 2), [
    [-5, -5],
    [15, 15],
  ]);
  assert.deepEqual(
    geo.rotateAbout(
      [
        [0, 0],
        [10, 0],
      ],
      5,
      5,
      90,
    ),
    [
      [10, 0],
      [10, 10],
    ],
  );
});

test("snapPoint pulls to image edges and to nearby vertices", () => {
  assert.deepEqual(geo.snapPoint(3, 400, 500, 400, [], 6), {
    x: 0,
    y: 399,
    snapped: true,
  });
  assert.deepEqual(geo.snapPoint(100, 100, 500, 400, [[[103, 102]]], 6), {
    x: 103,
    y: 102,
    snapped: true,
  });
  assert.deepEqual(geo.snapPoint(200, 200, 500, 400, [[[300, 300]]], 6), {
    x: 200,
    y: 200,
    snapped: false,
  });
});

test("primitives", () => {
  const square: Poly = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];
  assert.equal(geo.polygonArea(square), 100);
  assert.deepEqual(geo.polygonCentroid(square), [5, 5]);
  assert.deepEqual(
    geo.polygonBounds([
      [3, 4],
      [10, 0],
      [10, 10],
    ]),
    [3, 0, 10, 10],
  );
  assert.equal(geo.pointInPoly(5, 5, square), true);
  assert.equal(geo.pointInPoly(50, 5, square), false);
  // a bow-tie has zero shoelace area, so it is rejected rather than warned about
  assert.equal(
    geo.polySelfIntersects([
      [0, 0],
      [10, 10],
      [10, 0],
      [0, 10],
    ]),
    true,
  );
});
