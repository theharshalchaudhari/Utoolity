"use client";

/**
 * Choosing which annotation formats to write.
 *
 * The contents come from `@repo/roi-core`, so these are the same COCO, YOLO,
 * Pascal VOC and mask files the desktop app produces.
 */

import { useState } from "react";

import type { ExportKind } from "@repo/roi-core";
import { Button } from "@repo/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/shadcn/dialog";
import { Progress } from "@repo/ui/shadcn/progress";

const FORMATS: { kind: ExportKind; label: string; hint: string }[] = [
  { kind: "coco", label: "COCO", hint: "one instance-segmentation JSON for the batch" },
  { kind: "yolo", label: "YOLO", hint: "normalised polygons, one .txt per image" },
  { kind: "voc", label: "Pascal VOC", hint: "one XML per image, points kept alongside the box" },
  { kind: "masks", label: "Binary masks", hint: "one PNG per image, ROIs filled white" },
];

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  progress: { done: number; total: number; label: string } | null;
  onExport: (kinds: ExportKind[]) => void;
}

export default function ExportDialog({
  open,
  onOpenChange,
  busy,
  progress,
  onExport,
}: ExportDialogProps) {
  const [chosen, setChosen] = useState<ExportKind[]>(["coco"]);

  const toggle = (kind: ExportKind): void => {
    setChosen((current) =>
      current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export annotations</DialogTitle>
          <DialogDescription>
            Each format is written into its own subfolder.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2" disabled={busy}>
          <legend className="sr-only">Formats</legend>
          {FORMATS.map(({ kind, label, hint }) => (
            <label
              key={kind}
              className="border-border hover:bg-muted flex cursor-pointer items-start gap-3 rounded-lg border p-3"
            >
              <input
                type="checkbox"
                className="accent-primary mt-0.5 size-4"
                checked={chosen.includes(kind)}
                onChange={() => toggle(kind)}
              />
              <span className="min-w-0">
                <span className="text-foreground block text-sm font-medium">{label}</span>
                <span className="text-muted-foreground block text-xs">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {progress && (
          <div className="space-y-1.5">
            <Progress
              value={progress.done}
              max={Math.max(1, progress.total)}
              label="Export progress"
            />
            <p className="text-muted-foreground truncate text-xs">
              {progress.done}/{progress.total} · {progress.label}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || chosen.length === 0} onClick={() => onExport(chosen)}>
            {busy ? "Exporting…" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
