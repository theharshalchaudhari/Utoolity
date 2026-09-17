/**
 * Polygon maths, coordinate cells and filename parsing.
 *
 * A direct port of `apps/roi-studio/roi_studio/core/geometry.py`. The two must
 * agree exactly: a batch annotated in the browser and the same batch annotated
 * in the desktop app are expected to produce identical files, and the parity
 * tests in `test/geometry.test.ts` pin the cases that are easy to get wrong.
 *
 * Points are always `[x, y]` in original image pixels unless a name says
 * otherwise. Nothing here throws: an unreadable cell yields `[]` so one bad row
 * cannot stop a whole folder from loading.
 */

import {
  CIRCLE_SEGMENTS,
  MIN_POINTS,
  MIN_POLY_AREA_PX,
  NDIGITS,
  SHAPE_POLYGON,
  SHAPE_TYPES,
  type ShapeKind,
} from "./config.ts";

export type Point = [number, number];
export type Poly = Point[];
export type MultiPoly = Poly[];

// ── number helpers ────────────────────────────────────────────

/**
 * Python's `round()`.
 *
 * Two things differ from `Math.round`, and both change what lands in a file:
 *
 * 1. Exact halves go to the *even* neighbour, so Python's `round(0.5)` is `0`
 *    and `round(2.5)` is `2`, where `Math.round` gives 1 and 3.
 * 2. Python rounds the *exact binary value* of the double. Scaling by a power
 *    of ten first throws that information away: `0.015 * 100` is
 *    `1.4999999999999998`, which looks like an exact half but is not, and
 *    Python's `round(0.015, 2)` is therefore `0.01`, not `0.02`.
 *
 * So the digits are taken from `toFixed`, which is specified to expand the
 * exact value, and the tie-break is applied to that decimal string. The
 * parity tests in `test/geometry.test.ts` pin the cases this gets right.
 */
export function pyRound(value: number, ndigits = 0): number {
  if (!Number.isFinite(value)) return value;
  const negative = value < 0;
  const abs = Math.abs(value);
  // Well beyond the digits any double needs in the coordinate range, so the
  // expansion is exact and the tie-break sees the true remainder.
  const expanded = abs.toFixed(Math.min(100, ndigits + 30));
  const dot = expanded.indexOf(".");
  const intPart = expanded.slice(0, dot);
  const frac = expanded.slice(dot + 1);
  const keep = frac.slice(0, ndigits);
  const rest = frac.slice(ndigits);

  let roundUp = false;
  const first = rest.charCodeAt(0) - 48;
  if (first > 5) {
    roundUp = true;
  } else if (first === 5) {
    if (/[1-9]/.test(rest.slice(1))) {
      roundUp = true; // strictly more than a half
    } else {
      // an exact half: keep the even neighbour
      const kept = ndigits > 0 ? keep : intPart;
      roundUp = (kept.charCodeAt(kept.length - 1) - 48) % 2 === 1;
    }
  }

  // Integer arithmetic on the digit string. Coordinates and ratios never come
  // close to 2^53, so a double holds this exactly.
  const scaled = Number(intPart + keep) + (roundUp ? 1 : 0);
  const out = scaled / 10 ** ndigits;
  if (out === 0) return 0; // never hand back -0
  return negative ? -out : out;
}

/** Python's `int()`, which truncates towards zero rather than rounding. */
function truncInt(value: number): number {
  return Math.trunc(value);
}

export function clamp(value: number, low: number, high: number): number {
  if (low > high) return low;
  return value < low ? low : value > high ? high : value;
}

function hypot(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}

// ── text / naming ─────────────────────────────────────────────

/**
 * Strip characters outside the BMP. Harmless in a browser, but they still
 * break some spreadsheet readers, so user strings pass through here on the way
 * to a file.
 */
export function safeText(value: unknown): string {
  const s = typeof value === "string" ? value : String(value);
  let out = "";
  for (const ch of s) {
    out += (ch.codePointAt(0) ?? 0) <= 0xffff ? ch : "?";
  }
  return out;
}

export type NaturalToken = [number, number, string];

/** Sort key that puts 'img2.jpg' before 'img10.jpg'. */
export function naturalKey(name: unknown): NaturalToken[] {
  const parts: NaturalToken[] = [];
  let num = "";
  for (const ch of String(name ?? "").toLowerCase()) {
    if (ch >= "0" && ch <= "9") {
      num += ch;
    } else {
      if (num) {
        parts.push([1, Number.parseInt(num, 10), ""]);
        num = "";
      }
      parts.push([0, 0, ch]);
    }
  }
  if (num) parts.push([1, Number.parseInt(num, 10), ""]);
  return parts;
}

/** Comparator built on {@link naturalKey}, for `Array.prototype.sort`. */
export function naturalCompare(a: unknown, b: unknown): number {
  const ka = naturalKey(a);
  const kb = naturalKey(b);
  const shared = Math.min(ka.length, kb.length);
  for (let i = 0; i < shared; i += 1) {
    const ta = ka[i]!;
    const tb = kb[i]!;
    if (ta[0] !== tb[0]) return ta[0] - tb[0];
    if (ta[1] !== tb[1]) return ta[1] - tb[1];
    if (ta[2] !== tb[2]) return ta[2] < tb[2] ? -1 : 1;
  }
  return ka.length - kb.length;
}

function basenameWithoutExt(fname: unknown): string {
  const raw = String(fname ?? "");
  const base = raw.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

/**
 * 'UBBRAP0091_cam3_2026-08-14_16-34-48.jpg' -> ['UBBRAP0091', 'cam3'].
 * Falls back to [basename, ''] when the pattern does not match.
 */
export function extractSiteCam(fname: unknown): [string, string] {
  const base = basenameWithoutExt(fname);
  const parts = base.split("_");
  if (parts.length >= 2 && parts[0]) return [parts[0], parts[1] ?? ""];
  return [base, ""];
}

/** 'cam3' -> '3', '9' -> '9', 'cam03' -> '3', 'cam00' -> '0', 'left' -> ''. */
export function camDigits(camToken: unknown): string {
  const match = /(\d+)/.exec(String(camToken ?? ""));
  if (!match) return "";
  const stripped = match[1]!.replace(/^0+/, "");
  return stripped || "0";
}

/**
 * 'UBBRAP0091_cam3_2026-08-14_16-34-48.jpg' -> 'UBBRAP0091_3'.
 * With no camera number the site id is returned alone; the caller surfaces
 * that as a warning rather than inventing a number.
 */
export function makeRoiKey(fname: unknown): string {
  const [site, cam] = extractSiteCam(fname);
  const digits = camDigits(cam);
  if (!site) return "";
  return digits ? `${site}_${digits}` : site;
}

// ── coordinate cells ──────────────────────────────────────────

function isPoint(obj: unknown): obj is [number, number] {
  return (
    Array.isArray(obj) &&
    obj.length === 2 &&
    obj.every((v) => typeof v === "number" && Number.isFinite(v))
  );
}

/**
 * Collapse any nesting depth into a flat list of polygons, accepting both the
 * current format and the legacy one that wrote a bare point list.
 */
function normalizePolyStructure(obj: unknown): MultiPoly {
  if (!Array.isArray(obj) || obj.length === 0) return [];
  if (obj.every((item) => isPoint(item))) {
    return [(obj as [number, number][]).map((item): Point => [item[0], item[1]])];
  }
  const polys: MultiPoly = [];
  for (const item of obj) {
    if (!Array.isArray(item) || item.length === 0) continue;
    if (item.every((p) => isPoint(p))) {
      const pts = (item as [number, number][]).map((p): Point => [p[0], p[1]]);
      if (pts.length >= 2) polys.push(pts);
    } else {
      polys.push(...normalizePolyStructure(item));
    }
  }
  return polys;
}

const EMPTY_CELLS = new Set(["nan", "none", "null", "[]", "[[]]"]);

/** Parse a coordinate cell in either the current or the legacy format. */
export function parseMultiPolys(coordStr: unknown): MultiPoly {
  if (coordStr === null || coordStr === undefined) return [];
  let s = String(coordStr).trim();
  if (!s || EMPTY_CELLS.has(s.toLowerCase())) return [];
  if (s.startsWith("'")) s = s.slice(1).trim(); // Excel text-cell apostrophe
  for (const attempt of [s, `[${s}]`]) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(attempt);
    } catch {
      continue;
    }
    const polys = normalizePolyStructure(parsed);
    if (polys.length) return polys;
  }
  return [];
}

/** Keep whole numbers whole, so a pixel cell stays [[231, 203]]. */
function cleanNumber(v: number): number {
  if (Number.isInteger(v) && Math.abs(v) < 1e15) return v;
  return pyRound(v, NDIGITS);
}

/**
 * Python writes these cells with `json.dumps(separators=(", ", ", "))`, which
 * puts a space after every comma. `JSON.stringify` puts none, so the cell text
 * would differ from the desktop app's for identical geometry.
 */
export function jsonSpaced(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => jsonSpaced(item)).join(", ")}]`;
  }
  return JSON.stringify(value);
}

/**
 * Render polygons as a JSON-style nested list: [[[x, y], ...], ...].
 * The outer list is ALWAYS the polygon list, so a single ROI is [[[x, y], ...]].
 * Every produced cell is directly JSON.parse()-able.
 */
export function fmtPolys(polys: MultiPoly | null | undefined): string {
  if (!polys || polys.length === 0) return "";
  const out = polys
    .filter((poly) => poly && poly.length > 0)
    .map((poly) => poly.map((p) => [cleanNumber(p[0]), cleanNumber(p[1])]));
  if (out.length === 0) return "";
  return jsonSpaced(out);
}

/** ['rect', 'circle'] -> '["rect", "circle"]'. */
export function fmtShapeTypes(kinds: readonly string[] | null | undefined): string {
  const clean = (kinds ?? []).map((k) =>
    (SHAPE_TYPES as readonly string[]).includes(k) ? k : SHAPE_POLYGON,
  );
  if (clean.length === 0) return "";
  return jsonSpaced(clean);
}

function parseStringList(cell: unknown): string[] | null {
  if (!cell) return null;
  let s = String(cell).trim();
  if (!s) return null;
  if (s.startsWith("'")) s = s.slice(1).trim();
  try {
    const parsed: unknown = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.map((k) => String(k));
  } catch {
    return null;
  }
  return null;
}

/**
 * Read the shape_types cell back, padded to `count` with 'polygon'. A missing
 * or unreadable cell is not an error: files written before this column existed
 * simply describe polygons.
 */
export function parseShapeTypes(cell: unknown, count = 0): ShapeKind[] {
  const raw = parseStringList(cell) ?? [];
  const kinds: ShapeKind[] = raw.map((k) =>
    (SHAPE_TYPES as readonly string[]).includes(k) ? (k as ShapeKind) : SHAPE_POLYGON,
  );
  if (count && kinds.length < count) {
    while (kinds.length < count) kinds.push(SHAPE_POLYGON);
  }
  return count ? kinds.slice(0, count) : kinds;
}

// ── primitives ────────────────────────────────────────────────

/** Even-odd ray casting test. */
export function pointInPoly(x: number, y: number, poly: Poly): boolean {
  const n = poly.length;
  if (n < 3) return false;
  let inside = false;
  let j = n - 1;
  for (let i = 0; i < n; j = i, i += 1) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y) {
      const denom = yj - yi || 1e-9;
      if (x < ((xj - xi) * (y - yi)) / denom + xi) inside = !inside;
    }
  }
  return inside;
}

/** Absolute shoelace area. */
export function polygonArea(poly: Poly): number {
  const n = poly.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const [x1, y1] = poly[i]!;
    const [x2, y2] = poly[(i + 1) % n]!;
    total += x1 * y2 - x2 * y1;
  }
  return Math.abs(total) / 2;
}

export function polygonBounds(poly: Poly): [number, number, number, number] {
  if (poly.length === 0) return [0, 0, 0, 0];
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Mean of the vertices, not the area-weighted centroid. */
export function polygonCentroid(poly: Poly): [number, number] {
  const n = poly.length;
  if (n === 0) return [0, 0];
  let sx = 0;
  let sy = 0;
  for (const [x, y] of poly) {
    sx += x;
    sy += y;
  }
  return [sx / n, sy / n];
}

export function pointSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return hypot(px - ax, py - ay);
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Drop repeated clicks on the same pixel, including a closing duplicate. */
export function dedupeConsecutive(poly: Poly): Poly {
  const out: Poly = [];
  for (const pt of poly) {
    const cur: Point = [pyRound(pt[0]), pyRound(pt[1])];
    const last = out[out.length - 1];
    if (!last || last[0] !== cur[0] || last[1] !== cur[1]) out.push(cur);
  }
  if (out.length > 1) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    if (first[0] === last[0] && first[1] === last[1]) out.pop();
  }
  return out;
}

function orient(p: Point, q: Point, r: Point): number {
  const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

function segIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  return orient(a, b, c) !== orient(a, b, d) && orient(c, d, a) !== orient(c, d, b);
}

/**
 * True when two non-adjacent edges cross. Reported as a warning only: a
 * self-intersecting ROI is legal, it is just usually a misclick.
 */
export function polySelfIntersects(poly: Poly): boolean {
  const n = poly.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i += 1) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    for (let j = i + 1; j < n; j += 1) {
      if (j === i || (j + 1) % n === i || j === (i + 1) % n) continue;
      const c = poly[j]!;
      const d = poly[(j + 1) % n]!;
      if (segIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

export interface ValidationResult {
  /** The cleaned polygon, or null when the shape cannot describe a region. */
  poly: Poly | null;
  messages: string[];
}

/**
 * A polygon is rejected outright only when it cannot describe a region: too
 * few distinct points, or effectively zero area. Clamping and crossed edges
 * are reported but accepted.
 */
export function validatePolygon(poly: Poly, width = 0, height = 0): ValidationResult {
  const messages: string[] = [];
  let cleaned = dedupeConsecutive(poly);
  if (cleaned.length !== poly.length) {
    messages.push(`removed ${poly.length - cleaned.length} duplicate point(s)`);
  }
  if (cleaned.length < MIN_POINTS) {
    messages.push(`needs at least ${MIN_POINTS} distinct points`);
    return { poly: null, messages };
  }
  if (width && height) {
    const clamped: Poly = cleaned.map(([x, y]): Point => [
      truncInt(clamp(x, 0, width - 1)),
      truncInt(clamp(y, 0, height - 1)),
    ]);
    const changed = clamped.some(
      (p, i) => p[0] !== cleaned[i]![0] || p[1] !== cleaned[i]![1],
    );
    if (changed) messages.push("clamped point(s) back inside the image");
    cleaned = clamped;
  }
  if (polygonArea(cleaned) < MIN_POLY_AREA_PX) {
    messages.push("shape has no area");
    return { poly: null, messages };
  }
  if (polySelfIntersects(cleaned)) {
    messages.push("edges cross - check the shape");
  }
  return { poly: cleaned, messages };
}

/** Image pixels -> 0..1 normalised, clamped inside the image. */
export function polysToNorm(
  polysPx: MultiPoly,
  width: number,
  height: number,
  ndigits: number = NDIGITS,
): MultiPoly {
  if (!width || !height) return [];
  return polysPx.map((poly) =>
    poly.map(([px, py]): Point => [
      pyRound(clamp(px / width, 0, 1), ndigits),
      pyRound(clamp(py / height, 0, 1), ndigits),
    ]),
  );
}

/** 0..1 normalised -> image pixels. */
export function normToPolys(
  polysNorm: MultiPoly,
  width: number,
  height: number,
): MultiPoly {
  return polysNorm.map((poly) =>
    poly.map(([nx, ny]): Point => [pyRound(nx * width), pyRound(ny * height)]),
  );
}

// ── shape construction ────────────────────────────────────────

/** Axis-aligned rectangle as four points, clockwise from top-left. */
export function rectToPolygon(x0: number, y0: number, x1: number, y1: number): Poly {
  const [left, right] = x0 <= x1 ? [x0, x1] : [x1, x0];
  const [top, bottom] = y0 <= y1 ? [y0, y1] : [y1, y0];
  return [
    [pyRound(left), pyRound(top)],
    [pyRound(right), pyRound(top)],
    [pyRound(right), pyRound(bottom)],
    [pyRound(left), pyRound(bottom)],
  ];
}

/** Ellipse as an N-gon. `ry` defaults to `rx`, giving a true circle. */
export function circleToPolygon(
  cx: number,
  cy: number,
  rx: number,
  ry: number | null = null,
  segments: number = CIRCLE_SEGMENTS,
): Poly {
  const radiusY = ry === null ? rx : ry;
  const pts: Poly = [];
  for (let i = 0; i < segments; i += 1) {
    const a = (2 * Math.PI * i) / segments;
    pts.push([pyRound(cx + rx * Math.cos(a)), pyRound(cy + radiusY * Math.sin(a))]);
  }
  return dedupeConsecutive(pts);
}

/** Recover [cx, cy, rx, ry] from a polygon drawn as a circle. */
export function ellipseFromPolygon(poly: Poly): [number, number, number, number] {
  const [x0, y0, x1, y1] = polygonBounds(poly);
  return [
    (x0 + x1) / 2,
    (y0 + y1) / 2,
    Math.max((x1 - x0) / 2, 0.5),
    Math.max((y1 - y0) / 2, 0.5),
  ];
}

/** Recover [x0, y0, x1, y1] from a polygon drawn as a rectangle. */
export function rectFromPolygon(poly: Poly): [number, number, number, number] {
  return polygonBounds(poly);
}

/** True when four points form an axis-aligned box, to the nearest pixel. */
export function isAxisAlignedRect(poly: Poly): boolean {
  if (poly.length !== 4) return false;
  const xs = [...new Set(poly.map((p) => pyRound(p[0])))].sort((a, b) => a - b);
  const ys = [...new Set(poly.map((p) => pyRound(p[1])))].sort((a, b) => a - b);
  if (xs.length !== 2 || ys.length !== 2) return false;
  const corners = new Set(poly.map((p) => `${pyRound(p[0])},${pyRound(p[1])}`));
  const expected = [
    `${xs[0]},${ys[0]}`,
    `${xs[1]},${ys[0]}`,
    `${xs[1]},${ys[1]}`,
    `${xs[0]},${ys[1]}`,
  ];
  return corners.size === 4 && expected.every((c) => corners.has(c));
}

// ── transforms ────────────────────────────────────────────────
// Note the asymmetry, which the desktop app relies on: when an image size is
// supplied the result is clamped and *truncated*; without one it is rounded.

export function translate(
  poly: Poly,
  dx: number,
  dy: number,
  width = 0,
  height = 0,
): Poly {
  if (width && height) {
    return poly.map(([x, y]): Point => [
      truncInt(clamp(x + dx, 0, width - 1)),
      truncInt(clamp(y + dy, 0, height - 1)),
    ]);
  }
  return poly.map(([x, y]): Point => [pyRound(x + dx), pyRound(y + dy)]);
}

export function scaleAbout(
  poly: Poly,
  cx: number,
  cy: number,
  fx: number,
  fy: number,
  width = 0,
  height = 0,
): Poly {
  const out = poly.map(([x, y]): Point => [cx + (x - cx) * fx, cy + (y - cy) * fy]);
  if (width && height) {
    return out.map(([x, y]): Point => [
      truncInt(clamp(x, 0, width - 1)),
      truncInt(clamp(y, 0, height - 1)),
    ]);
  }
  return out.map(([x, y]): Point => [pyRound(x), pyRound(y)]);
}

export function rotateAbout(
  poly: Poly,
  cx: number,
  cy: number,
  degrees: number,
  width = 0,
  height = 0,
): Poly {
  const rad = (degrees * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const out = poly.map(([x, y]): Point => {
    const dx = x - cx;
    const dy = y - cy;
    return [cx + dx * cosA - dy * sinA, cy + dx * sinA + dy * cosA];
  });
  if (width && height) {
    return out.map(([x, y]): Point => [
      truncInt(clamp(x, 0, width - 1)),
      truncInt(clamp(y, 0, height - 1)),
    ]);
  }
  return out.map(([x, y]): Point => [pyRound(x), pyRound(y)]);
}

// ── simplify (used by the freehand lasso) ─────────────────────

/**
 * Ramer-Douglas-Peucker. Turns a dense freehand trace into a polygon with a
 * workable number of vertices.
 */
export function simplifyPolygon(poly: Poly, tolerance = 2.0): Poly {
  if (poly.length < 3) return [...poly];

  const rdp = (points: Poly): Poly => {
    if (points.length < 3) return [...points];
    const [ax, ay] = points[0]!;
    const [bx, by] = points[points.length - 1]!;
    let worst = 0;
    let index = 0;
    for (let i = 1; i < points.length - 1; i += 1) {
      const d = pointSegmentDistance(points[i]![0], points[i]![1], ax, ay, bx, by);
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (worst <= tolerance) return [points[0]!, points[points.length - 1]!];
    const head = rdp(points.slice(0, index + 1));
    return [...head.slice(0, -1), ...rdp(points.slice(index))];
  };

  let simplified = rdp([...poly]);
  if (simplified.length > MIN_POINTS) simplified = dedupeConsecutive(simplified);
  return simplified.length >= MIN_POINTS ? simplified : dedupeConsecutive(poly);
}

// ── snapping ──────────────────────────────────────────────────

export interface SnapResult {
  x: number;
  y: number;
  snapped: boolean;
}

/**
 * Pull a point onto the image edges and onto nearby existing vertices. A
 * vertex match wins over an edge match, because it replaces both coordinates.
 */
export function snapPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  others: MultiPoly = [],
  tolerance = 6.0,
  toEdges = true,
  toShapes = true,
): SnapResult {
  let sx = x;
  let sy = y;
  let hit = false;
  if (toEdges && width && height) {
    for (const edge of [0, width - 1]) {
      if (Math.abs(sx - edge) <= tolerance) {
        sx = edge;
        hit = true;
      }
    }
    for (const edge of [0, height - 1]) {
      if (Math.abs(sy - edge) <= tolerance) {
        sy = edge;
        hit = true;
      }
    }
  }
  if (toShapes) {
    let bestD = tolerance;
    let best: Point | null = null;
    for (const poly of others) {
      for (const [vx, vy] of poly) {
        const d = hypot(sx - vx, sy - vy);
        if (d < bestD) {
          bestD = d;
          best = [vx, vy];
        }
      }
    }
    if (best) {
      sx = best[0];
      sy = best[1];
      hit = true;
    }
  }
  return { x: sx, y: sy, snapped: hit };
}
