"use client";

/**
 * Tool selection, zoom, undo/redo and the save actions.
 *
 * The shortcut letters match the desktop app, and each button shows its own in
 * the title attribute so the two stay discoverable together.
 */

import {
  Circle,
  Lasso,
  MousePointer2,
  Pentagon,
  Redo2,
  Save,
  Square,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@repo/ui/shadcn/button";

import type { Tool } from "@/types/roi";

const TOOLS: { tool: Tool; label: string; key: string; Icon: typeof Square }[] = [
  { tool: "select", label: "Select", key: "V", Icon: MousePointer2 },
  { tool: "polygon", label: "Polygon", key: "W", Icon: Pentagon },
  { tool: "rect", label: "Rectangle", key: "B", Icon: Square },
  { tool: "circle", label: "Circle", key: "C", Icon: Circle },
  { tool: "freehand", label: "Freehand", key: "G", Icon: Lasso },
];

export interface PolygonToolbarProps {
  tool: Tool;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string;
  redoLabel: string;
  dirty: boolean;
  saving: boolean;
  zoomPercent: number;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onSave: () => void;
  onNoRoi: () => void;
}

export default function PolygonToolbar({
  tool,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  dirty,
  saving,
  zoomPercent,
  onToolChange,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFit,
  onSave,
  onNoRoi,
}: PolygonToolbarProps) {
  return (
    <div className="border-border bg-card flex flex-wrap items-center gap-2 rounded-lg border p-2">
      <div className="flex items-center gap-1">
        {TOOLS.map(({ tool: value, label, key, Icon }) => (
          <Button
            key={value}
            size="icon-sm"
            variant={tool === value ? "default" : "ghost"}
            title={`${label} (${key})`}
            aria-label={label}
            aria-pressed={tool === value}
            onClick={() => onToolChange(value)}
          >
            <Icon />
          </Button>
        ))}
      </div>

      <span className="bg-border h-6 w-px" aria-hidden="true" />

      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={!canUndo}
          title={canUndo ? `Undo ${undoLabel} (Ctrl+Z)` : "Nothing to undo"}
          aria-label="Undo"
          onClick={onUndo}
        >
          <Undo2 />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={!canRedo}
          title={canRedo ? `Redo ${redoLabel} (Ctrl+Y)` : "Nothing to redo"}
          aria-label="Redo"
          onClick={onRedo}
        >
          <Redo2 />
        </Button>
      </div>

      <span className="bg-border h-6 w-px" aria-hidden="true" />

      <div className="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" title="Zoom out" aria-label="Zoom out" onClick={onZoomOut}>
          <ZoomOut />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="min-w-16 tabular-nums"
          title="Fit the image to the window"
          onClick={onFit}
        >
          {zoomPercent}%
        </Button>
        <Button size="icon-sm" variant="ghost" title="Zoom in" aria-label="Zoom in" onClick={onZoomIn}>
          <ZoomIn />
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="outline" title="File under no_roi (N)" onClick={onNoRoi}>
          No ROI
        </Button>
        <Button size="sm" disabled={saving} title="Save and move on (S)" onClick={onSave}>
          <Save />
          {saving ? "Saving…" : dirty ? "Save*" : "Save"}
        </Button>
      </div>
    </div>
  );
}
