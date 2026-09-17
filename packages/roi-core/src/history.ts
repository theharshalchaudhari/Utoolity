/**
 * Undo / redo.
 *
 * Snapshot based rather than command based: an image never holds more than
 * MAX_POLYS_PER_IMAGE shapes, so copying the whole list is cheap and cannot
 * drift out of sync the way paired do/undo methods do. Every entry carries a
 * label so the UI can say exactly what Ctrl+Z will undo.
 *
 * Port of `apps/roi-studio/roi_studio/core/history.py`, including its two
 * quirks: the very first `push` seeds the current state without creating an
 * undo step, and an overflowing stack drops its *oldest* entry.
 */

import { MAX_UNDO_STEPS } from "./config.ts";
import { cloneShape, type Shape } from "./model.ts";

export type Snapshot = readonly Shape[];

export interface HistoryStep {
  label: string;
  snapshot: Shape[];
}

interface Entry {
  label: string;
  snapshot: Shape[];
}

function clone(snapshot: Snapshot): Shape[] {
  return snapshot.map((shape) => cloneShape(shape));
}

/** A labelled undo stack for one image's shapes. */
export class History {
  readonly limit: number;

  private undoStack: Entry[] = [];

  private redoStack: Entry[] = [];

  private current: Shape[] | null = null;

  private label = "";

  constructor(limit: number = MAX_UNDO_STEPS) {
    this.limit = Math.max(2, Math.trunc(limit));
  }

  /** Start a fresh history for a newly loaded image. */
  reset(snapshot: Snapshot): void {
    this.undoStack = [];
    this.redoStack = [];
    this.current = clone(snapshot);
    this.label = "";
  }

  /** Record that the state just changed, and what the change was. */
  push(label: string, snapshot: Snapshot): void {
    if (this.current === null) {
      this.current = clone(snapshot);
      return;
    }
    this.undoStack.push({ label, snapshot: this.current });
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    this.current = clone(snapshot);
    this.label = label;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** What Ctrl+Z would undo, for the menu label. */
  undoLabel(): string {
    return this.undoStack[this.undoStack.length - 1]?.label ?? "";
  }

  redoLabel(): string {
    return this.redoStack[this.redoStack.length - 1]?.label ?? "";
  }

  /** [undoDepth, redoDepth] */
  depth(): [number, number] {
    return [this.undoStack.length, this.redoStack.length];
  }

  /** The label of the last change made, whether or not it can be undone. */
  lastLabel(): string {
    return this.label;
  }

  undo(): HistoryStep | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push({ label: entry.label, snapshot: this.current ?? [] });
    if (this.redoStack.length > this.limit) this.redoStack.shift();
    this.current = entry.snapshot;
    return { label: entry.label, snapshot: clone(entry.snapshot) };
  }

  redo(): HistoryStep | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push({ label: entry.label, snapshot: this.current ?? [] });
    this.current = entry.snapshot;
    return { label: entry.label, snapshot: clone(entry.snapshot) };
  }
}
