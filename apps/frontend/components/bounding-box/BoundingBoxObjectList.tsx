"use client";

import type { BoundingBoxAnnotation } from "./useBoundingBoxAnnotation";

export default function BoundingBoxObjectList({
  boxes,
  selectedId,
  onSelect,
}: {
  boxes: BoundingBoxAnnotation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {boxes.map((box, index) => (
        <button
          key={box.id}
          type="button"
          onClick={() => onSelect(box.id)}
          className={`flex w-full items-center justify-between rounded-md border p-2 text-left text-xs ${
            selectedId === box.id
              ? "border-sidebar-primary bg-sidebar-primary/15"
              : "border-sidebar-border bg-sidebar-accent/50"
          }`}
        >
          <span className="truncate">{index + 1}. {box.label}</span>
          <span className="text-sidebar-foreground/60">
            {Math.round(Math.max(...box.points.map((point) => point.x)) - Math.min(...box.points.map((point) => point.x)))}×
            {Math.round(Math.max(...box.points.map((point) => point.y)) - Math.min(...box.points.map((point) => point.y)))}
          </span>
        </button>
      ))}
    </div>
  );
}
