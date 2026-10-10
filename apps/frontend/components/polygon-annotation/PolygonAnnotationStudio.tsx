"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { PolygonCanvas } from "./PolygonCanvas";
import { usePolygonAnnotation } from "../../hooks/usePolygonAnnotation";
import { api, API_URL } from "../../lib/api";
import PolygonImportButton from "./PolygonImportButton";
import PolygonStudioHeader from "./PolygonStudioHeader";
import PolygonObjectList from "./PolygonObjectList";

type ImageItem = {
  name: string;
  url: string;
};

type LabelMeShape = {
  label: string;
  points: [number, number][];
  shape_type: "polygon" | "rectangle";
};

const tools: Array<{ id: "annotate" | "edit"; label: string; shortcut: string; icon: string }> = [
  { id: "annotate", label: "Annotate", shortcut: "W", icon: "✦" },
  { id: "edit", label: "Edit Point", shortcut: "E", icon: "✎" },
] as const;

export default function PolygonAnnotationPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [removeMode, setRemoveMode] = useState(false);
  const [classPopupOpen, setClassPopupOpen] = useState(false);


  const {
    points,
    polygons,
    selectedPointIndex,
    setSelectedPointIndex,
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
    loadAnnotations,
    currentLabel,
    setCurrentLabel,
    canUndo,
  } = usePolygonAnnotation();
  const [annotationsLoaded, setAnnotationsLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const annotationRequestRef = useRef(0);

  const loadImageAnnotations = async (image: ImageItem, folderPath: string) => {
    const requestId = ++annotationRequestRef.current;
    try {
      const response = await api<{ content: string }>(
        `/api/storage/content?path=${encodeURIComponent(`${folderPath}/${image.name.replace(/\.[^/.]+$/, "")}.json`)}`,
      );
      const document = JSON.parse(response.content) as {
        shapes?: LabelMeShape[];
        imageWidth?: number;
        imageHeight?: number;
      };
      if (
        typeof document.imageWidth === "number" &&
        typeof document.imageHeight === "number"
      ) {
        setImageDimensions({ width: document.imageWidth, height: document.imageHeight });
      }
      if (requestId !== annotationRequestRef.current) return;
      loadAnnotations(
        (document.shapes ?? []).map((shape) => {
          const points = shape.shape_type === "rectangle" && shape.points.length === 2
            ? [
                { x: shape.points[0][0], y: shape.points[0][1] },
                { x: shape.points[1][0], y: shape.points[0][1] },
                { x: shape.points[1][0], y: shape.points[1][1] },
                { x: shape.points[0][0], y: shape.points[1][1] },
              ]
            : shape.points.map(([x, y]) => ({ x, y }));
          return { id: crypto.randomUUID(), label: shape.label, points };
        }),
      );
    } catch {
      if (requestId !== annotationRequestRef.current) return;
      loadAnnotations([]);
    } finally {
      if (requestId === annotationRequestRef.current) setAnnotationsLoaded(true);
    }
  };

  const loadFolder = async (folderPath: string) => {
    const result = await api<{
      entries: Array<{ name: string; path: string; type: "file" | "directory" }>;
    }>(`/api/storage/list?path=${encodeURIComponent(folderPath)}`);
    const loadedImages = result.entries
      .filter((entry) => entry.type === "file" && /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => ({
        name: entry.name,
        url: `${API_URL}/api/storage/download?path=${encodeURIComponent(entry.path)}`,
      }));
    setImages(loadedImages);
    setSelectedImageIndex(loadedImages.length ? 0 : null);
    setSelectedPointIndex(null);
    setSelectedPolygonId(null);
    setImageDimensions({ width: 0, height: 0 });
    setZoom(1);
    setAnnotationsLoaded(false);
    localStorage.setItem("utoolity.polygon.folder", folderPath);
  };

  useEffect(() => {
    const savedFolder = localStorage.getItem("utoolity.polygon.folder");
    if (savedFolder) void loadFolder(savedFolder).catch(() => undefined);
    const handleFolderSelected = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string; requester?: string }>).detail;
      if (detail?.requester !== "polygon-annotation") return;
      const path = detail.path;
      if (path) void loadFolder(path).catch(() => undefined);
    };
    window.addEventListener("utoolity:polygon-folder-selected", handleFolderSelected);
    return () => window.removeEventListener("utoolity:polygon-folder-selected", handleFolderSelected);
  }, []);

  const currentImage =
    selectedImageIndex !== null
      ? images[selectedImageIndex] ?? null
      : null;

  const saveAnnotations = useCallback(async () => {
    const folder = localStorage.getItem("utoolity.polygon.folder");
    if (!folder || !currentImage || imageDimensions.width <= 0 || imageDimensions.height <= 0) return;
    const labelMeDocument = {
      version: "7.0.3",
      flags: {},
      shapes: polygons.map((polygon) => ({
        label: polygon.label,
        points: polygon.points.map((point) => [point.x, point.y]),
        group_id: null,
        description: "",
        shape_type: "polygon",
        flags: {},
        mask: null,
      })),
      imagePath: currentImage.name,
      imageData: null,
      imageHeight: imageDimensions.height,
      imageWidth: imageDimensions.width,
    };
    await api("/api/storage/content", {
      method: "PUT",
      body: JSON.stringify({
        path: `${folder}/${currentImage.name.replace(/\.[^/.]+$/, "")}.json`,
        content: JSON.stringify(labelMeDocument, null, 2),
      }),
    });
  }, [currentImage, imageDimensions, polygons]);

  const navigateToImage = useCallback((nextIndex: number) => {
    void saveAnnotations()
      .catch(() => undefined)
      .finally(() => setSelectedImageIndex(nextIndex));
  }, [saveAnnotations]);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      const editingText =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable;

      if (editingText && event.key !== "Escape") return;

      if (event.key === "Alt") {
        setTool("edit");
        return;
      }

      if (event.key.toLowerCase() === "r") {
        setTool("edit");
        setRemoveMode(true);
        return;
      }

      if (event.key.toLowerCase() === "c" && selectedPolygonId) {
        event.preventDefault();
        setClassPopupOpen(true);
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        undo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        const polygon = polygons.find(({ id }) => id === selectedPolygonId) ?? polygons.at(-1);
        if (polygon) {
          event.preventDefault();
          localStorage.setItem("utoolity.polygon.clipboard", JSON.stringify(polygon));
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        const saved = localStorage.getItem("utoolity.polygon.clipboard");
        if (saved) {
          try {
            const polygon = JSON.parse(saved) as { label?: string; points?: { x: number; y: number }[] };
            if (Array.isArray(polygon.points) && polygon.points.length >= 3) {
              event.preventDefault();
              loadAnnotations([
                ...polygons,
                {
                  id: crypto.randomUUID(),
                  label: polygon.label ?? `Object ${polygons.length + 1}`,
                  points: polygon.points.map((point) => ({ ...point })),
                },
              ]);
            }
          } catch {
            localStorage.removeItem("utoolity.polygon.clipboard");
          }
        }
        return;
      }

      if (event.key === "Escape") {
        clearCurrent();
        setSelectedPointIndex(null);
        return;
      }

      if (event.key === "Enter") {
        if (points.length >= 3) {
          event.preventDefault();
          completePolygon();
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (removeMode) return;
        event.preventDefault();
        deleteSelectedPoint();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        window.dispatchEvent(new CustomEvent("polygon-zoom-in"));
        return;
      }

      if (event.key === "-" || event.key === "_") {
        window.dispatchEvent(new CustomEvent("polygon-zoom-out"));
        return;
      }

      if (event.key === "0") {
        window.dispatchEvent(new CustomEvent("polygon-fit"));
        return;
      }

      switch (event.key.toLowerCase()) {
        case "e":
          setTool("edit");
          break;
        case "w":
          setTool("annotate");
          break;
        case "a":
        case "arrowleft":
          if (images.length) navigateToImage(selectedImageIndex === null ? 0 : (selectedImageIndex - 1 + images.length) % images.length);
          break;
        case "arrowright":
        case "d":
          if (images.length) navigateToImage(selectedImageIndex === null ? 0 : (selectedImageIndex + 1) % images.length);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [
    points.length,
    undo,
    clearCurrent,
    completePolygon,
    deleteSelectedPoint,
    setSelectedPointIndex,
    setTool,
    polygons,
    selectedPolygonId,
    loadAnnotations,
    images.length,
    selectedPolygonId,
    images.length,
    navigateToImage,
    selectedImageIndex,
  ]);

  useEffect(() => {
    const releaseModes = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "r") setRemoveMode(false);
    };
    window.addEventListener("keyup", releaseModes);
    return () => window.removeEventListener("keyup", releaseModes);
  }, []);

  useEffect(() => {
    if (selectedImageIndex === null || !currentImage) return;
    const folder = localStorage.getItem("utoolity.polygon.folder");
    if (folder) void loadImageAnnotations(currentImage, folder);
  }, [currentImage, selectedImageIndex]);

  useEffect(() => {
    setSelectedPointIndex(null);
    setSelectedPolygonId(null);
    setClassPopupOpen(false);
    setAnnotationsLoaded(false);
    setImageDimensions({ width: 0, height: 0 });
    setZoom(1);
  }, [selectedImageIndex, setSelectedPointIndex]);

  useEffect(() => {
    if (
      !annotationsLoaded ||
      !currentImage ||
      selectedImageIndex === null ||
      imageDimensions.width <= 0 ||
      imageDimensions.height <= 0
    ) return;
    void saveAnnotations().catch(() => undefined);
  }, [annotationsLoaded, saveAnnotations, selectedImageIndex]);

  const downloadJSON = () => {
    if (!polygons.length) return;

    const filename = currentImage?.name
      ? `${currentImage.name.replace(/\.[^/.]+$/, "")}.json`
      : "annotations.json";

    const labelMeDocument = {
      version: "7.0.3",
      flags: {},
      shapes: polygons.map((polygon) => ({
        label: polygon.label,
        points: polygon.points.map((point) => [point.x, point.y]),
        group_id: null,
        description: "",
        shape_type: "polygon",
        flags: {},
        mask: null,
      })),
      imagePath: currentImage?.name ?? "",
      imageData: null,
      imageHeight: imageDimensions.height,
      imageWidth: imageDimensions.width,
    };
    const blob = new Blob(
      [JSON.stringify(labelMeDocument, null, 2)],
      { type: "application/json" },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <PolygonStudioHeader
        imageName={currentImage?.name}
        polygonCount={polygons.length}
        onExport={downloadJSON}
        canNavigate={images.length > 1}
        onPrevious={() => {
          if (images.length) navigateToImage(selectedImageIndex === null ? 0 : (selectedImageIndex - 1 + images.length) % images.length);
        }}
        onNext={() => {
          if (images.length) navigateToImage(selectedImageIndex === null ? 0 : (selectedImageIndex + 1) % images.length);
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
          <div className="absolute inset-0">
            <PolygonCanvas
              imageSrc={currentImage?.url ?? null}
              points={points}
              polygons={polygons}
              tool={tool}
              selectedPointIndex={selectedPointIndex}
              onCanvasClick={addPoint}
              onSelectPoint={setSelectedPointIndex}
              onMovePoint={updatePoint}
              onMovePolygonPoint={updatePolygonPoint}
              onSelectPolygon={setSelectedPolygonId}
              onAddPointToPolygon={addPointToPolygon}
              onDeletePolygonPoint={deletePolygonPoint}
              selectedPolygonId={selectedPolygonId}
              removeMode={removeMode}
              onCompletePolygon={completePolygon}
              onZoomChange={setZoom}
              onImageSizeChange={setImageDimensions}
            />
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
            <div className="pointer-events-auto flex max-w-full flex-wrap items-end justify-center gap-1.5 overflow-visible rounded-4xl border border-border bg-card/90 p-2 shadow-xl backdrop-blur-xl sm:gap-2">
              <div className="group relative">
                <PolygonImportButton />
              </div>

              {classPopupOpen && selectedPolygonId ? (
                <input
                  autoFocus
                  value={polygons.find(({ id }) => id === selectedPolygonId)?.label ?? ""}
                  onChange={(event) => updatePolygonLabel(selectedPolygonId, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === "Escape") setClassPopupOpen(false);
                  }}
                  aria-label="Change polygon class"
                  className="h-11 w-36 rounded-full border border-primary bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              ) : null}

              <input
                value={currentLabel}
                onChange={(event) => setCurrentLabel(event.target.value)}
                placeholder="Label"
                aria-label="Annotation label"
                className="h-11 w-28 rounded-full border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="mx-1 h-8 w-px self-center bg-border" />

              {tools.map((item) => {
                const active = tool === item.id;

                return (
                  <div key={item.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setTool(item.id)}
                      title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
                      className={`flex size-11 items-center justify-center rounded-full border text-base shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 active:scale-95 ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {item.icon}
                    </button>

                    <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                      {item.shortcut ? `${item.label} · ${item.shortcut}` : item.label}
                    </span>
                  </div>
                );
              })}

              <div className="group relative">
                <button
                  type="button"
                  onClick={addPointAtSelected}
                  disabled={selectedPointIndex === null}
                  title="Add Point (I)"
                  className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-lg text-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                >
                  +
                </button>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Add Point · I
                </span>
              </div>

              <div className="group relative">
                <button
                  type="button"
                  onClick={deleteSelectedPoint}
                  disabled={selectedPointIndex === null}
                  title="Delete Point (D)"
                  className="flex size-11 items-center justify-center rounded-full border border-destructive/30 bg-background text-lg text-destructive shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-destructive/10 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                >
                  −
                </button>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Delete Point · D
                </span>
              </div>

              <div className="mx-1 h-8 w-px self-center bg-border" />

              <div className="group relative">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  title="Undo Polygon (Ctrl/Cmd Z)"
                  className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-lg text-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                >
                  ↶
                </button>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Undo Polygon · Ctrl/Cmd Z
                </span>
              </div>

              <div className="group relative">
                <button
                  type="button"
                  onClick={clearCurrent}
                  disabled={!points.length}
                  title="Clear (Esc)"
                  className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-lg text-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                >
                  ×
                </button>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Clear · Esc
                </span>
              </div>

              <div className="mx-1 h-8 w-px self-center bg-border" />

              <div className="group relative">
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("polygon-zoom-out"),
                    )
                  }
                  disabled={zoom <= 1}
                  title="Zoom Out (- / Ctrl+Wheel)"
                  className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-lg text-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                >
                  −
                </button>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Zoom Out · −
                </span>
              </div>

              <div
                title="Current Zoom (applied to image)"
                className="flex size-11 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium text-muted-foreground"
              >
                {Math.round(zoom * 100)}%
              </div>

              <div className="group relative">
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("polygon-zoom-in"),
                    )
                  }
                  disabled={zoom >= 5}
                  title="Zoom In (+ / Ctrl+Wheel)"
                  className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-lg text-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                >
                  +
                </button>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Zoom In · +
                </span>
              </div>

              <div className="group relative">
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("polygon-fit"),
                    )
                  }
                  disabled={zoom === 1}
                  title="Reset Zoom (0)"
                  className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-[10px] font-medium text-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                >
                  100
                </button>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Reset Zoom · 0
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-6 left-5 z-20 hidden rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur md:block">
            {tool === "annotate" && "Annotate"}
            {tool === "edit" && "Edit Point"}
            {selectedPointIndex !== null &&
              ` · Point ${selectedPointIndex + 1}`}
          </div>
        </main>

        <aside className="hidden w-64 shrink-0 flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <div className="max-h-80 shrink-0 border-t border-sidebar-border">
            <div className="flex items-center justify-between px-3 py-3">
              <span className="text-sm font-semibold">Objects</span>

              <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-xs text-sidebar-accent-foreground">
                {polygons.length}
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto px-2 pb-2">
              {!polygons.length ? (
                <div className="rounded-md border border-dashed border-sidebar-border p-3 text-center text-xs text-sidebar-foreground/60">
                  No objects yet.
                </div>
              ) : (
                <PolygonObjectList
                  polygons={polygons}
                  selectedId={selectedPolygonId}
                  onSelect={tool === "edit" ? setSelectedPolygonId : undefined}
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}