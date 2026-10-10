
"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, FileVideo, Settings2 } from "lucide-react";

import ConversionSettings from "@/components/video-converter/ConversionSettings";
import ConversionProgress from "@/components/video-converter/ConversionProgress";
import VideoConverterImportButton from "@/components/video-converter/VideoConverterImportButton";
import { useVideoConverter } from "@/hooks/useVideoConverter";

export default function VideoConverter() {
  const {
    files,
    resolution,
    compression,
    isConverting,
    error,
    setResolution,
    setCompression,
    addFiles,
    removeFile,
    clearFiles,
    convert,
  } = useVideoConverter();

  const [settingsOpen, setSettingsOpen] = useState(true);

  const handleImport = useCallback(
    (event: Event) => {
      const customEvent = event as CustomEvent<{
        files?: File[];
        requester?: string;
      }>;

      if (
        customEvent.detail?.requester !== "video-converter" ||
        !customEvent.detail.files?.length
      ) {
        return;
      }

      addFiles(customEvent.detail.files);
    },
    [addFiles],
  );

  useEffect(() => {
    window.addEventListener("utoolity:folder-files-selected", handleImport);

    return () => {
      window.removeEventListener(
        "utoolity:folder-files-selected",
        handleImport,
      );
    };
  }, [handleImport]);

  return (
    <main className="min-h-full bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Video Converter
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Convert videos to MP4 with H.264 encoding.
            </p>
          </div>

          <VideoConverterImportButton />
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">Selected videos</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {files.length} {files.length === 1 ? "video" : "videos"}
                  {" "}in queue
                </p>
              </div>

              {files.length > 0 && (
                <button
                  type="button"
                  onClick={clearFiles}
                  disabled={isConverting}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  Clear all
                </button>
              )}
            </div>

            {files.length > 0 ? (
              <ConversionProgress
                files={files}
                onRemove={removeFile}
                disabled={isConverting}
              />
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-5 py-8 text-center">
                <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <FileVideo className="size-5" />
                </div>
                <p className="text-sm font-medium">No videos selected</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                  Import videos from Files to add them to the conversion queue.
                </p>
                <div className="mt-4">
                  <VideoConverterImportButton />
                </div>
              </div>
            )}
          </div>

          <aside className="min-w-0 rounded-2xl border border-border bg-card p-4">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Settings2 className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    Conversion settings
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    MP4 · H.264 · AAC
                  </span>
                </span>
              </span>

              <ArrowRight
                className={`size-4 text-muted-foreground transition-transform ${
                  settingsOpen ? "rotate-90" : ""
                }`}
              />
            </button>

            {settingsOpen && (
              <div className="mt-4 border-t border-border pt-4">
                <ConversionSettings
                  resolution={resolution}
                  compression={compression}
                  onResolutionChange={setResolution}
                  onCompressionChange={setCompression}
                  disabled={isConverting}
                  hasFiles={files.length > 0}
                  isConverting={isConverting}
                  onConvert={convert}
                  onClear={clearFiles}
                />
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
