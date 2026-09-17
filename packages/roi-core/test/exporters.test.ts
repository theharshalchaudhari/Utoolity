/**
 * Parity tests for the export formats.
 *
 * Every expected string here is the exact content of a file written by
 * `apps/roi-studio/roi_studio/core/exporters.py` for the same rows, so ML
 * tooling pointed at either implementation reads the same bytes.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import * as ex from "../src/exporters.ts";
import { polysToNorm } from "../src/geometry.ts";
import type { MultiPoly } from "../src/geometry.ts";
import { makeRow, type CanonRow } from "../src/store.ts";

const FIXED = new Date(2026, 8, 17, 12, 0, 0);

const P1: MultiPoly = [
  [
    [10, 10],
    [90, 10],
    [90, 90],
  ],
];
const P2: MultiPoly = [
  [
    [0, 0],
    [50, 0],
    [50, 50],
  ],
  [
    [60, 60],
    [99, 60],
    [99, 99],
  ],
];

function rows(): CanonRow[] {
  return [
    makeRow({
      fname: "S1_cam1_a.jpg",
      rowType: "roi",
      polysPx: P1,
      normPolys: polysToNorm(P1, 100, 100),
      width: 100,
      height: 100,
      kinds: ["rect"],
    }),
    makeRow({
      fname: "S2_cam2_a.jpg",
      rowType: "roi",
      polysPx: P2,
      normPolys: polysToNorm(P2, 100, 100),
      width: 100,
      height: 100,
      kinds: ["polygon", "circle"],
    }),
    makeRow({ fname: "S3_cam3_a.jpg", rowType: "no_roi", width: 100, height: 100 }),
  ];
}

const find = (files: ex.ExportFile[], path: string): string => {
  const file = files.find((f) => f.path === path);
  assert.ok(file, `expected ${path} to be exported`);
  return file.text;
};

test("COCO export matches the desktop app's file", () => {
  const { files } = ex.exportCoco(rows(), "export_coco", "annotations.json", FIXED);
  assert.equal(files.length, 1);
  assert.equal(
    find(files, "export_coco/annotations.json"),
    `{
 "info": {
  "description": "ROI Studio export",
  "version": "1.0.0",
  "date_created": "2026-09-17T12:00:00"
 },
 "licenses": [],
 "images": [
  {
   "id": 1,
   "file_name": "S1_cam1_a.jpg",
   "width": 100,
   "height": 100,
   "roi_key": "S1_1"
  },
  {
   "id": 2,
   "file_name": "S2_cam2_a.jpg",
   "width": 100,
   "height": 100,
   "roi_key": "S2_2"
  }
 ],
 "annotations": [
  {
   "id": 1,
   "image_id": 1,
   "category_id": 1,
   "segmentation": [
    [
     10.0,
     10.0,
     90.0,
     10.0,
     90.0,
     90.0
    ]
   ],
   "bbox": [
    10.0,
    10.0,
    80.0,
    80.0
   ],
   "area": 3200.0,
   "iscrowd": 0,
   "shape_type": "rect"
  },
  {
   "id": 2,
   "image_id": 2,
   "category_id": 1,
   "segmentation": [
    [
     0.0,
     0.0,
     50.0,
     0.0,
     50.0,
     50.0
    ]
   ],
   "bbox": [
    0.0,
    0.0,
    50.0,
    50.0
   ],
   "area": 1250.0,
   "iscrowd": 0,
   "shape_type": "polygon"
  },
  {
   "id": 3,
   "image_id": 2,
   "category_id": 1,
   "segmentation": [
    [
     60.0,
     60.0,
     99.0,
     60.0,
     99.0,
     99.0
    ]
   ],
   "bbox": [
    60.0,
    60.0,
    39.0,
    39.0
   ],
   "area": 760.5,
   "iscrowd": 0,
   "shape_type": "circle"
  }
 ],
 "categories": [
  {
   "id": 1,
   "name": "roi",
   "supercategory": "region"
  }
 ]
}`,
  );
});

test("YOLO export writes one normalised line per polygon", () => {
  const { files } = ex.exportYolo(rows());
  assert.equal(
    find(files, "export_yolo/labels/S1_cam1_a.txt"),
    "0 0.100000 0.100000 0.900000 0.100000 0.900000 0.900000\n",
  );
  assert.equal(
    find(files, "export_yolo/labels/S2_cam2_a.txt"),
    "0 0.000000 0.000000 0.500000 0.000000 0.500000 0.500000\n" +
      "0 0.600000 0.600000 0.990000 0.600000 0.990000 0.990000\n",
  );
  assert.equal(
    find(files, "export_yolo/data.yaml"),
    "# ROI Studio export\npath: .\ntrain: images\nval: images\n\nnames:\n  0: roi\n",
  );
});

test("VOC export keeps the exact points in a custom child", () => {
  const { files } = ex.exportVoc(rows(), "batch");
  assert.equal(
    find(files, "export_voc/S1_cam1_a.xml"),
    `<annotation>
  <folder>batch</folder>
  <filename>S1_cam1_a.jpg</filename>
  <source><database>ROI Studio</database></source>
  <size><width>100</width><height>100</height><depth>3</depth></size>
  <segmented>1</segmented>
  <object>
    <name>roi</name>
    <shape_type>rect</shape_type>
    <pose>Unspecified</pose><truncated>0</truncated><difficult>0</difficult>
    <bndbox><xmin>10</xmin><ymin>10</ymin><xmax>90</xmax><ymax>90</ymax></bndbox>
    <polygon>10,10 90,10 90,90</polygon>
  </object>
</annotation>
`,
  );
  // two polygons in one image become two <object> blocks
  const second = find(files, "export_voc/S2_cam2_a.xml");
  assert.equal((second.match(/<object>/g) ?? []).length, 2);
  assert.match(second, /<polygon>60,60 99,60 99,99<\/polygon>/);
});

test("mask specs describe what to rasterise, skipping empty images", () => {
  const { specs } = ex.buildMaskSpecs(rows());
  assert.deepEqual(
    specs.map((s) => s.path),
    ["export_masks/S1_cam1_a_mask.png", "export_masks/S2_cam2_a_mask.png"],
  );
  assert.equal(specs[0]?.width, 100);
  assert.equal(specs[1]?.polys.length, 2);
});

test("an empty batch warns rather than writing nothing at all", () => {
  const coco = ex.exportCoco([], "export_coco", "annotations.json", FIXED);
  assert.deepEqual(coco.warnings, ["no ROI rows to export"]);
  // the file is still written, with empty arrays, as upstream
  assert.match(find(coco.files, "export_coco/annotations.json"), /"annotations": \[\]/);

  assert.deepEqual(ex.exportYolo([]).warnings, ["no ROI rows to export"]);
  assert.deepEqual(ex.exportVoc([]).warnings, ["no ROI rows to export"]);
  assert.deepEqual(ex.buildMaskSpecs([]).warnings, ["no ROI rows to export"]);
});

test("a row with only normalised coords is exported via its image size", () => {
  const row = makeRow({
    fname: "S1_cam1_a.jpg",
    rowType: "roi",
    normPolys: polysToNorm(P1, 100, 100),
    width: 100,
    height: 100,
  });
  const { files } = ex.exportVoc([{ ...row, pixel_coords: "" }], "batch");
  assert.match(find(files, "export_voc/S1_cam1_a.xml"), /<polygon>10,10 90,10 90,90<\/polygon>/);
});

test("classes drive the category list, the YOLO index and the VOC name", () => {
  const classed = [
    makeRow({
      fname: "S1_cam1_a.jpg",
      rowType: "roi",
      polysPx: P2,
      normPolys: polysToNorm(P2, 100, 100),
      width: 100,
      height: 100,
      kinds: ["polygon", "polygon"],
      classes: ["vehicle", "sky"],
    }),
  ];
  // no default-class shape here, so the two used classes take index 0 and 1
  assert.deepEqual(ex.classList(classed), ["sky", "vehicle"]);

  const yolo = ex.exportYolo(classed);
  assert.match(find(yolo.files, "export_yolo/data.yaml"), /names:\n {2}0: sky\n {2}1: vehicle\n/);
  const labels = find(yolo.files, "export_yolo/labels/S1_cam1_a.txt").split("\n");
  assert.ok(labels[0]?.startsWith("1 "), "vehicle is class 1");
  assert.ok(labels[1]?.startsWith("0 "), "sky is class 0");

  const coco = ex.exportCoco(classed, "export_coco", "annotations.json", FIXED);
  const payload = JSON.parse(find(coco.files, "export_coco/annotations.json")) as {
    categories: { id: number; name: string }[];
    annotations: { category_id: number }[];
  };
  assert.deepEqual(payload.categories.map((c) => c.name), ["sky", "vehicle"]);
  assert.deepEqual(payload.annotations.map((a) => a.category_id), [2, 1]);

  assert.match(find(ex.exportVoc(classed, "batch").files, "export_voc/S1_cam1_a.xml"), /<name>vehicle<\/name>/);
});

test("an un-classed batch exports exactly the desktop app's single category", () => {
  assert.deepEqual(ex.classList(rows()), ["roi"]);
});

test("filtering and distinct values", () => {
  assert.deepEqual(ex.distinct(rows(), "site_id"), ["S1", "S2", "S3"]);
  assert.equal(ex.filterRows(rows(), { cams: ["cam1"] }).length, 1);
  assert.equal(ex.filterRows(rows(), { rowTypes: ["no_roi"] }).length, 1);
  assert.equal(ex.filterRows(rows()).length, 3);
});

test("runExports merges the selected formats", () => {
  const result = ex.runExports(["coco", "yolo", "voc", "masks"], rows(), "batch", FIXED);
  const paths = result.files.map((f) => f.path);
  assert.ok(paths.includes("export_coco/annotations.json"));
  assert.ok(paths.includes("export_yolo/data.yaml"));
  assert.ok(paths.includes("export_voc/S1_cam1_a.xml"));
  assert.equal(result.masks.length, 2);
  assert.deepEqual(result.warnings, []);
});
