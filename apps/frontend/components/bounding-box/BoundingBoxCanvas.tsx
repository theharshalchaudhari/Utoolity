"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  AnnotationTool,
  Point,
  BoundingBoxAnnotation,
} from "./useBoundingBoxAnnotation";

type BoundingBoxCanvasProps = {
  imageSrc: string | null;
  points: Point[];
  polygons: BoundingBoxAnnotation[];
  tool: AnnotationTool;
  selectedPointIndex: number | null;
  onCanvasClick: (point: Point) => void;
  onSelectPoint: (index: number | null) => void;
  onMovePoint: (index: number, point: Point) => void;
  onMovePolygonPoint: (polygonId: string, index: number, point: Point) => void;
  onSelectPolygon: (polygonId: string | null) => void;
  onAddPointToPolygon: (polygonId: string, edgeIndex: number, point: Point) => void;
  onDeletePolygonPoint: (polygonId: string, index: number) => void;
  selectedPolygonId: string | null;
  removeMode?: boolean;
  onCompletePolygon: () => void;
  onZoomChange?: (zoom: number) => void;
  onImageSizeChange?: (size: { width: number; height: number }) => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const BUTTON_ZOOM_STEP = 0.25;
const WHEEL_ZOOM_SPEED = 0.0025;
const CLOSE_DISTANCE = 16;
const POINT_RADIUS = 5;
const SELECTED_POINT_RADIUS = 7;

const POLYGON_COLOR = "#22c55e";
const POLYGON_FILL = "rgba(34, 197, 94, 0.3)";

export function BoundingBoxCanvas({
  imageSrc,
  points,
  polygons,
  tool,
  selectedPointIndex,
  onCanvasClick,
  onSelectPoint,
  onMovePoint,
  onMovePolygonPoint,
  onSelectPolygon,
  onAddPointToPolygon,
  onDeletePolygonPoint,
  selectedPolygonId,
  removeMode = false,
  onCompletePolygon,
  onZoomChange,
  onImageSizeChange,
}: BoundingBoxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ polygonId: string | null; index: number } | null>(null);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  const zoomRef = useRef(1);
  const fitScaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });

  const editingPointRef = useRef<number | null>(null);
  const editingPolygonRef = useRef<string | null>(null);

  const setZoomValue = useCallback(
    (value: number) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

      zoomRef.current = next;
      setZoom(next);
      onZoomChange?.(next);
    },
    [onZoomChange],
  );

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return {
        width: 0,
        height: 0,
      };
    }

    return {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };
  }, []);

  const getImageTransform = useCallback(() => {
    const image = imageRef.current;
    const { width, height } = getCanvasSize();

    if (!image || !width || !height) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
    }

    const scale = fitScaleRef.current * zoomRef.current;
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;

    return {
      x: (width - imageWidth) / 2 + offsetRef.current.x,
      y: (height - imageHeight) / 2 + offsetRef.current.y,
      width: imageWidth,
      height: imageHeight,
    };
  }, [getCanvasSize]);

  const resetZoom = useCallback(() => {
    const image = imageRef.current;
    const { width, height } = getCanvasSize();
    const fit = image && width && height
      ? Math.min(1, width / image.naturalWidth, height / image.naturalHeight)
      : 1;
    offsetRef.current = {
      x: 0,
      y: 0,
    };

    setZoomValue(fit);
  }, [getCanvasSize, setZoomValue]);

  const zoomIn = useCallback(() => {
    setZoomValue(zoomRef.current + BUTTON_ZOOM_STEP);
  }, [setZoomValue]);

  const zoomOut = useCallback(() => {
    setZoomValue(zoomRef.current - BUTTON_ZOOM_STEP);
  }, [setZoomValue]);

  const screenToImage = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const transform = getImageTransform();

      return {
        x:
          (clientX - rect.left - transform.x) /
          (fitScaleRef.current * zoomRef.current),
        y:
          (clientY - rect.top - transform.y) /
          (fitScaleRef.current * zoomRef.current),
      };
    },
    [getImageTransform],
  );

  const imageToScreen = useCallback(
    (point: Point) => {
      const transform = getImageTransform();

      return {
        x:
          transform.x +
          point.x * fitScaleRef.current * zoomRef.current,
        y:
          transform.y +
          point.y * fitScaleRef.current * zoomRef.current,
      };
    },
    [getImageTransform],
  );

  const isPointNear = useCallback(
    (a: Point, b: Point, distance: number) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;

      return Math.sqrt(dx * dx + dy * dy) <= distance;
    },
    [],
  );

  const findPointAtScreenPosition = useCallback(
    (screenX: number, screenY: number) => {
      for (let i = points.length - 1; i >= 0; i--) {
        const point = imageToScreen(points[i]);

        const distance = Math.sqrt(
          (point.x - screenX) ** 2 +
            (point.y - screenY) ** 2,
        );

        if (
          distance <=
          Math.max(12, POINT_RADIUS * 2)
        ) {
          return i;
        }
      }

      return null;
    },
    [imageToScreen, points],
  );

  const findPolygonPointAtScreenPosition = useCallback(
    (screenX: number, screenY: number) => {
      for (let polygonIndex = polygons.length - 1; polygonIndex >= 0; polygonIndex -= 1) {
        const polygon = polygons[polygonIndex];
        for (let pointIndex = polygon.points.length - 1; pointIndex >= 0; pointIndex -= 1) {
          const point = imageToScreen(polygon.points[pointIndex]);
          if (Math.hypot(point.x - screenX, point.y - screenY) <= Math.max(12, POINT_RADIUS * 2)) {
            return { polygonId: polygon.id, index: pointIndex };
          }
        }
      }
      return null;
    },
    [imageToScreen, polygons],
  );

  const findNearestPolygonEdge = useCallback((point: Point) => {
    let nearest: { polygonId: string; edgeIndex: number; distance: number } | undefined;
    for (const polygon of polygons) {
      for (const [index, start] of polygon.points.entries()) {
        const end = polygon.points[(index + 1) % polygon.points.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
        const distance = Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
        if (!nearest || distance < nearest.distance) nearest = { polygonId: polygon.id, edgeIndex: index, distance };
      }
    }
    return nearest ?? null;
  }, [polygons]);

  const findPolygonAtImagePoint = useCallback((point: Point) => {
    for (const polygon of polygons) {
      let inside = false;
      for (let index = 0, previous = polygon.points.length - 1; index < polygon.points.length; previous = index++) {
        const current = polygon.points[index];
        const prior = polygon.points[previous];
        const intersects = ((current.y > point.y) !== (prior.y > point.y)) &&
          point.x < ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
        if (intersects) inside = !inside;
      }
      if (inside) return polygon.id;
    }
    return null;
  }, [polygons]);

  const drawPoint = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      point: Point,
      selected: boolean,
      closingPoint = false,
    ) => {
      const screenPoint = imageToScreen(point);

      ctx.beginPath();
      ctx.arc(
        screenPoint.x,
        screenPoint.y,
        selected
          ? SELECTED_POINT_RADIUS
          : POINT_RADIUS,
        0,
        Math.PI * 2,
      );

      ctx.fillStyle = selected
        ? POLYGON_COLOR
        : closingPoint
          ? "#ef4444"
          : POLYGON_COLOR;

      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    },
    [imageToScreen],
  );

  const drawPolygon = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      polygonPoints: Point[],
      closed: boolean,
      active = false,
    ) => {
      if (!polygonPoints.length) {
        return;
      }

      ctx.beginPath();

      polygonPoints.forEach((point, index) => {
        const screenPoint = imageToScreen(point);

        if (index === 0) {
          ctx.moveTo(
            screenPoint.x,
            screenPoint.y,
          );
        } else {
          ctx.lineTo(
            screenPoint.x,
            screenPoint.y,
          );
        }
      });

      if (closed) {
        ctx.closePath();
      }

      if (closed) {
        ctx.fillStyle = POLYGON_FILL;
        ctx.fill();
      }

      ctx.lineWidth = active ? 2.5 : 2;
      ctx.strokeStyle = POLYGON_COLOR;
      ctx.stroke();
    },
    [imageToScreen],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "hsl(var(--background))";
    ctx.fillRect(0, 0, width, height);

    if (crosshair) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(crosshair.x, 0);
      ctx.lineTo(crosshair.x, height);
      ctx.moveTo(0, crosshair.y);
      ctx.lineTo(width, crosshair.y);
      ctx.stroke();
      ctx.restore();
    }

    if (!image || !imageLoaded) {
      return;
    }

    const transform = getImageTransform();

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      transform.x,
      transform.y,
      transform.width,
      transform.height,
    );

    polygons.forEach((polygon) => {
      drawPolygon(
        ctx,
        polygon.points,
        true,
        polygon.id === selectedPolygonId,
      );

      polygon.points.forEach((point) => {
        drawPoint(
          ctx,
          point,
          hoveredPoint?.polygonId === polygon.id && hoveredPoint.index === polygon.points.indexOf(point),
        );
      });
    });

    if (points.length) {
      drawPolygon(
        ctx,
        points,
        false,
        true,
      );

      points.forEach((point, index) => {
        drawPoint(
          ctx,
          point,
          selectedPointIndex === index,
          index === 0 && points.length >= 3,
        );
      });
    }

    if (crosshair) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(crosshair.x, 0);
      ctx.lineTo(crosshair.x, height);
      ctx.moveTo(0, crosshair.y);
      ctx.lineTo(width, crosshair.y);
      ctx.stroke();
      ctx.restore();
    }

  }, [
    drawPoint,
    drawPolygon,
    getImageTransform,
    imageLoaded,
    imageToScreen,
    points,
    polygons,
    selectedPointIndex,
    selectedPolygonId,
    tool,
    hoveredPoint,
    crosshair,
  ]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return;
    }

    const rect =
      container.getBoundingClientRect();

    const dpr =
      window.devicePixelRatio || 1;

    canvas.width = Math.max(
      1,
      Math.round(rect.width * dpr),
    );

    canvas.height = Math.max(
      1,
      Math.round(rect.height * dpr),
    );

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0,
      );
    }

    const image = imageRef.current;
    if (image && zoomRef.current === MIN_ZOOM) {
      fitScaleRef.current = Math.min(
        1,
        rect.width / image.naturalWidth,
        rect.height / image.naturalHeight,
      );
    }

    draw();
  }, [draw]);

  useEffect(() => {
    if (!imageSrc) {
      imageRef.current = null;
      setImageLoaded(false);

      offsetRef.current = {
        x: 0,
        y: 0,
      };

      setZoomValue(1);

      return;
    }

    const image = new Image();

    image.onload = () => {
      imageRef.current = image;
      setImageLoaded(true);

      offsetRef.current = {
        x: 0,
        y: 0,
      };

      const { width, height } = getCanvasSize();
      fitScaleRef.current = width && height
        ? Math.min(1, width / image.naturalWidth, height / image.naturalHeight)
        : 1;
      setZoomValue(1);
      onImageSizeChange?.({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      imageRef.current = null;
      setImageLoaded(false);
    };

    image.src = imageSrc;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [getCanvasSize, imageSrc, onImageSizeChange, setZoomValue]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer =
      new ResizeObserver(resizeCanvas);

    observer.observe(container);
    resizeCanvas();

    return () => observer.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    draw();
  }, [draw, zoom]);

  useEffect(() => {
    const handleZoomIn = () => zoomIn();
    const handleZoomOut = () => zoomOut();
    const handleFit = () => resetZoom();

    window.addEventListener(
      "polygon-zoom-in",
      handleZoomIn,
    );

    window.addEventListener(
      "polygon-zoom-out",
      handleZoomOut,
    );

    window.addEventListener(
      "polygon-fit",
      handleFit,
    );

    return () => {
      window.removeEventListener(
        "polygon-zoom-in",
        handleZoomIn,
      );

      window.removeEventListener(
        "polygon-zoom-out",
        handleZoomOut,
      );

      window.removeEventListener(
        "polygon-fit",
        handleFit,
      );
    };
  }, [resetZoom, zoomIn, zoomOut]);

  const handlePointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const rect =
        canvas.getBoundingClientRect();

      const screenX =
        event.clientX - rect.left;

      const screenY =
        event.clientY - rect.top;

      const shouldPan =
        event.button === 1 ||
        event.button === 2 ||
        (event.button === 0 &&
          event.shiftKey);

      if (shouldPan) {
        event.preventDefault();

        isPanningRef.current = true;

        panStartRef.current = {
          x: event.clientX,
          y: event.clientY,
        };

        panOffsetStartRef.current = {
          ...offsetRef.current,
        };

        canvas.setPointerCapture(
          event.pointerId,
        );

        return;
      }

      if (event.button !== 0) {
        return;
      }

      const imagePoint = screenToImage(
        event.clientX,
        event.clientY,
      );

      if (!imagePoint) {
        return;
      }

      const pointIndex =
        findPointAtScreenPosition(
          screenX,
          screenY,
        );

      if (tool === "edit") {
        const polygonPoint = findPolygonPointAtScreenPosition(screenX, screenY);
        if (removeMode && polygonPoint) {
          onDeletePolygonPoint(polygonPoint.polygonId, polygonPoint.index);
          onSelectPolygon(polygonPoint.polygonId);
          return;
        }
        if (event.altKey) {
          const edge = findNearestPolygonEdge(imagePoint);
          if (edge) {
            onAddPointToPolygon(edge.polygonId, edge.edgeIndex, imagePoint);
            onSelectPolygon(edge.polygonId);
          }
          return;
        }
        if (polygonPoint) {
          onSelectPolygon(polygonPoint.polygonId);
          onSelectPoint(polygonPoint.index);
          editingPointRef.current = polygonPoint.index;
          editingPolygonRef.current = polygonPoint.polygonId;
          canvas.setPointerCapture(event.pointerId);
        } else if (pointIndex !== null) {
          onSelectPoint(pointIndex);
          editingPointRef.current =
            pointIndex;
          editingPolygonRef.current = null;
          canvas.setPointerCapture(
            event.pointerId,
          );
        } else {
          onSelectPoint(null);
          onSelectPolygon(findPolygonAtImagePoint(imagePoint));
        }

        return;
      }

      if (tool === "delete") {
        if (pointIndex !== null) {
          onSelectPoint(pointIndex);
        } else {
          onSelectPoint(null);
        }

        return;
      }

      if (tool !== "annotate") {
        return;
      }

      if (
        points.length >= 3 &&
        isPointNear(
          imagePoint,
          points[0],
          CLOSE_DISTANCE /
            (fitScaleRef.current * zoomRef.current),
        )
      ) {
        onCompletePolygon();
        return;
      }

      onCanvasClick(imagePoint);
    },
    [
      findPointAtScreenPosition,
      isPointNear,
      onCanvasClick,
      onCompletePolygon,
      onSelectPoint,
      onSelectPolygon,
      onAddPointToPolygon,
      onDeletePolygonPoint,
      findNearestPolygonEdge,
      findPolygonPointAtScreenPosition,
      findPolygonAtImagePoint,
      points,
      screenToImage,
      tool,
      removeMode,
    ],
  );

  const handlePointerMove = useCallback(
    (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      if (isPanningRef.current) {
        const dx =
          event.clientX -
          panStartRef.current.x;

        const dy =
          event.clientY -
          panStartRef.current.y;

        offsetRef.current = {
          x:
            panOffsetStartRef.current.x +
            dx,
          y:
            panOffsetStartRef.current.y +
            dy,
        };

        draw();
        return;
      }

      const canvas = canvasRef.current;
      if (canvas && tool === "edit") {
        const rect = canvas.getBoundingClientRect();
        setHoveredPoint(findPolygonPointAtScreenPosition(
          event.clientX - rect.left,
          event.clientY - rect.top,
        ));
      } else {
        setHoveredPoint(null);
      }
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setCrosshair({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      }

      const editingIndex =
        editingPointRef.current;

      if (
        editingIndex === null ||
        tool !== "edit"
      ) {
        return;
      }

      const imagePoint = screenToImage(
        event.clientX,
        event.clientY,
      );

      if (!imagePoint) {
        return;
      }

      const image = imageRef.current;

      if (image) {
        imagePoint.x = Math.max(
          0,
          Math.min(
            image.naturalWidth,
            imagePoint.x,
          ),
        );

        imagePoint.y = Math.max(
          0,
          Math.min(
            image.naturalHeight,
            imagePoint.y,
          ),
        );
      }

      if (editingPolygonRef.current) {
        onMovePolygonPoint(editingPolygonRef.current, editingIndex, imagePoint);
      } else {
        onMovePoint(editingIndex, imagePoint);
      }
    },
    [draw, findPolygonPointAtScreenPosition, onMovePoint, onMovePolygonPoint, screenToImage, tool],
  );

  const handlePointerUp = useCallback(
    (
      event: React.PointerEvent<HTMLCanvasElement>,
    ) => {
      const canvas = canvasRef.current;

      if (isPanningRef.current) {
        isPanningRef.current = false;

        if (
          canvas?.hasPointerCapture(
            event.pointerId,
          )
        ) {
          canvas.releasePointerCapture(
            event.pointerId,
          );
        }
      }

      if (
        editingPointRef.current !== null
      ) {
        editingPointRef.current = null;
        editingPolygonRef.current = null;

        if (
          canvas?.hasPointerCapture(
            event.pointerId,
          )
        ) {
          canvas.releasePointerCapture(
            event.pointerId,
          );
        }
      }
    },
    [],
  );

  const handleDoubleClick = useCallback(() => {
    if (tool !== "annotate") {
      return;
    }

    if (points.length < 3) {
      return;
    }

    onCompletePolygon();
  }, [
    onCompletePolygon,
    points.length,
    tool,
  ]);

  const handleWheel = useCallback(
    (
      event: React.WheelEvent<HTMLCanvasElement>,
    ) => {
      if (!event.ctrlKey) {
        return;
      }

      event.preventDefault();

      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return;
      }

      const oldZoom = zoomRef.current;

      const delta = Math.max(
        -100,
        Math.min(100, event.deltaY),
      );

      const zoomFactor = Math.exp(
        -delta * WHEEL_ZOOM_SPEED,
      );

      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          oldZoom * zoomFactor,
        ),
      );

      if (
        Math.abs(nextZoom - oldZoom) <
        0.001
      ) {
        return;
      }

      const rect =
        canvas.getBoundingClientRect();

      const mouseX =
        event.clientX - rect.left;

      const mouseY =
        event.clientY - rect.top;

      const oldTransform =
        getImageTransform();

      const oldScale = fitScaleRef.current * oldZoom;
      const imageX =
        (mouseX - oldTransform.x) /
        oldScale;

      const imageY =
        (mouseY - oldTransform.y) /
        oldScale;

      const newScale = fitScaleRef.current * nextZoom;
      const newImageWidth =
        image.naturalWidth * newScale;

      const newImageHeight =
        image.naturalHeight * newScale;

      const centeredX =
        (canvas.clientWidth -
          newImageWidth) /
        2;

      const centeredY =
        (canvas.clientHeight -
          newImageHeight) /
        2;

      offsetRef.current = {
        x:
          mouseX -
          centeredX -
          imageX * newScale,

        y:
          mouseY -
          centeredY -
          imageY * newScale,
      };

      setZoomValue(nextZoom);
    },
    [getImageTransform, setZoomValue],
  );

  const handleContextMenu = useCallback(
    (
      event: React.MouseEvent<HTMLCanvasElement>,
    ) => {
      event.preventDefault();
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-background"
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full touch-none select-none ${
          tool === "edit"
            ? "cursor-crosshair"
            : tool === "delete"
              ? "cursor-pointer"
              : "cursor-crosshair"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={(event) => {
          setCrosshair(null);
          handlePointerUp(event);
        }}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />

      {!imageSrc && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-dashed border-border bg-card/70 px-8 py-6 text-center shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-foreground">
              No image loaded
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Import an image folder to begin
              annotating.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}