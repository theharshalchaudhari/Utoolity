/**
 * @repo/roi-core — the framework-free half of ROI Studio.
 *
 * Mirrors `apps/roi-studio/roi_studio/core`, which imports no Qt so it can be
 * tested headless. Nothing in here touches the DOM, React or the filesystem,
 * so it runs in the browser, in a worker, and under `node --test`.
 */

export * from "./config.ts";
export * from "./geometry.ts";
export * from "./model.ts";
export * from "./history.ts";
export * from "./store.ts";
export * from "./exporters.ts";
export * from "./report.ts";
export * from "./xlsx.ts";
export { pyDumps, pyFloat, type PyFloat, type PyValue } from "./pyjson.ts";
