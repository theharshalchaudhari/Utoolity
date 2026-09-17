/**
 * Batch statistics, the coverage JSON and the standalone HTML report.
 *
 * `buildStats` is a straight port of `build_stats` in
 * `apps/roi-studio/roi_studio/core/report.py`, so the numbers the web tool
 * shows are the numbers the desktop app shows, and `roi_coverage.json` is
 * interchangeable between them.
 *
 * The HTML is *not* a byte-for-byte port of the desktop template: it is
 * rendered from the same stats with its own self-contained stylesheet. The
 * report is for humans, and `roi_coverage.json` is the machine-readable
 * artefact, so the numbers are what has to agree.
 */

import { APP_VERSION, SHAPE_TYPES } from "./config.ts";
import * as geo from "./geometry.ts";
import { pyDumps, pyFloat, type PyValue } from "./pyjson.ts";
import type { CanonRow } from "./store.ts";

export type ImageStatus = "roi" | "no_roi" | "todo";

export interface ImageStats {
  image_name: string;
  roi_key: string;
  site_id: string;
  cam_number: string;
  polygons: number;
  kinds: string[];
  status: ImageStatus;
  comment: string;
  width: number;
  height: number;
  /** Percentage of the frame covered, clamped to 100. */
  coverage: number;
  in_folder: boolean;
}

export interface CameraStats {
  roi_key: string;
  site_id: string;
  cam_number: string;
  images: number;
  annotated: number;
  no_roi: number;
  todo: number;
  polygons: number;
  /** The highest single-image coverage on this camera, not a sum. */
  coverage: number;
}

export interface Totals {
  images: number;
  annotated: number;
  no_roi: number;
  polygons: number;
  cameras: number;
  cameras_covered: number;
  cameras_no_roi: number;
  kinds: Record<string, number>;
  folder: string;
  remaining: number;
  cameras_missing: string[];
  mean_coverage: number;
}

export interface Stats {
  totals: Totals;
  images: ImageStats[];
  cameras: CameraStats[];
}

const STATUS_FIELD = {
  roi: "annotated",
  no_roi: "no_roi",
  todo: "todo",
} as const;

/** Everything the report and the in-app dashboard need, as plain data. */
export function buildStats(
  rows: readonly CanonRow[],
  imageFiles: readonly string[] = [],
  folder = "",
): Stats {
  const known = new Set(imageFiles);
  const perImage = new Map<string, ImageStats>();

  for (const row of rows) {
    const name = row.image_name;
    if (!name) continue;
    let polys = geo.parseMultiPolys(row.pixel_coords);
    if (polys.length === 0) polys = geo.parseMultiPolys(row.normalized_coords);
    const kinds = geo.parseShapeTypes(row.shape_types, polys.length);

    let entry = perImage.get(name);
    if (!entry) {
      entry = {
        image_name: name,
        roi_key: row.roi_key || geo.makeRoiKey(name),
        site_id: row.site_id,
        cam_number: row.cam_number,
        polygons: 0,
        kinds: [],
        status: "todo",
        comment: "",
        width: Math.trunc(row.image_width || 0),
        height: Math.trunc(row.image_height || 0),
        coverage: 0,
        in_folder: known.size === 0 || known.has(name),
      };
      perImage.set(name, entry);
    }
    if (row.comment) entry.comment = row.comment;

    if (row.row_type === "roi" && polys.length) {
      entry.polygons += polys.length;
      entry.kinds.push(...kinds);
      entry.status = "roi";
      const { width, height } = entry;
      if (width && height) {
        const area = polys.reduce((sum, p) => sum + geo.polygonArea(p), 0);
        entry.coverage = Math.min(100, (100 * area) / (width * height));
      } else {
        // a normalised polygon's area is already a fraction of the frame
        const norm = geo.parseMultiPolys(row.normalized_coords);
        if (norm.length) {
          const area = norm.reduce((sum, p) => sum + geo.polygonArea(p), 0);
          entry.coverage = Math.min(100, 100 * area);
        }
      }
    } else if (row.row_type === "no_roi" && entry.status === "todo") {
      entry.status = "no_roi";
    }
  }

  // images present in the folder but never annotated still belong in the report
  for (const name of imageFiles) {
    if (perImage.has(name)) continue;
    const [siteId, camNumber] = geo.extractSiteCam(name);
    perImage.set(name, {
      image_name: name,
      roi_key: geo.makeRoiKey(name),
      site_id: siteId,
      cam_number: camNumber,
      polygons: 0,
      kinds: [],
      status: "todo",
      comment: "",
      width: 0,
      height: 0,
      coverage: 0,
      in_folder: true,
    });
  }

  const images = [...perImage.values()].sort((a, b) =>
    geo.naturalCompare(a.image_name, b.image_name),
  );

  const cameraMap = new Map<string, CameraStats>();
  for (const entry of images) {
    const key = entry.roi_key || "(no key)";
    let cam = cameraMap.get(key);
    if (!cam) {
      cam = {
        roi_key: key,
        site_id: entry.site_id,
        cam_number: entry.cam_number,
        images: 0,
        annotated: 0,
        no_roi: 0,
        todo: 0,
        polygons: 0,
        coverage: 0,
      };
      cameraMap.set(key, cam);
    }
    cam.images += 1;
    cam.polygons += entry.polygons;
    cam.coverage = Math.max(cam.coverage, entry.coverage);
    cam[STATUS_FIELD[entry.status]] += 1;
  }
  const cameras = [...cameraMap.values()].sort((a, b) =>
    geo.naturalCompare(a.roi_key, b.roi_key),
  );

  const kinds: Record<string, number> = {};
  for (const kind of SHAPE_TYPES) kinds[kind] = 0;
  for (const entry of images) {
    for (const kind of entry.kinds) kinds[kind] = (kinds[kind] ?? 0) + 1;
  }

  const annotated = images.filter((e) => e.status === "roi").length;
  const noRoi = images.filter((e) => e.status === "no_roi").length;
  const totals: Totals = {
    images: images.length,
    annotated,
    no_roi: noRoi,
    polygons: images.reduce((sum, e) => sum + e.polygons, 0),
    cameras: cameras.length,
    cameras_covered: cameras.filter((c) => c.polygons > 0).length,
    cameras_no_roi: cameras.filter((c) => c.polygons === 0 && c.no_roi > 0).length,
    kinds,
    folder,
    remaining: Math.max(0, images.length - annotated - noRoi),
    cameras_missing: cameras
      .filter((c) => c.polygons === 0 && c.no_roi === 0)
      .map((c) => c.roi_key),
    mean_coverage: annotated
      ? images.filter((e) => e.status === "roi").reduce((s, e) => s + e.coverage, 0) /
        annotated
      : 0,
  };

  return { totals, images, cameras };
}

// ── coverage JSON ─────────────────────────────────────────────

/** The machine-readable half of the report: totals and per-camera numbers. */
export function dumpCoverageJson(stats: Stats, now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  const generatedAt =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const payload: PyValue = {
    generated_at: generatedAt,
    generator: `ROI Studio v${APP_VERSION}`,
    totals: {
      images: stats.totals.images,
      annotated: stats.totals.annotated,
      no_roi: stats.totals.no_roi,
      polygons: stats.totals.polygons,
      cameras: stats.totals.cameras,
      cameras_covered: stats.totals.cameras_covered,
      cameras_no_roi: stats.totals.cameras_no_roi,
      kinds: stats.totals.kinds,
      folder: stats.totals.folder,
      remaining: stats.totals.remaining,
      cameras_missing: stats.totals.cameras_missing,
      mean_coverage: pyFloat(stats.totals.mean_coverage),
    },
    cameras: stats.cameras.map((c) => ({
      roi_key: c.roi_key,
      site_id: c.site_id,
      cam_number: c.cam_number,
      images: c.images,
      annotated: c.annotated,
      no_roi: c.no_roi,
      todo: c.todo,
      polygons: c.polygons,
      coverage: pyFloat(c.coverage),
    })),
  };
  return pyDumps(payload, 1);
}

// ── HTML report ───────────────────────────────────────────────

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const REPORT_CSS = `
:root{color-scheme:light dark;--bg:#f6f7f9;--fg:#1c1f24;--muted:#5b6472;
--card:#ffffff;--line:#e2e6ec;--roi:#2f6bd8;--noroi:#0f9d58;--todo:#c3c9d4;
--warn:#b8860b;--shadow:0 1px 3px rgba(16,24,40,.08)}
@media (prefers-color-scheme:dark){:root{--bg:#14171c;--fg:#e8ebf0;
--muted:#9aa4b5;--card:#1c2026;--line:#2b3138;--roi:#5b8def;--noroi:#34c77b;
--todo:#3a424d;--warn:#e0b341;--shadow:none}}
*{box-sizing:border-box}
body{margin:0;padding:24px 16px 48px;background:var(--bg);color:var(--fg);
font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:1100px;margin:0 auto}
h1{margin:0 0 4px;font-size:24px}
.sub{color:var(--muted);margin:0 0 24px;font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;
padding:16px 18px;margin-bottom:18px;box-shadow:var(--shadow)}
.card h2{margin:0 0 14px;font-size:15px;font-weight:600}
.tiles{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
margin-bottom:18px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;
padding:14px 16px;box-shadow:var(--shadow)}
.tile-label{color:var(--muted);font-size:12px;text-transform:uppercase;
letter-spacing:.04em}
.tile-value{font-size:26px;font-weight:600;margin-top:4px}
.tile-hint{color:var(--muted);font-size:12px;margin-top:2px}
.bar{display:flex;height:14px;border-radius:7px;overflow:hidden;
background:var(--todo);margin-bottom:12px}
.bar span{display:block;font-size:10px;color:#fff;text-align:center;line-height:14px}
.legend{display:flex;flex-wrap:wrap;gap:16px;color:var(--muted);font-size:13px}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{background:var(--bg);border:1px solid var(--line);border-radius:999px;
padding:4px 12px;font-size:13px}
.crow{display:grid;grid-template-columns:minmax(90px,180px) 1fr auto;gap:10px;
align-items:center;margin-bottom:6px;font-size:13px}
.ctrack{background:var(--bg);border-radius:5px;height:10px;overflow:hidden}
.cfill{background:var(--roi);height:100%;border-radius:5px}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);
white-space:nowrap}
th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;
letter-spacing:.03em}
td.num,th.num{text-align:right}
.tag{font-size:12px;padding:2px 8px;border-radius:999px;border:1px solid var(--line)}
.tag.ok{color:var(--noroi)}.tag.warn{color:var(--warn)}
footer{color:var(--muted);font-size:12px;margin-top:8px}
`.trim();

function tile(label: string, value: string, hint = ""): string {
  const hintHtml = hint ? `<div class="tile-hint">${esc(hint)}</div>` : "";
  return (
    `<div class="tile"><div class="tile-label">${esc(label)}</div>` +
    `<div class="tile-value">${esc(value)}</div>${hintHtml}</div>`
  );
}

function pct(part: number, whole: number): number {
  return whole ? (100 * part) / whole : 0;
}

/**
 * A self-contained HTML report: no network, no external assets, readable in
 * light and dark, and openable from anywhere.
 */
export function renderReportHtml(stats: Stats, now: Date = new Date()): string {
  const { totals, images, cameras } = stats;

  const segments: [string, number, string][] = [
    ["roi", totals.annotated, "ROI drawn"],
    ["noroi", totals.no_roi, "No ROI"],
    ["todo", totals.remaining, "Remaining"],
  ];
  const bar = segments
    .filter(([, count]) => count > 0)
    .map(([cls, count, label]) => {
      const share = pct(count, totals.images);
      const text = share >= 12 ? String(count) : "";
      const colour = cls === "todo" ? "var(--todo)" : `var(--${cls})`;
      return (
        `<span style="flex:${share.toFixed(4)} 0 0;background:${colour}" ` +
        `title="${esc(`${label}: ${count}`)}">${text}</span>`
      );
    })
    .join("");
  const legend = segments
    .map(
      ([cls, count, label]) =>
        `<span><i class="dot" style="background:${
          cls === "todo" ? "var(--todo)" : `var(--${cls})`
        }"></i>${esc(label)} <strong>${count}</strong></span>`,
    )
    .join("");

  const topCameras = [...cameras].sort(
    (a, b) => b.polygons - a.polygons || geo.naturalCompare(a.roi_key, b.roi_key),
  );
  const shown = topCameras.slice(0, 20);
  const maxPolys = Math.max(1, ...shown.map((c) => c.polygons));
  const cameraBars = shown
    .map((c) => {
      const width = Math.max(1.2, pct(c.polygons, maxPolys));
      return (
        `<div class="crow"><span>${esc(c.roi_key)}</span>` +
        `<span class="ctrack"><span class="cfill" style="width:${width.toFixed(2)}%"></span></span>` +
        `<span class="num">${c.polygons}</span></div>`
      );
    })
    .join("");
  const cameraNote =
    topCameras.length > shown.length
      ? `<footer>Showing the busiest ${shown.length} of ${topCameras.length} cameras.</footer>`
      : "";

  const totalShapes = Object.values(totals.kinds).reduce((a, b) => a + b, 0);
  const shapeChips = SHAPE_TYPES.map((kind) => {
    const count = totals.kinds[kind] ?? 0;
    return `<span class="chip"><strong>${count}</strong> ${esc(kind)} · ${pct(
      count,
      totalShapes,
    ).toFixed(0)}%</span>`;
  }).join("");

  const missing = totals.cameras_missing.slice(0, 200);
  const missingCard = totals.cameras_missing.length
    ? `<div class="card"><h2>Cameras with nothing recorded</h2><div class="chips">${missing
        .map((k) => `<span class="chip">${esc(k)}</span>`)
        .join("")}</div>${
        totals.cameras_missing.length > missing.length
          ? `<footer>+${totals.cameras_missing.length - missing.length} more.</footer>`
          : ""
      }</div>`
    : "";

  const cameraRows = cameras
    .map((c) => {
      const state =
        c.polygons > 0
          ? '<span class="tag ok">covered</span>'
          : c.no_roi > 0
            ? '<span class="tag">marked no_roi</span>'
            : '<span class="tag warn">not started</span>';
      return (
        `<tr><td>${esc(c.roi_key)}</td><td>${esc(c.site_id)}</td>` +
        `<td>${esc(c.cam_number)}</td><td class="num">${c.images}</td>` +
        `<td class="num">${c.annotated}</td><td class="num">${c.polygons}</td>` +
        `<td class="num">${c.coverage.toFixed(1)}%</td><td>${state}</td></tr>`
      );
    })
    .join("");

  const stateLabel: Record<ImageStatus, string> = {
    roi: "ROI drawn",
    no_roi: "No ROI",
    todo: "Remaining",
  };
  const imageRows = images
    .map((e) => {
      const size = e.width && e.height ? `${e.width}x${e.height}` : "-";
      const kinds = e.kinds.length ? [...new Set(e.kinds)].sort().join(", ") : "-";
      const coverage = e.status === "roi" ? `${e.coverage.toFixed(1)}%` : "-";
      return (
        `<tr><td>${esc(e.image_name)}</td><td>${esc(e.roi_key)}</td>` +
        `<td>${esc(size)}</td><td class="num">${e.polygons}</td>` +
        `<td>${esc(kinds)}</td><td class="num">${coverage}</td>` +
        `<td>${esc(stateLabel[e.status])}</td><td>${esc(e.comment)}</td></tr>`
      );
    })
    .join("");

  const stamp = now.toISOString().slice(0, 16).replace("T", " ");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ROI batch report</title>
<style>${REPORT_CSS}</style></head>
<body><div class="wrap">
<h1>ROI batch report</h1>
<p class="sub">${esc(totals.folder)} · generated ${esc(stamp)} · ROI Studio v${esc(
    APP_VERSION,
  )}</p>

<div class="tiles">
${tile("Images", String(totals.images))}
${tile("ROI drawn", String(totals.annotated), `${pct(totals.annotated, totals.images).toFixed(0)}% of the batch`)}
${tile("No ROI", String(totals.no_roi))}
${tile("Remaining", String(totals.remaining))}
${tile("Total ROIs", String(totals.polygons), `across ${totals.cameras} camera(s)`)}
${tile("Mean frame covered", `${totals.mean_coverage.toFixed(1)}%`)}
</div>

<div class="card"><h2>Batch progress</h2>
<div class="bar">${bar}</div><div class="legend">${legend}</div></div>

<div class="card"><h2>ROIs per camera</h2>${cameraBars || "<p class=\"sub\">Nothing drawn yet.</p>"}${cameraNote}</div>

<div class="card"><h2>Shape mix</h2><div class="chips">${shapeChips}</div></div>

${missingCard}

<div class="card"><h2>Coverage by camera</h2><div class="scroll"><table>
<thead><tr><th>roi_key</th><th>site</th><th>cam</th><th class="num">images</th>
<th class="num">annotated</th><th class="num">ROIs</th>
<th class="num">frame covered</th><th>state</th></tr></thead>
<tbody>${cameraRows}</tbody></table></div></div>

<div class="card"><h2>Every image</h2><div class="scroll"><table>
<thead><tr><th>image</th><th>roi_key</th><th>size</th><th class="num">ROIs</th>
<th>shapes</th><th class="num">frame covered</th><th>state</th><th>comment</th>
</tr></thead><tbody>${imageRows}</tbody></table></div></div>

<footer>Coordinates are normalised to 2 decimals. Every figure here is also in
roi_annotations.json and roi_coverage.json.</footer>
</div></body></html>
`;
}
