/**
 * Parity tests for the undo stack, including the two behaviours that are easy
 * to lose in a port: the first push only seeds the state, and an overflowing
 * stack drops its oldest entry. Expected values come from running
 * `apps/roi-studio/roi_studio/core/history.py`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { History } from "../src/history.ts";
import { makeRect, type Shape } from "../src/model.ts";

const box = (size: number): Shape[] => [makeRect(0, 0, size, size)];

test("the first push seeds the state without creating an undo step", () => {
  const history = new History();
  history.push("first", box(5));
  assert.equal(history.canUndo, false);
  assert.deepEqual(history.depth(), [0, 0]);
});

test("undo and redo walk the stack and report their labels", () => {
  const history = new History();
  history.push("first", box(5));
  history.push("second", box(6));
  assert.equal(history.canUndo, true);
  assert.deepEqual(history.depth(), [1, 0]);
  assert.equal(history.undoLabel(), "second");

  const undone = history.undo();
  assert.equal(undone?.label, "second");
  assert.equal(undone?.snapshot.length, 1);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, true);
  assert.deepEqual(history.depth(), [0, 1]);

  const redone = history.redo();
  assert.equal(redone?.label, "second");
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);
  assert.deepEqual(history.depth(), [1, 0]);
});

test("undo restores the state from before the change", () => {
  const history = new History();
  history.push("draw", box(5));
  history.push("resize", box(60));
  const undone = history.undo();
  // back to the 5px box that was current before "resize"
  assert.deepEqual(undone?.snapshot[0]?.points, [
    [0, 0],
    [5, 0],
    [5, 5],
    [0, 5],
  ]);
});

test("undo and redo on an empty stack return null", () => {
  const history = new History();
  assert.equal(history.undo(), null);
  assert.equal(history.redo(), null);
  assert.equal(history.undoLabel(), "");
  assert.equal(history.redoLabel(), "");
});

test("a new edit clears the redo stack", () => {
  const history = new History();
  history.push("first", box(5));
  history.push("second", box(6));
  history.undo();
  assert.equal(history.canRedo, true);
  history.push("third", box(7));
  assert.equal(history.canRedo, false);
});

test("the stack is capped, dropping the oldest entry", () => {
  const history = new History(3);
  for (let i = 0; i < 10; i += 1) history.push(`s${i}`, box(i + 1));
  assert.deepEqual(history.depth(), [3, 0]);
  assert.equal(history.limit, 3);
  // the most recent change is still the one undo would reverse
  assert.equal(history.undoLabel(), "s9");
});

test("the limit never drops below two", () => {
  assert.equal(new History(1).limit, 2);
  assert.equal(new History(0).limit, 2);
});

test("snapshots are cloned, so later edits cannot corrupt the stack", () => {
  const history = new History();
  const live = box(5);
  history.push("first", live);
  history.push("second", box(6));
  // mutating the array that was handed in must not change what undo returns
  live[0]!.points[0] = [999, 999];
  const undone = history.undo();
  assert.deepEqual(undone?.snapshot[0]?.points[0], [0, 0]);
});

test("reset starts a fresh history for a newly loaded image", () => {
  const history = new History();
  history.push("first", box(5));
  history.push("second", box(6));
  history.reset(box(7));
  assert.deepEqual(history.depth(), [0, 0]);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});
