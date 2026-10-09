"use client";

import { useCallback, useState } from "react";

export type Point = { x: number; y: number };

export type PolygonAnnotation = {
  id: string;
  label: string;
  points: Point[];
};

export type AnnotationTool = "annotate" | "edit" | "add" | "delete";

export function usePolygonAnnotation() {
  const [points, setPoints] = useState<Point[]>([]);
  const [polygons, setPolygons] = useState<PolygonAnnotation[]>([]);
  const [currentLabel, setCurrentLabel] = useState("");
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [tool, setTool] = useState<AnnotationTool>("annotate");
  const [history, setHistory] = useState<Point[][]>([]);

  const saveHistory = useCallback(() => {
    setHistory((prev) => [...prev, points]);
  }, [points]);

  const addPoint = useCallback(
    (point: Point) => {
      if (tool !== "annotate") return;
      saveHistory();
      setPoints((prev) => [...prev, point]);
    },
    [tool, saveHistory],
  );

  const updatePoint = useCallback(
    (index: number, point: Point) => {
      if (index < 0 || index >= points.length) return;
      setPoints((prev) => prev.map((p, i) => (i === index ? point : p)));
    },
    [points.length],
  );

  const selectPoint = useCallback((index: number | null) => {
    setSelectedPointIndex(index);
  }, []);

  const addPointAtSelected = useCallback(() => {
    if (points.length < 2 || selectedPointIndex === null) return;

    saveHistory();

    const nextIndex = (selectedPointIndex + 1) % points.length;
    const current = points[selectedPointIndex];
    const next = points[nextIndex];

    const newPoint = {
      x: (current.x + next.x) / 2,
      y: (current.y + next.y) / 2,
    };

    setPoints((prev) => {
      const result = [...prev];
      result.splice(selectedPointIndex + 1, 0, newPoint);
      return result;
    });

    setSelectedPointIndex(selectedPointIndex + 1);
  }, [points, selectedPointIndex, saveHistory]);

  const deleteSelectedPoint = useCallback(() => {
    if (selectedPointIndex === null || !points.length) return;

    saveHistory();

    setPoints((prev) => prev.filter((_, index) => index !== selectedPointIndex));
    setSelectedPointIndex(null);
  }, [points.length, selectedPointIndex, saveHistory]);

  const completePolygon = useCallback(() => {
    if (points.length < 3) return;

    const polygon: PolygonAnnotation = {
      id: crypto.randomUUID(),
      label: currentLabel.trim() || `Object ${polygons.length + 1}`,
      points: [...points],
    };

    setPolygons((prev) => [...prev, polygon]);
    setPoints([]);
    setSelectedPointIndex(null);
  }, [points, currentLabel, polygons.length]);

  const undo = useCallback(() => {
    const previous = history[history.length - 1];

    if (!previous) return;

    setPoints(previous);
    setHistory((prev) => prev.slice(0, -1));
    setSelectedPointIndex(null);
  }, [history]);

  const clearCurrent = useCallback(() => {
    if (!points.length) return;

    setPoints([]);
    setSelectedPointIndex(null);
    setHistory([]);
  }, [points.length]);

  const resetAll = useCallback(() => {
    setPoints([]);
    setPolygons([]);
    setSelectedPointIndex(null);
    setHistory([]);
  }, []);

  return {
    points,
    polygons,
    currentLabel,
    setCurrentLabel,
    selectedPointIndex,
    setSelectedPointIndex: selectPoint,
    tool,
    setTool,
    addPoint,
    updatePoint,
    addPointAtSelected,
    deleteSelectedPoint,
    completePolygon,
    undo,
    clearCurrent,
    resetAll,
  };
}