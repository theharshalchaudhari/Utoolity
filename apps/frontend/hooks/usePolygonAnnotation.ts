"use client";

/**
 * The editor state for one image: its shapes, what is selected, the active
 * tool, and the undo stack.
 *
 * The undo stack is `History` from `@repo/roi-core`, the same snapshot model
 * the desktop app uses. It lives in a ref because it is mutable and its
 * identity must survive re-renders, and it is only ever read inside an event
 * handler — never during render. What the UI needs from it (`canUndo` and the
 * step labels) is copied into state by `syncHistory` after every change.
 */

import { useCallback, useRef, useState } from "react";

import {
  DEFAULT_CLASS,
  History,
  MAX_POLYS_PER_IMAGE,
  cloneShape,
  translateShape,
  validateShape,
  type Shape,
} from "@repo/roi-core";

import type { Tool } from "@/types/roi";

export interface UsePolygonAnnotation {
  shapes: Shape[];
  selected: number[];
  tool: Tool;
  className: string;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string;
  redoLabel: string;
  setTool: (tool: Tool) => void;
  setClassName: (name: string) => void;
  setSelected: (indexes: number[]) => void;
  /** Replace the shapes without touching the undo stack, e.g. on image load. */
  load: (shapes: Shape[]) => void;
  /** Record a change and add an undo step. */
  commit: (label: string, next: Shape[]) => void;
  /** Update one shape in place, e.g. while dragging. No undo step. */
  preview: (next: Shape[]) => void;
  addShape: (shape: Shape, label?: string) => string[];
  setShapeClass: (index: number, name: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  nudgeSelected: (dx: number, dy: number) => void;
  toggleLock: (index: number) => void;
  toggleVisible: (index: number) => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  markClean: () => void;
}

export function usePolygonAnnotation(
  width = 0,
  height = 0,
): UsePolygonAnnotation {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [className, setClassName] = useState<string>(DEFAULT_CLASS);
  const [dirty, setDirty] = useState(false);
  const historyRef = useRef<History>(new History());
  const [history, setHistory] = useState({
    canUndo: false,
    canRedo: false,
    undoLabel: "",
    redoLabel: "",
  });

  /**
   * Copy what the UI needs out of the mutable stack. Called after every change,
   * so the stack itself is never read while rendering.
   */
  const syncHistory = useCallback(() => {
    const stack = historyRef.current;
    setHistory({
      canUndo: stack.canUndo,
      canRedo: stack.canRedo,
      undoLabel: stack.undoLabel(),
      redoLabel: stack.redoLabel(),
    });
  }, []);

  const load = useCallback(
    (next: Shape[]) => {
      historyRef.current = new History();
      historyRef.current.reset(next);
      setShapes(next.map((s) => cloneShape(s)));
      setSelected([]);
      setDirty(false);
      syncHistory();
    },
    [syncHistory],
  );

  const commit = useCallback(
    (label: string, next: Shape[]) => {
      historyRef.current.push(label, next);
      setShapes(next);
      setDirty(true);
      syncHistory();
    },
    [syncHistory],
  );

  /** No undo step: used for the intermediate frames of a drag. */
  const preview = useCallback((next: Shape[]) => {
    setShapes(next);
  }, []);

  const addShape = useCallback(
    (shape: Shape, label = "draw"): string[] => {
      if (shapes.length >= MAX_POLYS_PER_IMAGE) {
        return [`this image already has ${MAX_POLYS_PER_IMAGE} ROIs`];
      }
      const { shape: clean, messages } = validateShape(shape, width, height);
      if (!clean) return messages;
      const next = [...shapes, clean];
      historyRef.current.push(label, next);
      setShapes(next);
      setSelected([next.length - 1]);
      setDirty(true);
      syncHistory();
      return messages;
    },
    [syncHistory, height, shapes, width],
  );

  const setShapeClass = useCallback(
    (index: number, name: string) => {
      const target = shapes[index];
      if (!target) return;
      const next = shapes.map((s, i) =>
        i === index ? { ...s, className: name || DEFAULT_CLASS } : s,
      );
      commit("change class", next);
    },
    [commit, shapes],
  );

  const deleteSelected = useCallback(() => {
    if (selected.length === 0) return;
    const drop = new Set(selected);
    const next = shapes.filter((s, i) => !drop.has(i) || s.locked);
    if (next.length === shapes.length) return;
    commit(selected.length > 1 ? "delete ROIs" : "delete ROI", next);
    setSelected([]);
  }, [commit, selected, shapes]);

  const duplicateSelected = useCallback(() => {
    if (selected.length === 0) return;
    const copies = selected
      .map((i) => shapes[i])
      .filter((s): s is Shape => Boolean(s))
      .map((s) => translateShape(cloneShape(s), 12, 12, width, height));
    if (copies.length === 0) return;
    if (shapes.length + copies.length > MAX_POLYS_PER_IMAGE) return;
    const next = [...shapes, ...copies];
    commit(copies.length > 1 ? "duplicate ROIs" : "duplicate ROI", next);
    setSelected(copies.map((_, i) => shapes.length + i));
  }, [commit, height, selected, shapes, width]);

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (selected.length === 0) return;
      const move = new Set(selected);
      const next = shapes.map((s, i) =>
        move.has(i) && !s.locked ? translateShape(s, dx, dy, width, height) : s,
      );
      commit("move ROI", next);
    },
    [commit, height, selected, shapes, width],
  );

  const toggleLock = useCallback(
    (index: number) => {
      const next = shapes.map((s, i) => (i === index ? { ...s, locked: !s.locked } : s));
      commit("lock ROI", next);
    },
    [commit, shapes],
  );

  const toggleVisible = useCallback(
    (index: number) => {
      const next = shapes.map((s, i) => (i === index ? { ...s, visible: !s.visible } : s));
      commit("hide ROI", next);
    },
    [commit, shapes],
  );

  const clearAll = useCallback(() => {
    if (shapes.length === 0) return;
    commit("clear all", []);
    setSelected([]);
  }, [commit, shapes.length]);

  const undo = useCallback(() => {
    const step = historyRef.current.undo();
    if (!step) return;
    setShapes(step.snapshot);
    setSelected([]);
    setDirty(true);
    syncHistory();
  }, [syncHistory]);

  const redo = useCallback(() => {
    const step = historyRef.current.redo();
    if (!step) return;
    setShapes(step.snapshot);
    setSelected([]);
    setDirty(true);
    syncHistory();
  }, [syncHistory]);

  const markClean = useCallback(() => setDirty(false), []);

  return {
    shapes,
    selected,
    tool,
    className,
    dirty,
    ...history,
    setTool,
    setClassName,
    setSelected,
    load,
    commit,
    preview,
    addShape,
    setShapeClass,
    deleteSelected,
    duplicateSelected,
    nudgeSelected,
    toggleLock,
    toggleVisible,
    clearAll,
    undo,
    redo,
    markClean,
  };
}
