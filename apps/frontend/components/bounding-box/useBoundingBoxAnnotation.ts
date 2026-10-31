"use client";

import { useCallback, useState } from "react";

export type Point = { x: number; y: number };
export type BoundingBoxAnnotation = {
  id: string;
  label: string;
  points: [Point, Point, Point, Point];
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: number;
};
export type AnnotationTool = "annotate" | "edit" | "add" | "delete";

const currentActor = () => {
  if (typeof window === "undefined") return "Unknown";
  const cached = window.localStorage.getItem("utoolity.cached-user");
  if (cached) {
    try {
      const user = JSON.parse(cached) as { displayName?: unknown };
      if (typeof user.displayName === "string" && user.displayName.trim())
        return user.displayName;
    } catch {}
  }
  return (
    window.localStorage.getItem("utoolity.authenticated-user-id") ?? "Unknown"
  );
};

const rectanglePoints = (
  start: Point,
  end: Point,
): [Point, Point, Point, Point] => {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
};

export function useBoundingBoxAnnotation() {
  const [points, setPoints] = useState<Point[]>([]);
  const [boxes, setBoxes] = useState<BoundingBoxAnnotation[]>([]);
  const [currentLabel, setCurrentLabel] = useState("");
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    null,
  );
  const [tool, setTool] = useState<AnnotationTool>("annotate");
  const [history, setHistory] = useState<
    Array<{ points: Point[]; boxes: BoundingBoxAnnotation[] }>
  >([]);

  const saveHistory = useCallback(() => {
    setHistory((previous) => [...previous, { points, boxes }]);
  }, [boxes, points]);

  const addPoint = useCallback(
    (point: Point) => {
      if (tool !== "annotate") return;
      if (!points.length) {
        setPoints([point]);
        return;
      }
      saveHistory();
      const actor = currentActor();
      setBoxes((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          label: currentLabel.trim() || `Object ${previous.length + 1}`,
          points: rectanglePoints(points[0], point),
          createdBy: actor,
          updatedBy: actor,
          updatedAt: Date.now(),
        },
      ]);
      setPoints([]);
    },
    [boxes.length, currentLabel, points, saveHistory, tool],
  );

  const updatePoint = useCallback((index: number, point: Point) => {
    setPoints((previous) =>
      previous.map((value, itemIndex) => (itemIndex === index ? point : value)),
    );
  }, []);

  const updateBoxPoint = useCallback(
    (id: string, index: number, point: Point) => {
      setHistory((previous) => [...previous, { points, boxes }]);
      setBoxes((previous) =>
        previous.map((box) => {
          if (box.id !== id) return box;
          const opposite = box.points[(index + 2) % 4];
          return {
            ...box,
            points: rectanglePoints(opposite, point),
            updatedBy: currentActor(),
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [boxes, points],
  );

  const updateBoxLabel = useCallback((id: string, label: string) => {
    setBoxes((previous) =>
      previous.map((box) =>
        box.id === id
          ? { ...box, label, updatedBy: currentActor(), updatedAt: Date.now() }
          : box,
      ),
    );
  }, []);

  const loadAnnotations = useCallback((next: BoundingBoxAnnotation[]) => {
    setPoints([]);
    setBoxes(next);
    setSelectedPointIndex(null);
    setHistory([]);
  }, []);

  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (!previous) return;
    setPoints(previous.points);
    setBoxes(previous.boxes);
    setHistory((items) => items.slice(0, -1));
    setSelectedPointIndex(null);
  }, [history]);

  const clearCurrent = useCallback(() => {
    setPoints([]);
    setSelectedPointIndex(null);
  }, []);

  return {
    points,
    boxes,
    selectedPointIndex,
    setSelectedPointIndex,
    tool,
    setTool,
    addPoint,
    updatePoint,
    updateBoxPoint,
    updateBoxLabel,
    loadAnnotations,
    currentLabel,
    setCurrentLabel,
    undo,
    clearCurrent,
    canUndo: history.length > 0,
    addPointAtSelected: () => undefined,
    addPointToBox: () => undefined,
    deleteSelectedPoint: () => undefined,
    deleteBoxPoint: () => undefined,
    completeBox: () => undefined,
  };
}
