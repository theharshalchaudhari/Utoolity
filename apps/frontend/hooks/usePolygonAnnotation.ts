import { useState } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface PolygonAnnotation {
  id: string;
  label: string;
  points: Point[];
}

export function usePolygonAnnotation() {
  const [points, setPoints] = useState<Point[]>([]);
  const [polygons, setPolygons] = useState<PolygonAnnotation[]>([]);
  const [currentLabel, setCurrentLabel] = useState<string>('Object 1');

  // Trigger automatic download whenever a polygon is completed
  const autoSaveLocalJSON = (updatedPolygons: PolygonAnnotation[]) => {
    if (typeof window === 'undefined') return;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(updatedPolygons, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `annotations_autosave_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const addPoint = (point: Point) => {
    setPoints((prev) => [...prev, point]);
  };

  const completePolygon = () => {
    if (points.length < 3) return;
    const newPolygon: PolygonAnnotation = {
      id: Date.now().toString(),
      label: currentLabel,
      points,
    };
    const updatedPolygons = [...polygons, newPolygon];
    setPolygons(updatedPolygons);
    setPoints([]);

    // Automatically trigger local download
    autoSaveLocalJSON(updatedPolygons);
  };

  const clearCurrent = () => setPoints([]);
  const resetAll = () => {
    setPoints([]);
    setPolygons([]);
  };

  return {
    points,
    polygons,
    currentLabel,
    setCurrentLabel,
    addPoint,
    completePolygon,
    clearCurrent,
    resetAll,
  };
}