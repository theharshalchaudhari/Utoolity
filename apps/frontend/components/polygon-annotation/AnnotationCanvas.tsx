"use client";

/**
 * The drawing surface: the image, the ROIs over it, and every direct
 * manipulation.
 *
 * All hit-testing happens in *image* coordinates, so the tolerances from
 * `@repo/roi-core` (`VERTEX_RADIUS`, `EDGE_TOLERANCE`, `SNAP_RADIUS`) are
 * divided by the zoom factor before use — a vertex stays equally easy to grab
 * whether the image is at 5% or 3200%.
 *
 * Interaction state lives in a ref rather than state: a drag updates on every
 * pointer move, and re-rendering React on each frame would be wasted work.
 * The canvas is redrawn directly instead.
 */

import { useCallback, useEffect, useRef } from "react";

import {
  EDGE_TOLERANCE,
  SNAP_RADIUS,
  VERTEX_RADIUS,
  ZOOM_STEP,
  dedupeConsecutive,
  makeCircle,
  makePolygon,
  makeRect,
  pointInPoly,
  pointSegmentDistance,
  polygonBounds,
  resizeShapeBox,
  simplifyPolygon,
  snapPoint,
  translateShape,
  type Point,
  type Shape,
} from "@repo/roi-core";

import type { UseCanvasViewport } from "@/hooks/useCanvasViewport";
import type { Tool } from "@/types/roi";

/**
 * What the canvas lets its parent drive.
 *
 * `undoDraftPoint` exists so Ctrl+Z means the nearest thing: while a polygon
 * is being drawn it takes back the last point placed, and only once there is
 * no shape in progress does it fall through to undoing a whole ROI.
 */
export interface CanvasHandle {
  /** True when a shape is being drawn right now. */
  hasDraft: () => boolean;
  /** Take back the last placed point. Returns false if there was none. */
  undoDraftPoint: () => boolean;
}

export interface AnnotationCanvasProps {
  handleRef?: React.RefObject<CanvasHandle | null>;
  bitmap: ImageBitmap | null;
  imageWidth: number;
  imageHeight: number;
  shapes: Shape[];
  selected: number[];
  tool: Tool;
  className: string;
  view: UseCanvasViewport;
  snapToEdges: boolean;
  snapToShapes: boolean;
  onSelect: (indexes: number[]) => void;
  onAddShape: (shape: Shape) => void;
  onCommit: (label: string, next: Shape[]) => void;
  onPreview: (next: Shape[]) => void;
}

/** What the pointer is currently doing. */
type Interaction =
  | { kind: "none" }
  | { kind: "pan"; lastX: number; lastY: number }
  | { kind: "draft"; points: Point[] }
  | { kind: "box"; start: Point; end: Point }
  | { kind: "lasso"; points: Point[] }
  | { kind: "move"; indexes: number[]; origin: Point; base: Shape[] }
  | { kind: "vertex"; index: number; vertex: number; base: Shape }
  | { kind: "handle"; index: number; corner: number; base: Shape }
  | { kind: "band"; start: Point; end: Point };

const CLASS_COLOURS = [
  "#2f6bd8",
  "#00b894",
  "#e17055",
  "#a55eea",
  "#f6b93b",
  "#0abde3",
  "#ee5253",
  "#10ac84",
];

/** A stable colour per class name, so a class looks the same image to image. */
function colourFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 1_000_000_007;
  }
  return CLASS_COLOURS[hash % CLASS_COLOURS.length]!;
}

export default function AnnotationCanvas({
  handleRef,
  bitmap,
  imageWidth,
  imageHeight,
  shapes,
  selected,
  tool,
  className,
  view,
  snapToEdges,
  snapToShapes,
  onSelect,
  onAddShape,
  onCommit,
  onPreview,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const interaction = useRef<Interaction>({ kind: "none" });
  const hover = useRef<Point | null>(null);
  const { viewport, toImage, zoomBy, panBy, fit } = view;

  // ── drawing ────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = wrap.clientWidth;
    const cssHeight = wrap.clientHeight;
    if (canvas.width !== cssWidth * dpr || canvas.height !== cssHeight * dpr) {
      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    }
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const { scale, offsetX, offsetY } = viewport;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = scale < 4; // show real pixels when zoomed right in

    if (bitmap) ctx.drawImage(bitmap, 0, 0);

    const line = 2 / scale;
    const vertex = VERTEX_RADIUS / scale;
    const chosen = new Set(selected);

    shapes.forEach((shape, i) => {
      if (!shape.visible) return;
      const colour = colourFor(shape.className);
      const isChosen = chosen.has(i);

      ctx.beginPath();
      shape.points.forEach(([x, y], p) => {
        if (p === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      ctx.globalAlpha = isChosen ? 0.34 : 0.22;
      ctx.fillStyle = colour;
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.strokeStyle = isChosen ? "#ffffff" : colour;
      ctx.lineWidth = isChosen ? line * 1.6 : line;
      ctx.stroke();

      if (isChosen) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = colour;
        ctx.lineWidth = line;
        const handles =
          shape.kind === "polygon" ? shape.points : cornersOf(shape.points);
        for (const [x, y] of handles) {
          ctx.beginPath();
          ctx.rect(x - vertex / 2, y - vertex / 2, vertex, vertex);
          ctx.fill();
          ctx.stroke();
        }
      }
    });

    // the in-progress shape
    const active = interaction.current;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colourFor(className);
    ctx.lineWidth = line;
    ctx.setLineDash([6 / scale, 4 / scale]);

    if (active.kind === "draft" && active.points.length) {
      ctx.beginPath();
      active.points.forEach(([x, y], p) => {
        if (p === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (hover.current) ctx.lineTo(hover.current[0], hover.current[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffffff";
      for (const [x, y] of active.points) {
        ctx.beginPath();
        ctx.rect(x - vertex / 2, y - vertex / 2, vertex, vertex);
        ctx.fill();
        ctx.stroke();
      }
    } else if (active.kind === "box") {
      const [x0, y0] = active.start;
      const [x1, y1] = active.end;
      if (tool === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          (x0 + x1) / 2,
          (y0 + y1) / 2,
          Math.abs(x1 - x0) / 2,
          Math.abs(y1 - y0) / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      } else {
        ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      }
    } else if (active.kind === "lasso" && active.points.length > 1) {
      ctx.beginPath();
      active.points.forEach(([x, y], p) => {
        if (p === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    } else if (active.kind === "band") {
      const [x0, y0] = active.start;
      const [x1, y1] = active.end;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    }
    ctx.setLineDash([]);
    ctx.restore();
  }, [bitmap, className, selected, shapes, tool, viewport]);

  useEffect(() => {
    draw();
  }, [draw]);

  // redraw on resize, and refit when the image changes
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const observer = new ResizeObserver(() => draw());
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !imageWidth || !imageHeight) return;
    fit(imageWidth, imageHeight, wrap.clientWidth, wrap.clientHeight);
  }, [fit, imageHeight, imageWidth]);

  // ── hit testing (image space) ──────────────────────────────

  const pointerImage = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): Point => {
      const rect = event.currentTarget.getBoundingClientRect();
      const [x, y] = toImage(event.clientX - rect.left, event.clientY - rect.top);
      return [x, y];
    },
    [toImage],
  );

  const snap = useCallback(
    (at: Point, skipIndex = -1): Point => {
      const others = shapes
        .filter((_, i) => i !== skipIndex)
        .map((s) => s.points);
      const result = snapPoint(
        at[0],
        at[1],
        imageWidth,
        imageHeight,
        others,
        EDGE_TOLERANCE / viewport.scale,
        snapToEdges,
        snapToShapes,
      );
      return [result.x, result.y];
    },
    [imageHeight, imageWidth, shapes, snapToEdges, snapToShapes, viewport.scale],
  );

  const findVertex = useCallback(
    (at: Point): { index: number; vertex: number } | null => {
      const tolerance = VERTEX_RADIUS / viewport.scale;
      for (const i of selected) {
        const shape = shapes[i];
        if (!shape || !shape.visible) continue;
        const points = shape.kind === "polygon" ? shape.points : cornersOf(shape.points);
        for (let v = 0; v < points.length; v += 1) {
          const [x, y] = points[v]!;
          if (Math.hypot(x - at[0], y - at[1]) <= tolerance) return { index: i, vertex: v };
        }
      }
      return null;
    },
    [selected, shapes, viewport.scale],
  );

  const findShape = useCallback(
    (at: Point): number => {
      for (let i = shapes.length - 1; i >= 0; i -= 1) {
        const shape = shapes[i];
        if (shape?.visible && pointInPoly(at[0], at[1], shape.points)) return i;
      }
      return -1;
    },
    [shapes],
  );

  const findEdge = useCallback(
    (at: Point): { index: number; after: number } | null => {
      const tolerance = EDGE_TOLERANCE / viewport.scale;
      for (const i of selected) {
        const shape = shapes[i];
        if (!shape || shape.kind !== "polygon" || !shape.visible) continue;
        const points = shape.points;
        for (let p = 0; p < points.length; p += 1) {
          const a = points[p]!;
          const b = points[(p + 1) % points.length]!;
          if (pointSegmentDistance(at[0], at[1], a[0], a[1], b[0], b[1]) <= tolerance) {
            return { index: i, after: p };
          }
        }
      }
      return null;
    },
    [selected, shapes, viewport.scale],
  );

  // ── pointer handling ───────────────────────────────────────

  const finishDraft = useCallback(
    (points: Point[]) => {
      interaction.current = { kind: "none" };
      const cleaned = dedupeConsecutive(points);
      if (cleaned.length >= 3) onAddShape(makePolygon(cleaned, className));
      draw();
    },
    [className, draw, onAddShape],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!bitmap) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const at = pointerImage(event);

      // middle button, or space-less right-drag, pans
      if (event.button === 1 || event.button === 2) {
        interaction.current = { kind: "pan", lastX: event.clientX, lastY: event.clientY };
        return;
      }

      if (tool === "polygon") {
        const active = interaction.current;
        const points = active.kind === "draft" ? [...active.points] : [];
        const first = points[0];
        // clicking back on the first point closes the shape
        if (first && Math.hypot(first[0] - at[0], first[1] - at[1]) <= SNAP_RADIUS / viewport.scale) {
          finishDraft(points);
          return;
        }
        points.push(snap(at));
        interaction.current = { kind: "draft", points };
        draw();
        return;
      }

      if (tool === "rect" || tool === "circle") {
        interaction.current = { kind: "box", start: snap(at), end: at };
        return;
      }

      if (tool === "freehand") {
        interaction.current = { kind: "lasso", points: [at] };
        return;
      }

      // select tool
      const onVertex = findVertex(at);
      if (onVertex) {
        const shape = shapes[onVertex.index]!;
        if (shape.locked) return;
        // ctrl+click removes a vertex, when there are enough to spare
        if ((event.ctrlKey || event.metaKey) && shape.kind === "polygon") {
          if (shape.points.length > 3) {
            const points = shape.points.filter((_, p) => p !== onVertex.vertex);
            onCommit(
              "remove point",
              shapes.map((s, i) => (i === onVertex.index ? { ...s, points } : s)),
            );
          }
          return;
        }
        interaction.current =
          shape.kind === "polygon"
            ? { kind: "vertex", index: onVertex.index, vertex: onVertex.vertex, base: shape }
            : { kind: "handle", index: onVertex.index, corner: onVertex.vertex, base: shape };
        return;
      }

      const hitEdge = event.detail === 2 ? findEdge(at) : null;
      if (hitEdge) {
        const shape = shapes[hitEdge.index]!;
        if (shape.locked) return;
        const points = [...shape.points];
        points.splice(hitEdge.after + 1, 0, at);
        onCommit(
          "insert point",
          shapes.map((s, i) => (i === hitEdge.index ? { ...s, points } : s)),
        );
        return;
      }

      const hit = findShape(at);
      if (hit >= 0) {
        const already = selected.includes(hit);
        const nextSelection = event.shiftKey
          ? already
            ? selected.filter((i) => i !== hit)
            : [...selected, hit]
          : already
            ? selected
            : [hit];
        onSelect(nextSelection);
        const movable = nextSelection.filter((i) => !shapes[i]?.locked);
        if (movable.length) {
          interaction.current = {
            kind: "move",
            indexes: movable,
            origin: at,
            base: shapes.map((s) => s),
          };
        }
        return;
      }

      if (!event.shiftKey) onSelect([]);
      interaction.current = { kind: "band", start: at, end: at };
    },
    [
      bitmap,
      draw,
      findEdge,
      findShape,
      findVertex,
      finishDraft,
      onCommit,
      onSelect,
      pointerImage,
      selected,
      shapes,
      snap,
      tool,
      viewport.scale,
    ],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!bitmap) return;
      const at = pointerImage(event);
      hover.current = at;
      const active = interaction.current;

      switch (active.kind) {
        case "pan":
          panBy(event.clientX - active.lastX, event.clientY - active.lastY);
          interaction.current = { kind: "pan", lastX: event.clientX, lastY: event.clientY };
          return;
        case "box":
          interaction.current = { ...active, end: at };
          draw();
          return;
        case "lasso":
          interaction.current = { kind: "lasso", points: [...active.points, at] };
          draw();
          return;
        case "band":
          interaction.current = { ...active, end: at };
          draw();
          return;
        case "move": {
          const dx = at[0] - active.origin[0];
          const dy = at[1] - active.origin[1];
          const moving = new Set(active.indexes);
          onPreview(
            active.base.map((s, i) =>
              moving.has(i) ? translateShape(s, dx, dy, imageWidth, imageHeight) : s,
            ),
          );
          return;
        }
        case "vertex": {
          const snapped = snap(at, active.index);
          const points = active.base.points.map((p, i) => (i === active.vertex ? snapped : p));
          onPreview(shapes.map((s, i) => (i === active.index ? { ...s, points } : s)));
          return;
        }
        case "handle": {
          const [x0, y0, x1, y1] = polygonBounds(active.base.points);
          // the dragged corner moves; the one opposite it stays put
          const anchorX = active.corner === 0 || active.corner === 3 ? x1 : x0;
          const anchorY = active.corner === 0 || active.corner === 1 ? y1 : y0;
          const resized = resizeShapeBox(
            active.base,
            anchorX,
            anchorY,
            at[0],
            at[1],
            imageWidth,
            imageHeight,
          );
          onPreview(shapes.map((s, i) => (i === active.index ? resized : s)));
          return;
        }
        case "draft":
          draw();
          return;
        default:
          return;
      }
    },
    [bitmap, draw, imageHeight, imageWidth, onPreview, panBy, pointerImage, shapes, snap],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const active = interaction.current;

      switch (active.kind) {
        case "box": {
          interaction.current = { kind: "none" };
          const [x0, y0] = active.start;
          const [x1, y1] = active.end;
          if (Math.abs(x1 - x0) >= 2 && Math.abs(y1 - y0) >= 2) {
            onAddShape(
              tool === "circle"
                ? makeCircle(
                    (x0 + x1) / 2,
                    (y0 + y1) / 2,
                    Math.abs(x1 - x0) / 2,
                    Math.abs(y1 - y0) / 2,
                    className,
                  )
                : makeRect(x0, y0, x1, y1, className),
            );
          }
          draw();
          return;
        }
        case "lasso": {
          interaction.current = { kind: "none" };
          // a dense trace becomes a workable polygon
          const simplified = simplifyPolygon(active.points, 2 / viewport.scale);
          if (simplified.length >= 3) onAddShape(makePolygon(simplified, className));
          draw();
          return;
        }
        case "band": {
          interaction.current = { kind: "none" };
          const minX = Math.min(active.start[0], active.end[0]);
          const maxX = Math.max(active.start[0], active.end[0]);
          const minY = Math.min(active.start[1], active.end[1]);
          const maxY = Math.max(active.start[1], active.end[1]);
          if (maxX - minX > 3 && maxY - minY > 3) {
            const inside: number[] = [];
            shapes.forEach((shape, i) => {
              if (!shape.visible) return;
              const [sx0, sy0, sx1, sy1] = polygonBounds(shape.points);
              if (sx0 >= minX && sy0 >= minY && sx1 <= maxX && sy1 <= maxY) inside.push(i);
            });
            onSelect(inside);
          }
          draw();
          return;
        }
        case "move":
          interaction.current = { kind: "none" };
          onCommit("move ROI", shapes);
          return;
        case "vertex":
        case "handle":
          interaction.current = { kind: "none" };
          onCommit(active.kind === "vertex" ? "move point" : "resize ROI", shapes);
          return;
        case "pan":
          interaction.current = { kind: "none" };
          return;
        default:
          return;
      }
    },
    [className, draw, onAddShape, onCommit, onSelect, shapes, tool, viewport.scale],
  );

  const onDoubleClick = useCallback(() => {
    const active = interaction.current;
    if (active.kind === "draft") finishDraft(active.points);
  }, [finishDraft]);

  /**
   * Zoom on the wheel, without scrolling the page.
   *
   * This has to be a native listener: React registers `wheel` as a *passive*
   * listener, where `preventDefault()` is ignored, so the page scrolled as
   * well as the image zooming. Registering it directly with
   * `{ passive: false }` is the only way to claim the gesture.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomBy(
        event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  /**
   * Take back the last placed point of the shape in progress. Freehand traces
   * are a single gesture, so there is nothing meaningful to step back there.
   */
  const undoDraftPoint = useCallback((): boolean => {
    const active = interaction.current;
    if (active.kind !== "draft" || active.points.length === 0) return false;
    const points = active.points.slice(0, -1);
    interaction.current = points.length ? { kind: "draft", points } : { kind: "none" };
    draw();
    return true;
  }, [draw]);

  useEffect(() => {
    if (!handleRef) return undefined;
    handleRef.current = {
      hasDraft: () => interaction.current.kind !== "none",
      undoDraftPoint,
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, undoDraftPoint]);

  // Enter closes a polygon, Escape abandons whatever is in progress.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const active = interaction.current;
      if (event.key === "Enter" && active.kind === "draft") {
        event.preventDefault();
        finishDraft(active.points);
      } else if (event.key === "Escape" && active.kind !== "none") {
        interaction.current = { kind: "none" };
        draw();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draw, finishDraft]);

  const cursor =
    tool === "select" ? "default" : tool === "freehand" ? "crosshair" : "crosshair";

  return (
    <div ref={wrapRef} className="bg-muted relative h-full w-full overflow-hidden rounded-lg">
      <canvas
        ref={canvasRef}
        className="block touch-none"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={(event) => event.preventDefault()}
      />
      {!bitmap && (
        <p className="text-muted-foreground absolute inset-0 grid place-items-center text-sm">
          No image loaded.
        </p>
      )}
    </div>
  );
}

/** The four bounding-box corners, used as handles for rects and circles. */
function cornersOf(points: readonly Point[]): Point[] {
  const [x0, y0, x1, y1] = polygonBounds(points as Point[]);
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}
