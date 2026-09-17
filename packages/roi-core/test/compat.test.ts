/**
 * Cross-implementation check: the desktop app must be able to open a batch the
 * web tool saved.
 *
 * Everything else in this suite compares against values captured from the
 * Python. This test runs the real thing: it writes a spreadsheet with
 * `buildWorkbook`, then loads it with the desktop app's own
 * `AnnotationStore.load()` and compares the rows it recovers.
 *
 * It needs the desktop app's virtualenv (`pnpm --filter roi-studio setup`).
 * Without it the test skips rather than fails, so the suite still runs on a
 * machine that only has Node.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { polysToNorm } from "../src/geometry.ts";
import type { MultiPoly } from "../src/geometry.ts";
import { buildJson, dumpFullJson, makeRow } from "../src/store.ts";
import { buildWorkbook } from "../src/xlsx.ts";

const HERE = join(fileURLToPath(import.meta.url), "..");
const STUDIO = join(HERE, "..", "..", "..", "apps", "roi-studio");
const PYTHON = [
  join(STUDIO, ".venv", "bin", "python"),
  join(STUDIO, ".venv", "Scripts", "python.exe"),
].find((p) => existsSync(p));

const POLY: MultiPoly = [
  [
    [231, 203],
    [494, 280],
    [400, 480],
  ],
];

const LOADER = `
import json, sys
from roi_studio.core.store import AnnotationStore
store = AnnotationStore()
store.bind(sys.argv[1])
messages = store.load()
full, rounded, warnings = store.build_json()
print(json.dumps({
    "messages": messages,
    "rows": store.rows,
    "rois": full["rois"],
    "shapes": full["shapes"],
    "no_roi": full["no_roi"],
    "warnings": warnings,
}))
`;

interface DesktopResult {
  messages: string[];
  rows: Record<string, unknown>[];
  rois: Record<string, MultiPoly>;
  shapes: Record<string, string[]>;
  no_roi: string[];
  warnings: string[];
}

test("the desktop app can open a batch the web tool saved", async (t) => {
  if (!PYTHON) {
    t.skip("desktop virtualenv not present; run `pnpm --filter roi-studio setup`");
    return;
  }

  const rows = [
    makeRow({
      fname: "S1_cam1_a.jpg",
      rowType: "roi",
      polysPx: POLY,
      normPolys: polysToNorm(POLY, 640, 480),
      comment: "from the web tool",
      width: 640,
      height: 480,
      kinds: ["polygon"],
      // a class the desktop app knows nothing about
      classes: ["vehicle"],
    }),
    makeRow({ fname: "S2_cam2_a.jpg", rowType: "no_roi", width: 640, height: 480 }),
  ];

  const folder = mkdtempSync(join(tmpdir(), "roi-parity-"));
  writeFileSync(join(folder, "roi_annotations.xlsx"), await buildWorkbook(rows));
  const { full } = buildJson(rows, folder);
  writeFileSync(join(folder, "roi_annotations.json"), dumpFullJson(full));

  const stdout = execFileSync(PYTHON, ["-c", LOADER, folder], {
    cwd: STUDIO,
    encoding: "utf8",
  });
  const desktop = JSON.parse(stdout) as DesktopResult;

  // it read the spreadsheet, and had nothing to complain about
  assert.match(desktop.messages.join(" "), /Loaded 2 existing row\(s\)/);
  assert.deepEqual(desktop.warnings, []);
  assert.equal(desktop.rows.length, 2);

  // every field survived the round trip
  const first = desktop.rows[0]!;
  assert.equal(first.image_name, "S1_cam1_a.jpg");
  assert.equal(first.roi_key, "S1_1");
  assert.equal(first.pixel_coords, "[[[231, 203], [494, 280], [400, 480]]]");
  assert.equal(first.normalized_coords, "[[[0.36, 0.42], [0.77, 0.58], [0.62, 1]]]");
  assert.equal(first.comment, "from the web tool");
  assert.equal(first.shape_types, '["polygon"]');
  assert.equal(first.image_width, 640);
  assert.equal(first.row_type, "roi");
  assert.equal(desktop.rows[1]!.row_type, "no_roi");

  // and the JSON the desktop app rebuilds from it matches what we wrote
  assert.deepEqual(desktop.rois, { S1_1: [[[0.36, 0.42], [0.77, 0.58], [0.62, 1]]] });
  assert.deepEqual(desktop.shapes, { S1_1: ["polygon"] });
  assert.deepEqual(desktop.no_roi, ["S2_2"]);
  assert.deepEqual(full.rois, desktop.rois);
});
