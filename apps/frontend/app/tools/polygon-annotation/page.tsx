"use client";

import React, { useEffect, useRef, useState } from "react";
import { PolygonCanvas } from "../../../components/polygon-annotation/PolygonCanvas";
import { usePolygonAnnotation } from "../../../hooks/usePolygonAnnotation";

type ImageItem = {
  name: string;
  url: string;
};

const tools = [
  { id: "annotate", label: "Annotate", shortcut: "A", icon: "✦" },
  { id: "edit", label: "Edit Point", shortcut: "E", icon: "✎" },
] as const;

export default function PolygonAnnotationPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<ImageItem[]>([]);

  const {
    points,
    polygons,
    selectedPointIndex,
    setSelectedPointIndex,
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
  } = usePolygonAnnotation();

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => {
        URL.revokeObjectURL(image.url);
      });
    };
  }, []);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      const editingText =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable;

      if (editingText && event.key !== "Escape") return;

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        undo();
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
        case "a":
          setTool("annotate");
          break;
        case "e":
          setTool("edit");
          break;
        case "i":
          addPointAtSelected();
          break;
        case "d":
          deleteSelectedPoint();
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
    addPointAtSelected,
    setSelectedPointIndex,
    setTool,
  ]);

  const handleFolderUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;

    if (!files?.length) return;

    const loadedImages = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
      }));

    if (!loadedImages.length) {
      event.target.value = "";
      return;
    }

    imagesRef.current.forEach((image) => {
      URL.revokeObjectURL(image.url);
    });

    imagesRef.current = loadedImages;
    setImages(loadedImages);
    setSelectedImageIndex(0);
    setSelectedPointIndex(null);
    setZoom(1);

    event.target.value = "";
  };

  const currentImage =
    selectedImageIndex !== null
      ? images[selectedImageIndex] ?? null
      : null;

  const downloadJSON = () => {
    if (!polygons.length) return;

    const filename = currentImage?.name
      ? `${currentImage.name.replace(/\.[^/.]+$/, "")}.json`
      : "annotations.json";

    const blob = new Blob(
      [JSON.stringify(polygons, null, 2)],
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
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="z-40 flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/90 px-4 shadow-sm backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 font-semibold tracking-tight">
            Polygon Studio
          </span>

          <span className="text-muted-foreground">/</span>

          <span
            className="max-w-72 truncate text-xs text-muted-foreground"
            title={currentImage?.name ?? "No image loaded"}
          >
            {currentImage?.name ?? "No image loaded"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {polygons.length} polygon{polygons.length !== 1 ? "s" : ""}
          </span>

          <button
            type="button"
            onClick={downloadJSON}
            disabled={!polygons.length}
            className="rounded-full border border-primary bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
          >
            Export
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="relative min-w-0 flex-1 overflow-hidden bg-background">
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
              onCompletePolygon={completePolygon}
              onZoomChange={setZoom}
            />
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-4">
            <div className="pointer-events-auto flex max-w-full items-end gap-2 overflow-visible rounded-4xl border border-border bg-card/90 p-2 shadow-xl backdrop-blur-xl">
              <div className="group relative">
                <label
                  title="Import Folder"
                  className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-95"
                >
                  <span className="text-lg leading-none">+</span>

                  <input
                    ref={folderInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFolderUpload}
                    className="hidden"
                  />
                </label>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Import Folder
                </span>
              </div>

              <div className="mx-1 h-8 w-px self-center bg-border" />

              {tools.map((item) => {
                const active = tool === item.id;

                return (
                  <div key={item.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setTool(item.id)}
                      title={`${item.label} (${item.shortcut})`}
                      className={`flex size-11 items-center justify-center rounded-full border text-base shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 active:scale-95 ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {item.icon}
                    </button>

                    <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                      {item.label} · {item.shortcut}
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
                  disabled={!points.length}
                  title="Undo (Ctrl/Cmd Z)"
                  className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-lg text-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                >
                  ↶
                </button>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Undo · Ctrl/Cmd Z
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

              <div className="group relative">
                <button
                  type="button"
                  onClick={resetAll}
                  title="Reset All"
                  className="flex size-11 items-center justify-center rounded-full border border-destructive/30 bg-background text-lg text-destructive shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-destructive/10 active:scale-95"
                >
                  ⌫
                </button>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Reset All
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
                  title="Zoom Out (-)"
                  className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-lg text-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                >
                  −
                </button>

                <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  Zoom Out · −
                </span>
              </div>

              <div
                title="Current Zoom"
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
                  title="Zoom In (+)"
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
          <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-3">
            <span className="text-sm font-semibold">Images</span>

            <span className="rounded-full bg-sidebar-accent px-2 py-0.5 text-xs text-sidebar-accent-foreground">
              {images.length}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!images.length ? (
              <div className="rounded-md border border-dashed border-sidebar-border p-4 text-center text-xs text-sidebar-foreground/70">
                No images loaded.
              </div>
            ) : (
              <div className="space-y-1">
                {images.map((image, index) => {
                  const active = selectedImageIndex === index;

                  return (
                    <button
                      key={`${image.name}-${index}`}
                      type="button"
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setSelectedPointIndex(null);
                        setZoom(1);
                      }}
                      title={image.name}
                      className={`w-full truncate rounded-md border px-2.5 py-2 text-left text-xs transition ${
                        active
                          ? "border-sidebar-primary bg-sidebar-primary/15 text-sidebar-primary"
                          : "border-transparent hover:border-sidebar-border hover:bg-sidebar-accent"
                      }`}
                    >
                      {image.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
                <div className="space-y-1">
                  {polygons.map((polygon, index) => (
                    <div
                      key={polygon.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/50 p-2 text-xs"
                    >
                      <span className="truncate">
                        {index + 1}. {polygon.label}
                      </span>

                      <span className="shrink-0 text-sidebar-foreground/60">
                        {polygon.points.length}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}