/**
 * The in-memory annotation model.
 *
 * A `Shape` is the one source of truth for a region: its points always live in
 * original image pixel coordinates, and `kind` records how it was drawn so a
 * rectangle stays a rectangle when the file is reopened.
 *
 * Port of `apps/roi-studio/roi_studio/core/model.py`, with one addition: the
 * desktop app has no notion of classes, so `className` is new here and
 * defaults to `DEFAULT_CLASS` for anything the desktop app wrote.
 *
 * Shapes are treated as immutable — every transform returns a new object, so
 * they can be held directly in React state and snapshotted for undo.
 */

import {
  DEFAULT_CLASS,
  SHAPE_CIRCLE,
  SHAPE_POLYGON,
  SHAPE_RECT,
  SHAPE_TYPES,
  type ShapeKind,
} from "./config.ts";
import * as geo from "./geometry.ts";
import type { MultiPoly, Point, Poly } from "./geometry.ts";

export interface Shape {
  points: Poly;
  kind: ShapeKind;
  className: string;
  locked: boolean;
  visible: boolean;
}

/** Round points to whole pixels and reject an unknown kind. */
export function normalizeShape(shape: Partial<Shape>): Shape {
  const kind = shape.kind && (SHAPE_TYPES as readonly string[]).includes(shape.kind)
    ? shape.kind
    : SHAPE_POLYGON;
  return {
    points: (shape.points ?? []).map((p): Point => [geo.pyRound(p[0]), geo.pyRound(p[1])]),
    kind,
    className: shape.className || DEFAULT_CLASS,
    locked: shape.locked ?? false,
    visible: shape.visible ?? true,
  };
}

// ── construction ──────────────────────────────────────────────

export function makePolygon(points: Poly, className = DEFAULT_CLASS): Shape {
  return normalizeShape({ points, kind: SHAPE_POLYGON, className });
}

export function makeRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  className = DEFAULT_CLASS,
): Shape {
  return normalizeShape({
    points: geo.rectToPolygon(x0, y0, x1, y1),
    kind: SHAPE_RECT,
    className,
  });
}

export function makeCircle(
  cx: number,
  cy: number,
  rx: number,
  ry: number | null = null,
  className = DEFAULT_CLASS,
): Shape {
  return normalizeShape({
    points: geo.circleToPolygon(cx, cy, rx, ry),
    kind: SHAPE_CIRCLE,
    className,
  });
}

export function cloneShape(shape: Shape): Shape {
  return { ...shape, points: shape.points.map((p): Point => [p[0], p[1]]) };
}

// ── queries ───────────────────────────────────────────────────

export function shapeArea(shape: Shape): number {
  return geo.polygonArea(shape.points);
}

export function shapeBounds(shape: Shape): [number, number, number, number] {
  return geo.polygonBounds(shape.points);
}

export function shapeCentroid(shape: Shape): [number, number] {
  return geo.polygonCentroid(shape.points);
}

export function shapeContains(shape: Shape, x: number, y: number): boolean {
  return geo.pointInPoly(x, y, shape.points);
}

/**
 * Rectangles and circles are edited with corner handles rather than
 * per-vertex, so the canvas asks this rather than testing `kind`.
 */
export function isEditableAsBox(shape: Shape): boolean {
  return shape.kind === SHAPE_RECT || shape.kind === SHAPE_CIRCLE;
}

export function describeShape(shape: Shape): string {
  if (shape.kind === SHAPE_RECT) {
    const [x0, y0, x1, y1] = shapeBounds(shape);
    return `rectangle ${Math.trunc(x1 - x0)} x ${Math.trunc(y1 - y0)}`;
  }
  if (shape.kind === SHAPE_CIRCLE) {
    const [, , rx, ry] = geo.ellipseFromPolygon(shape.points);
    if (Math.abs(rx - ry) < 1.5) return `circle r=${Math.trunc(rx)}`;
    return `ellipse ${Math.trunc(rx * 2)} x ${Math.trunc(ry * 2)}`;
  }
  return `polygon, ${shape.points.length} points`;
}

// ── transforms (all return a new Shape) ───────────────────────

export function translateShape(
  shape: Shape,
  dx: number,
  dy: number,
  width = 0,
  height = 0,
): Shape {
  return { ...shape, points: geo.translate(shape.points, dx, dy, width, height) };
}

export function scaleShape(
  shape: Shape,
  cx: number,
  cy: number,
  fx: number,
  fy: number,
  width = 0,
  height = 0,
): Shape {
  return {
    ...shape,
    points: geo.scaleAbout(shape.points, cx, cy, fx, fy, width, height),
  };
}

export function rotateShape(
  shape: Shape,
  degrees: number,
  width = 0,
  height = 0,
): Shape {
  const [cx, cy] = shapeCentroid(shape);
  const points = geo.rotateAbout(shape.points, cx, cy, degrees, width, height);
  // a rotated rectangle is no longer axis-aligned, so it becomes a polygon
  let kind = shape.kind;
  if (shape.kind === SHAPE_RECT && degrees % 90 !== 0) kind = SHAPE_POLYGON;
  return { ...shape, points, kind };
}

/** Rebuild a rect or circle from a new bounding box. */
export function resizeShapeBox(
  shape: Shape,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width = 0,
  height = 0,
): Shape {
  let points: Poly;
  if (shape.kind === SHAPE_CIRCLE) {
    points = geo.circleToPolygon(
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      Math.max(Math.abs(x1 - x0) / 2, 1),
      Math.max(Math.abs(y1 - y0) / 2, 1),
    );
  } else {
    points = geo.rectToPolygon(x0, y0, x1, y1);
  }
  if (width && height) {
    points = points.map(([x, y]): Point => [
      Math.trunc(geo.clamp(x, 0, width - 1)),
      Math.trunc(geo.clamp(y, 0, height - 1)),
    ]);
  }
  return { ...shape, points };
}

export interface ShapeValidation {
  shape: Shape | null;
  messages: string[];
}

export function validateShape(shape: Shape, width = 0, height = 0): ShapeValidation {
  const { poly, messages } = geo.validatePolygon(shape.points, width, height);
  if (poly === null) return { shape: null, messages };
  return { shape: { ...shape, points: poly }, messages };
}

// ── conversion to and from stored rows ────────────────────────

export function shapesToPolys(shapes: readonly Shape[]): MultiPoly {
  return shapes.map((s) => s.points.map((p): Point => [p[0], p[1]]));
}

export function shapesToKinds(shapes: readonly Shape[]): ShapeKind[] {
  return shapes.map((s) => s.kind);
}

export function shapesToClasses(shapes: readonly Shape[]): string[] {
  return shapes.map((s) => s.className || DEFAULT_CLASS);
}

/**
 * Rebuild shapes from a stored row.
 *
 * A file written before shape_types existed simply yields polygons, except
 * that an exact four-point axis-aligned box is recognised as a rectangle so
 * older batches still get the nicer handles. Likewise a row with no
 * shape_classes yields every shape in {@link DEFAULT_CLASS}.
 */
export function polysToShapes(
  polys: MultiPoly,
  kinds: readonly string[] = [],
  classes: readonly string[] = [],
): Shape[] {
  return polys.map((poly, i) => {
    const raw = kinds[i];
    let kind: ShapeKind =
      raw && (SHAPE_TYPES as readonly string[]).includes(raw)
        ? (raw as ShapeKind)
        : SHAPE_POLYGON;
    if (kind === SHAPE_POLYGON && geo.isAxisAlignedRect(poly)) kind = SHAPE_RECT;
    return normalizeShape({
      points: poly.map((p): Point => [p[0], p[1]]),
      kind,
      className: classes[i] || DEFAULT_CLASS,
    });
  });
}
