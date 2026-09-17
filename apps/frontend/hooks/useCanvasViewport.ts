"use client";

/**
 * Zoom and pan for the annotation canvas.
 *
 * The viewport is a scale plus an offset, in the same limits the desktop app
 * uses (`ZOOM_MIN`..`ZOOM_MAX`, stepping by `ZOOM_STEP`). Everything the
 * canvas hit-tests happens in image space, so these two converters are the
 * only place screen coordinates exist.
 */

import { useCallback, useMemo, useState } from "react";

import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clamp } from "@repo/roi-core";

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface UseCanvasViewport {
  viewport: Viewport;
  /** Screen (canvas-relative CSS px) to image pixels. */
  toImage: (x: number, y: number) => [number, number];
  /** Image pixels to screen (canvas-relative CSS px). */
  toScreen: (x: number, y: number) => [number, number];
  zoomBy: (factor: number, aroundX: number, aroundY: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  panBy: (dx: number, dy: number) => void;
  /** Scale the image to fit the viewport and centre it. */
  fit: (imageWidth: number, imageHeight: number, viewWidth: number, viewHeight: number) => void;
  reset: () => void;
}

const IDENTITY: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };

export function useCanvasViewport(): UseCanvasViewport {
  const [viewport, setViewport] = useState<Viewport>(IDENTITY);

  const toImage = useCallback(
    (x: number, y: number): [number, number] => [
      (x - viewport.offsetX) / viewport.scale,
      (y - viewport.offsetY) / viewport.scale,
    ],
    [viewport],
  );

  const toScreen = useCallback(
    (x: number, y: number): [number, number] => [
      x * viewport.scale + viewport.offsetX,
      y * viewport.scale + viewport.offsetY,
    ],
    [viewport],
  );

  const zoomBy = useCallback((factor: number, aroundX: number, aroundY: number) => {
    setViewport((current) => {
      const scale = clamp(current.scale * factor, ZOOM_MIN, ZOOM_MAX);
      if (scale === current.scale) return current;
      // keep the point under the cursor fixed
      const ratio = scale / current.scale;
      return {
        scale,
        offsetX: aroundX - (aroundX - current.offsetX) * ratio,
        offsetY: aroundY - (aroundY - current.offsetY) * ratio,
      };
    });
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((current) => ({
      ...current,
      offsetX: current.offsetX + dx,
      offsetY: current.offsetY + dy,
    }));
  }, []);

  const fit = useCallback(
    (imageWidth: number, imageHeight: number, viewWidth: number, viewHeight: number) => {
      if (!imageWidth || !imageHeight || !viewWidth || !viewHeight) return;
      const scale = clamp(
        Math.min(viewWidth / imageWidth, viewHeight / imageHeight),
        ZOOM_MIN,
        ZOOM_MAX,
      );
      setViewport({
        scale,
        offsetX: (viewWidth - imageWidth * scale) / 2,
        offsetY: (viewHeight - imageHeight * scale) / 2,
      });
    },
    [],
  );

  return useMemo(
    () => ({
      viewport,
      toImage,
      toScreen,
      zoomBy,
      zoomIn: () => zoomBy(ZOOM_STEP, 0, 0),
      zoomOut: () => zoomBy(1 / ZOOM_STEP, 0, 0),
      panBy,
      fit,
      reset: () => setViewport(IDENTITY),
    }),
    [fit, panBy, toImage, toScreen, viewport, zoomBy],
  );
}
