"use client";

/**
 * The shortcut reference, opened with `?`. The bindings match the desktop
 * app's so the two are interchangeable.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/shadcn/dialog";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Tools",
    items: [
      ["V", "Select and edit"],
      ["W", "Draw a polygon, point by point"],
      ["B", "Drag out a rectangle"],
      ["C", "Drag out a circle or ellipse"],
      ["G", "Trace freehand"],
    ],
  },
  {
    title: "Drawing",
    items: [
      ["Enter", "Close the polygon in progress"],
      ["Esc", "Abandon the shape in progress"],
      ["Double-click", "Close a polygon, or insert a point on an edge"],
      ["Ctrl+click", "Remove a vertex"],
      ["Shift+click", "Add to or remove from the selection"],
    ],
  },
  {
    title: "Editing",
    items: [
      ["Ctrl+Z", "Take back the last point while drawing, else undo the last change"],
      ["Ctrl+Y", "Redo"],
      ["Ctrl+D", "Duplicate the selection"],
      ["Del", "Delete the selection"],
      ["Arrows", "Nudge by one pixel"],
      ["Shift+arrows", "Nudge by ten pixels"],
    ],
  },
  {
    title: "The batch",
    items: [
      ["S", "Save and move on"],
      ["N", "File this image under no_roi"],
      ["PgDn / PgUp", "Next and previous image"],
      ["Ctrl+scroll", "Zoom"],
      ["Middle-drag", "Pan"],
      ["?", "This sheet"],
    ],
  },
];

export interface ShortcutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShortcutSheet({ open, onOpenChange }: ShortcutSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            The same bindings as the ROI Studio desktop app.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title} className="space-y-2">
              <h3 className="text-foreground text-sm font-semibold">{group.title}</h3>
              <dl className="space-y-1.5">
                {group.items.map(([key, what]) => (
                  <div key={key} className="flex items-baseline justify-between gap-3">
                    <dt>
                      <kbd className="border-border bg-muted text-foreground rounded border px-1.5 py-0.5 text-xs">
                        {key}
                      </kbd>
                    </dt>
                    <dd className="text-muted-foreground flex-1 text-right text-xs">{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
