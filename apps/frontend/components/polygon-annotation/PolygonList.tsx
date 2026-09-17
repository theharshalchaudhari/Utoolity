"use client";

/**
 * The ROIs on the current image: what they are, and the per-shape actions.
 */

import { Copy, Eye, EyeOff, Lock, LockOpen, Trash2 } from "lucide-react";

import { describeShape, shapeArea, type Shape } from "@repo/roi-core";
import { Button } from "@repo/ui/shadcn/button";

export interface PolygonListProps {
  shapes: Shape[];
  selected: number[];
  imageWidth: number;
  imageHeight: number;
  onSelect: (indexes: number[]) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleLock: (index: number) => void;
  onToggleVisible: (index: number) => void;
  onClearAll: () => void;
}

export default function PolygonList({
  shapes,
  selected,
  imageWidth,
  imageHeight,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleLock,
  onToggleVisible,
  onClearAll,
}: PolygonListProps) {
  const frame = imageWidth * imageHeight;

  return (
    <section className="border-border bg-card flex min-h-0 flex-col rounded-lg border">
      <header className="border-border flex items-center justify-between border-b p-3">
        <h3 className="text-foreground text-sm font-semibold">
          ROIs <span className="text-muted-foreground font-normal">({shapes.length})</span>
        </h3>
        <div className="flex gap-1">
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={selected.length === 0}
            title="Duplicate (Ctrl+D)"
            aria-label="Duplicate selected"
            onClick={onDuplicate}
          >
            <Copy />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            disabled={selected.length === 0}
            title="Delete (Del)"
            aria-label="Delete selected"
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </header>

      {shapes.length === 0 ? (
        <p className="text-muted-foreground p-3 text-xs">
          Nothing drawn yet. Press <kbd>W</kbd> for a polygon, <kbd>B</kbd> for a box.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {shapes.map((shape, i) => {
            const isChosen = selected.includes(i);
            const coverage = frame ? (100 * shapeArea(shape)) / frame : 0;
            return (
              <li key={i}>
                <div
                  className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-xs ${
                    isChosen ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={(event) =>
                      onSelect(
                        event.shiftKey
                          ? isChosen
                            ? selected.filter((s) => s !== i)
                            : [...selected, i]
                          : [i],
                      )
                    }
                  >
                    <span className="block truncate font-medium">
                      {i + 1}. {describeShape(shape)}
                    </span>
                    <span className="text-muted-foreground block truncate">
                      {shape.className} · {coverage.toFixed(1)}% of frame
                    </span>
                  </button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    title={shape.visible ? "Hide" : "Show"}
                    aria-label={shape.visible ? "Hide ROI" : "Show ROI"}
                    onClick={() => onToggleVisible(i)}
                  >
                    {shape.visible ? <Eye /> : <EyeOff />}
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    title={shape.locked ? "Unlock" : "Lock"}
                    aria-label={shape.locked ? "Unlock ROI" : "Lock ROI"}
                    onClick={() => onToggleLock(i)}
                  >
                    {shape.locked ? <Lock /> : <LockOpen />}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {shapes.length > 0 && (
        <footer className="border-border border-t p-2">
          <Button size="xs" variant="ghost" className="w-full" onClick={onClearAll}>
            Clear all
          </Button>
        </footer>
      )}
    </section>
  );
}
