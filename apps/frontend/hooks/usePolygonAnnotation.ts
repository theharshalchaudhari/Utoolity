"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [history, setHistory] = useState<Array<{
    points: Point[];
    polygons: PolygonAnnotation[];
  }>>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedPoints = JSON.parse(localStorage.getItem("utoolity.polygon.points") ?? "[]") as Point[];
      const savedPolygons = JSON.parse(localStorage.getItem("utoolity.polygon.polygons") ?? "[]") as PolygonAnnotation[];
      const savedTool = localStorage.getItem("utoolity.polygon.tool");
      setPoints(savedPoints);
      setPolygons(savedPolygons);
      if (savedTool === "edit" || savedTool === "delete" || savedTool === "add") setTool(savedTool);
    } catch {
      // Ignore malformed local progress and start with a clean annotation.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("utoolity.polygon.points", JSON.stringify(points));
    localStorage.setItem("utoolity.polygon.polygons", JSON.stringify(polygons));
    localStorage.setItem("utoolity.polygon.tool", tool);
  }, [hydrated, points, polygons, tool]);

  const saveHistory = useCallback(() => {
    setHistory((prev) => [...prev, { points, polygons }]);
  }, [points, polygons]);

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

  const updatePolygonPoint = useCallback(
    (polygonId: string, pointIndex: number, point: Point) => {
      const polygon = polygons.find(({ id }) => id === polygonId);
      if (!polygon || pointIndex < 0 || pointIndex >= polygon.points.length) return;
      setHistory((prev) => [...prev, { points, polygons }]);
      setPolygons((prev) => prev.map((item) => item.id !== polygonId
        ? item
        : { ...item, points: item.points.map((value, index) => index === pointIndex ? point : value) }));
    },
    [points, polygons],
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

  const addPointToPolygon = useCallback(
    (polygonId: string, edgeIndex: number, point: Point) => {
      const polygon = polygons.find(({ id }) => id === polygonId);
      if (!polygon || polygon.points.length < 2) return;
      setHistory((prev) => [...prev, { points, polygons }]);
      const insertAt = Math.min(polygon.points.length, edgeIndex + 1);
      setPolygons((prev) => prev.map((item) => item.id !== polygonId
        ? item
        : { ...item, points: [...item.points.slice(0, insertAt), point, ...item.points.slice(insertAt)] }));
      setSelectedPointIndex(insertAt);
    },
    [points, polygons],
  );

  const deleteSelectedPoint = useCallback(() => {
    if (selectedPointIndex === null || !points.length) return;

    saveHistory();

    setPoints((prev) => prev.filter((_, index) => index !== selectedPointIndex));
    setSelectedPointIndex(null);
  }, [points.length, selectedPointIndex, saveHistory]);

  const deletePolygonPoint = useCallback(
    (polygonId: string, pointIndex: number) => {
      const polygon = polygons.find(({ id }) => id === polygonId);
      if (!polygon || polygon.points.length <= 3 || pointIndex < 0 || pointIndex >= polygon.points.length) return;
      setHistory((prev) => [...prev, { points, polygons }]);
      setPolygons((prev) => prev.map((item) => item.id !== polygonId
        ? item
        : { ...item, points: item.points.filter((_, index) => index !== pointIndex) }));
    },
    [points, polygons],
  );

  const updatePolygonLabel = useCallback((polygonId: string, label: string) => {
    setPolygons((prev) => prev.map((item) => item.id === polygonId ? { ...item, label } : item));
  }, []);

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

    setPoints(previous.points);
    setPolygons(previous.polygons);
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

  const loadAnnotations = useCallback((next: PolygonAnnotation[]) => {
    setPoints([]);
    setPolygons(next);
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
    updatePolygonPoint,
    addPointAtSelected,
    addPointToPolygon,
    deleteSelectedPoint,
    deletePolygonPoint,
    updatePolygonLabel,
    completePolygon,
    undo,
    clearCurrent,
    resetAll,
    loadAnnotations,
    canUndo: history.length > 0,
  };
}