"use client";

/**
 * The ROI annotation tool.
 *
 * This component owns the wiring only: the annotation model and every output
 * file come from `@repo/roi-core`, shared with the desktop app, and the
 * filesystem work is in `services/polygonAnnotation.service.ts`.
 *
 * Leaving an image commits whatever is on screen, matching the desktop app's
 * promise that navigating never loses work.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FileDown, FileText, Keyboard, X } from "lucide-react";

import {
  DEFAULT_CLASS,
  XLSX_NAME,
  buildStats,
  type ExportKind,
} from "@repo/roi-core";
import { Button } from "@repo/ui/shadcn/button";
import { Progress } from "@repo/ui/shadcn/progress";

import { useBatch } from "@/hooks/useBatch";
import { useCanvasViewport } from "@/hooks/useCanvasViewport";
import { usePolygonAnnotation } from "@/hooks/usePolygonAnnotation";
import { useShortcuts, type ShortcutHandlers } from "@/hooks/useShortcuts";
import { deliver, saveBatch, saveExports, saveReport } from "@/services/polygonAnnotation.service";
import type { Tool } from "@/types/roi";

import AnnotationCanvas, { type CanvasHandle } from "./AnnotationCanvas";
import ClassSelector from "./ClassSelector";
import ExportDialog from "./ExportDialog";
import Filmstrip from "./Filmstrip";
import FolderPicker from "./FolderPicker";
import PolygonList from "./PolygonList";
import PolygonToolbar from "./PolygonToolbar";
import ShortcutSheet from "./ShortcutSheet";

interface Note {
  id: number;
  text: string;
  tone: "info" | "error";
}

type Progress = { done: number; total: number; label: string } | null;

export default function RoiStudioWorkspace() {
  const batch = useBatch();
  const view = useCanvasViewport();
  const editor = usePolygonAnnotation(batch.image?.width ?? 0, batch.image?.height ?? 0);

  const [classes, setClasses] = useState<string[]>([DEFAULT_CLASS]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<Progress>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const noteId = useRef(0);
  const canvas = useRef<CanvasHandle | null>(null);

  const say = useCallback((text: string, tone: Note["tone"] = "info") => {
    const id = (noteId.current += 1);
    setNotes((current) => [...current, { id, text, tone }]);
    window.setTimeout(() => {
      setNotes((current) => current.filter((note) => note.id !== id));
    }, 6000);
  }, []);

  // ── moving between images ──────────────────────────────────

  // Load the shapes recorded for whichever image is now on screen.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    const name = batch.image?.name;
    if (!name || loadedFor.current === name) return;
    loadedFor.current = name;
    editor.load(batch.shapesFor(name));
  }, [batch, editor]);

  // Commit the current image before leaving it, so navigating never loses work.
  const commitCurrent = useCallback(() => {
    const name = batch.current;
    if (!name || !editor.dirty) return;
    batch.record(name, editor.shapes);
    editor.markClean();
  }, [batch, editor]);

  const goTo = useCallback(
    (index: number) => {
      commitCurrent();
      batch.goTo(index);
    },
    [batch, commitCurrent],
  );

  // ── saving ─────────────────────────────────────────────────

  const rowsToWrite = useMemo(() => {
    // include the image on screen, even if it has not been committed yet
    const pending = { ...batch.rows };
    return Object.values(pending);
  }, [batch.rows]);

  const save = useCallback(
    async (advance: boolean) => {
      if (!batch.source) return;
      const name = batch.current;
      if (name) {
        batch.record(name, editor.shapes);
        editor.markClean();
      }
      setSaving(true);
      setProgress({ done: 0, total: 1, label: XLSX_NAME });
      try {
        // read the rows back out of state after record() has applied
        const rows = name
          ? Object.values({ ...batch.rows })
          : rowsToWrite;
        const summary = await saveBatch(batch.source, rows, {
          onProgress: (done, total, label) => setProgress({ done, total, label }),
        });
        for (const warning of summary.warnings.slice(0, 3)) say(warning);
        if (summary.errors.length) {
          say(summary.errors[0]!, "error");
        } else {
          say(
            batch.source.canWriteInPlace
              ? `Saved ${summary.written.length} file(s) into ${batch.source.folderName}`
              : `Prepared ${summary.written.length} file(s) — use Download ZIP`,
          );
        }
        if (advance) batch.next();
      } catch (error) {
        say((error as Error).message, "error");
      } finally {
        setSaving(false);
        setProgress(null);
      }
    },
    [batch, editor, rowsToWrite, say],
  );

  const markNoRoi = useCallback(() => {
    const name = batch.current;
    if (!name) return;
    batch.markNoRoi(name);
    editor.load([]);
    say(`${name} filed under no_roi`);
    batch.next();
  }, [batch, editor, say]);

  const writeReport = useCallback(async () => {
    if (!batch.source) return;
    commitCurrent();
    const summary = await saveReport(batch.source, Object.values(batch.rows));
    if (summary.errors.length) say(summary.errors[0]!, "error");
    else say("Wrote roi_report.html and roi_coverage.json");
  }, [batch.rows, batch.source, commitCurrent, say]);

  const runExport = useCallback(
    async (kinds: ExportKind[]) => {
      if (!batch.source) return;
      commitCurrent();
      setSaving(true);
      try {
        const summary = await saveExports(
          batch.source,
          Object.values(batch.rows),
          kinds,
          (done, total, label) => setProgress({ done, total, label }),
        );
        for (const warning of summary.warnings.slice(0, 2)) say(warning);
        if (summary.errors.length) say(summary.errors[0]!, "error");
        else say(`Exported ${summary.written.length} file(s)`);
        setShowExport(false);
      } finally {
        setSaving(false);
        setProgress(null);
      }
    },
    [batch.rows, batch.source, commitCurrent, say],
  );

  const downloadZip = useCallback(async () => {
    if (!batch.source) return;
    await deliver(batch.source, `${batch.source.folderName}-roi.zip`);
    say("ZIP downloaded");
  }, [batch.source, say]);

  // ── shortcuts ──────────────────────────────────────────────

  const handlers = useMemo<ShortcutHandlers>(() => {
    const tool = (value: Tool) => () => editor.setTool(value);
    return {
      v: tool("select"),
      w: tool("polygon"),
      b: tool("rect"),
      c: tool("circle"),
      g: tool("freehand"),
      s: () => void save(true),
      n: markNoRoi,
      // while a polygon is being drawn, take back the last point instead
      "ctrl+z": () => {
        if (canvas.current?.undoDraftPoint()) return;
        editor.undo();
      },
      "ctrl+y": editor.redo,
      "ctrl+shift+z": editor.redo,
      "ctrl+d": editor.duplicateSelected,
      Delete: editor.deleteSelected,
      Backspace: editor.deleteSelected,
      PageDown: () => goTo(batch.index + 1),
      PageUp: () => goTo(batch.index - 1),
      "?": () => setShowShortcuts(true),
      ArrowLeft: () => editor.nudgeSelected(-1, 0),
      ArrowRight: () => editor.nudgeSelected(1, 0),
      ArrowUp: () => editor.nudgeSelected(0, -1),
      ArrowDown: () => editor.nudgeSelected(0, 1),
      "shift+ArrowLeft": () => editor.nudgeSelected(-10, 0),
      "shift+ArrowRight": () => editor.nudgeSelected(10, 0),
      "shift+ArrowUp": () => editor.nudgeSelected(0, -10),
      "shift+ArrowDown": () => editor.nudgeSelected(0, 10),
    };
  }, [batch.index, editor, goTo, markNoRoi, save]);

  useShortcuts(handlers, Boolean(batch.source));

  // Warn before losing uncommitted work on a reload.
  useEffect(() => {
    if (!editor.dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editor.dirty]);

  const stats = useMemo(
    () =>
      buildStats(
        Object.values(batch.rows),
        batch.source?.images.map((img) => img.name) ?? [],
        batch.source?.folderName ?? "",
      ),
    [batch.rows, batch.source],
  );

  // ── render ─────────────────────────────────────────────────

  if (!batch.source) {
    return (
      <FolderPicker
        busy={batch.loading}
        error={batch.error}
        onOpenFolder={() => void batch.openFolder()}
        onOpenFiles={(files) => void batch.openFiles(files)}
      />
    );
  }

  const names = batch.source.images.map((img) => img.name);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-foreground truncate text-lg font-semibold">
            {batch.source.folderName}
          </h2>
          <p className="text-muted-foreground truncate text-xs">
            {batch.current ?? "no image"}
            {batch.image ? ` · ${batch.image.width}x${batch.image.height}` : ""} ·{" "}
            {stats.totals.annotated} annotated, {stats.totals.no_roi} no ROI,{" "}
            {stats.totals.remaining} remaining
            {batch.source.canWriteInPlace ? "" : " · ZIP mode"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!batch.source.canWriteInPlace && (
            <Button size="sm" variant="outline" onClick={() => void downloadZip()}>
              <FileDown />
              Download ZIP
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => void writeReport()}>
            <FileText />
            Report
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowExport(true)}>
            Export
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            onClick={() => setShowShortcuts(true)}
          >
            <Keyboard />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            title="Close this batch"
            aria-label="Close this batch"
            onClick={() => {
              commitCurrent();
              batch.close();
            }}
          >
            <X />
          </Button>
        </div>
      </header>

      <PolygonToolbar
        tool={editor.tool}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        undoLabel={editor.undoLabel}
        redoLabel={editor.redoLabel}
        dirty={editor.dirty}
        saving={saving}
        zoomPercent={Math.round(view.viewport.scale * 100)}
        onToolChange={editor.setTool}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onZoomIn={view.zoomIn}
        onZoomOut={view.zoomOut}
        onFit={() => {
          if (batch.image) {
            view.fit(batch.image.width, batch.image.height, 800, 600);
          }
        }}
        onSave={() => void save(true)}
        onNoRoi={markNoRoi}
      />

      {progress && (
        <div className="space-y-1">
          <Progress value={progress.done} max={Math.max(1, progress.total)} label="Saving" />
          <p className="text-muted-foreground truncate text-xs">{progress.label}</p>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="h-[60vh] min-h-96 lg:h-[72vh]">
          <AnnotationCanvas
            handleRef={canvas}
            bitmap={batch.image?.bitmap ?? null}
            imageWidth={batch.image?.width ?? 0}
            imageHeight={batch.image?.height ?? 0}
            shapes={editor.shapes}
            selected={editor.selected}
            tool={editor.tool}
            className={editor.className}
            view={view}
            snapToEdges
            snapToShapes
            onSelect={editor.setSelected}
            onAddShape={(shape) => {
              const messages = editor.addShape(shape);
              for (const message of messages) say(message);
            }}
            onCommit={editor.commit}
            onPreview={editor.preview}
          />
        </div>

        <aside className="grid min-h-0 gap-3 lg:grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)]">
          <ClassSelector
            classes={classes}
            active={editor.className}
            onActiveChange={editor.setClassName}
            onAddClass={(name) =>
              setClasses((current) =>
                current.includes(name) ? current : [...current, name],
              )
            }
          />
          <PolygonList
            shapes={editor.shapes}
            selected={editor.selected}
            imageWidth={batch.image?.width ?? 0}
            imageHeight={batch.image?.height ?? 0}
            onSelect={editor.setSelected}
            onDelete={editor.deleteSelected}
            onDuplicate={editor.duplicateSelected}
            onToggleLock={editor.toggleLock}
            onToggleVisible={editor.toggleVisible}
            onClearAll={editor.clearAll}
          />
          <Filmstrip names={names} index={batch.index} rows={batch.rows} onSelect={goTo} />
        </aside>
      </div>

      <ShortcutSheet open={showShortcuts} onOpenChange={setShowShortcuts} />
      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        busy={saving}
        progress={progress}
        onExport={(kinds) => void runExport(kinds)}
      />

      {notes.length > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 space-y-2 px-4"
        >
          {notes.map((note) => (
            <p
              key={note.id}
              className={`pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg ${
                note.tone === "error"
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border-border bg-card text-card-foreground"
              }`}
            >
              {note.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
