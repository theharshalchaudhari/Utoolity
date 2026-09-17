"use client";

/**
 * Opening a batch, by either route.
 *
 * Where the browser supports it, picking a folder is the better option by a
 * wide margin: results are written back beside the images, exactly as the
 * desktop app does. Everywhere else, images are dropped in and the outputs
 * come back as one ZIP. The difference is stated up front rather than
 * discovered at save time.
 */

import { useRef, useState } from "react";

import { AlertTriangle, FolderOpen, Upload } from "lucide-react";

import { Button } from "@repo/ui/shadcn/button";

import { isImageName, supportsFolderAccess } from "@/services/polygonAnnotation.service";

export interface FolderPickerProps {
  busy: boolean;
  error: string | null;
  onOpenFolder: () => void;
  onOpenFiles: (files: File[]) => void;
}

export default function FolderPicker({
  busy,
  error,
  onOpenFolder,
  onOpenFiles,
}: FolderPickerProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canUseFolder = supportsFolderAccess();

  const take = (files: FileList | null): void => {
    if (!files) return;
    const images = Array.from(files).filter((file) => isImageName(file.name));
    if (images.length) onOpenFiles(images);
  };

  return (
    <section className="border-border bg-card mx-auto w-full max-w-2xl space-y-6 rounded-xl border p-6">
      <header className="space-y-2">
        <h2 className="text-foreground text-xl font-semibold">Open a batch</h2>
        <p className="text-muted-foreground text-sm">
          Point the tool at a folder of camera images. Everything happens in
          your browser — the images are never uploaded.
        </p>
      </header>

      {canUseFolder ? (
        <div className="space-y-2">
          <Button size="lg" className="w-full" disabled={busy} onClick={onOpenFolder}>
            <FolderOpen />
            {busy ? "Opening…" : "Open image folder"}
          </Button>
          <p className="text-muted-foreground text-xs">
            The spreadsheet, both JSON files, <code>no_roi/</code> and{" "}
            <code>printed_roi/</code> are written straight back into that
            folder, the same as the desktop app.
          </p>
        </div>
      ) : (
        <p className="border-border bg-muted text-muted-foreground rounded-lg border p-3 text-xs">
          This browser cannot write into a folder, so the tool will collect
          every output into a ZIP for you to download instead. For writing
          results beside your images, use Chrome or Edge.
        </p>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging ? "border-primary bg-accent" : "border-border"
        }`}
      >
        <Upload className="text-muted-foreground mx-auto mb-2 size-6" />
        <p className="text-foreground text-sm font-medium">
          {canUseFolder ? "Or drop images here" : "Drop images here"}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          JPG, PNG, BMP, GIF, WEBP, TIFF and PPM/PGM
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            take(event.target.files);
            event.target.value = ""; // let the same pick happen twice
          }}
        />
      </div>

      <section className="border-border bg-muted/40 rounded-lg border p-3">
        <h3 className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          What a browser can and cannot do
        </h3>
        <p className="text-muted-foreground mt-1.5 text-xs">
          This page does the annotating well, but a browser tab is a limited
          place to process a large batch. Worth knowing before you start:
        </p>
        <ul className="text-muted-foreground mt-1.5 list-disc space-y-1 pl-4 text-xs">
          <li>
            Saving re-encodes each annotated image in the page to write the
            burnt-in previews, so a large batch takes a while and keeps the tab
            busy while it works.
          </li>
          <li>
            Writes are not atomic and there is no crash recovery: closing the
            tab mid-save can leave a file incomplete.
          </li>
          <li>
            Nothing stops a second tab writing the same folder, so two people
            on one batch can overwrite each other&apos;s results.
          </li>
        </ul>
      </section>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
