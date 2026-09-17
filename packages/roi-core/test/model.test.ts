/**
 * Parity tests for the Shape model. Expected values come from running
 * `apps/roi-studio/roi_studio/core/model.py` on the same input.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_CLASS } from "../src/config.ts";
import * as m from "../src/model.ts";

test("points are rounded to whole pixels, Python-style", () => {
  const shape = m.normalizeShape({
    points: [
      [1.6, 2.4],
      [3.5, 4.5],
    ],
  });
  // 3.5 and 4.5 are exact halves, so they go to the even neighbour
  assert.deepEqual(shape.points, [
    [2, 2],
    [4, 4],
  ]);
});

test("an unknown kind falls back to polygon", () => {
  const shape = m.normalizeShape({
    points: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    kind: "bogus" as never,
  });
  assert.equal(shape.kind, "polygon");
});

test("a shape with no class reads back as the default class", () => {
  assert.equal(m.makePolygon([[0, 0]]).className, DEFAULT_CLASS);
  assert.equal(m.normalizeShape({ points: [], className: "" }).className, DEFAULT_CLASS);
  assert.equal(m.makePolygon([[0, 0]], "vehicle").className, "vehicle");
});

test("polysToShapes recognises a bare box as a rectangle", () => {
  // no kinds recorded, as a file written before shape_types existed
  const shapes = m.polysToShapes([
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
    [
      [0, 0],
      [5, 0],
      [3, 7],
    ],
  ]);
  assert.deepEqual(m.shapesToKinds(shapes), ["rect", "polygon"]);
  // and with no shape_classes, every shape takes the default class
  assert.deepEqual(m.shapesToClasses(shapes), [DEFAULT_CLASS, DEFAULT_CLASS]);
});

test("polysToShapes carries kinds and classes through by position", () => {
  const shapes = m.polysToShapes(
    [
      [
        [0, 0],
        [4, 0],
        [4, 4],
      ],
      [
        [9, 9],
        [12, 9],
        [12, 12],
      ],
    ],
    ["circle", "polygon"],
    ["sky", "vehicle"],
  );
  assert.deepEqual(m.shapesToKinds(shapes), ["circle", "polygon"]);
  assert.deepEqual(m.shapesToClasses(shapes), ["sky", "vehicle"]);
});

test("describeShape names what was drawn", () => {
  const shapes = m.polysToShapes([
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
    [
      [0, 0],
      [5, 0],
      [3, 7],
    ],
  ]);
  assert.equal(m.describeShape(shapes[0]!), "rectangle 10 x 10");
  assert.equal(m.describeShape(shapes[1]!), "polygon, 3 points");
  assert.equal(m.describeShape(m.makeCircle(50, 50, 10)), "circle r=10");
  assert.equal(m.describeShape(m.makeCircle(50, 50, 20, 8)), "ellipse 40 x 16");
});

test("rotating a rectangle off-axis demotes it to a polygon", () => {
  const rect = m.makeRect(0, 0, 10, 20);
  assert.equal(m.rotateShape(rect, 45).kind, "polygon");
  assert.equal(m.rotateShape(rect, 90).kind, "rect");
  // a circle stays a circle at any angle
  assert.equal(m.rotateShape(m.makeCircle(50, 50, 10), 45).kind, "circle");
});

test("only rectangles and circles are edited as boxes", () => {
  assert.deepEqual(
    [
      m.makeRect(0, 0, 10, 20),
      m.makeCircle(50, 50, 10),
      m.makePolygon([
        [0, 0],
        [5, 0],
        [3, 7],
      ]),
    ].map((s) => m.isEditableAsBox(s)),
    [true, true, false],
  );
});

test("resizing a circle rebuilds it from the new box", () => {
  const circle = m.makeCircle(50, 50, 10);
  const resized = m.resizeShapeBox(circle, 0, 0, 30, 10);
  assert.equal(resized.points.length, 56);
  assert.equal(resized.kind, "circle");
});

test("transforms do not mutate the shape they are given", () => {
  const shape = m.makePolygon([
    [0, 0],
    [10, 0],
    [10, 10],
  ]);
  const moved = m.translateShape(shape, 5, 5);
  assert.deepEqual(shape.points[0], [0, 0]);
  assert.deepEqual(moved.points[0], [5, 5]);
  assert.notEqual(shape, moved);
});

test("validateShape keeps the kind and class of what it cleaned", () => {
  const shape = m.makePolygon(
    [
      [0, 0],
      [0, 0],
      [10, 0],
      [10, 10],
    ],
    "vehicle",
  );
  const result = m.validateShape(shape);
  assert.equal(result.shape?.className, "vehicle");
  assert.equal(result.shape?.points.length, 3);
  assert.deepEqual(result.messages, ["removed 1 duplicate point(s)"]);

  const doomed = m.makePolygon([
    [0, 0],
    [1, 0],
    [2, 0],
  ]);
  assert.equal(m.validateShape(doomed).shape, null);
});
