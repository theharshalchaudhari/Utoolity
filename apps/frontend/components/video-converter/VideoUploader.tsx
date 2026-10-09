"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FileVideo,
  FolderOpen,
  Plus,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@repo/ui/shadcn/button";

interface UploadedFile {
  file: File;
  jobId?: string;
  progress: number;
  status:
    | "waiting"
    | "processing"
    | "completed"
    | "error";
  inputFormat: string;
  outputFormat: "MP4";
  error?: string;
}

interface VideoUploaderProps {
  files?: UploadedFile[];
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function VideoUploader({
  files = [],
  onFilesSelected,
  disabled = false,
}: VideoUploaderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const activeFile = files[activeIndex]?.file;

  useEffect(() => {
    if (!activeFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(activeFile);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [activeFile]);

  useEffect(() => {
    if (activeIndex >= files.length) {
      setActiveIndex(Math.max(0, files.length - 1));
    }
  }, [files.length, activeIndex]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) {
      return;
    }

    const selectedFiles = Array.from(fileList).filter((file) =>
      file.type.startsWith("video/"),
    );

    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
      setActiveIndex(0);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);

    // Allows selecting the same file again.
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (disabled) {
      return;
    }

    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const acceptedFormats = useMemo(
    () => "MP4, MOV, AVI, WebM, MKV and other video formats",
    [],
  );

  return (
    <section className="w-full">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Video Converter
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Convert your videos to MP4 with H.264 encoding.
          </p>
        </div>

        {files.length > 0 && (
          <label>
            <Button
              type="button"
              asChild
              variant="outline"
              disabled={disabled}
              className="shrink-0"
            >
              <span>
                <Plus className="mr-2 h-4 w-4" />
                Add Videos
              </span>
            </Button>

            <input
              type="file"
              accept="video/*"
              multiple
              hidden
              disabled={disabled}
              onChange={handleChange}
            />
          </label>
        )}
      </div>

      {/* Main preview / upload box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "overflow-hidden rounded-2xl border bg-muted/40 transition-all",
          isDragging
            ? "border-primary ring-2 ring-primary/20"
            : "border-border",
        ].join(" ")}
      >
        {previewUrl && activeFile ? (
          <div className="relative">
            {/* Video preview */}
            <div className="flex min-h-105 items-center justify-center bg-muted/60 p-5 sm:min-h-130">
              <video
                key={previewUrl}
                src={previewUrl}
                controls
                className="max-h-130 w-full rounded-lg object-contain"
              />
            </div>

            {/* Current video information */}
            <div className="flex flex-col gap-3 border-t border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileVideo className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {activeFile.name}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatFileSize(activeFile.size)}
                  </p>
                </div>
              </div>

              <label className="shrink-0">
                <Button
                  type="button"
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                >
                  <span>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Choose Another
                  </span>
                </Button>

                <input
                  type="file"
                  accept="video/*"
                  multiple
                  hidden
                  disabled={disabled}
                  onChange={handleChange}
                />
              </label>
            </div>
          </div>
        ) : (
          /* Empty upload state */
          <div className="p-6 sm:p-10">
            <div
              className={[
                "flex min-h-105 flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors sm:min-h-130",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background/50",
              ].join(" ")}
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-9 w-9" />
              </div>

              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                Drag and drop a video or{" "}
                <label className="cursor-pointer text-primary hover:underline">
                  browse
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    hidden
                    disabled={disabled}
                    onChange={handleChange}
                  />
                </label>
              </h2>

              <p className="mt-3 text-sm text-muted-foreground">
                Upload one or multiple videos to convert them to MP4.
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                {acceptedFormats}
              </p>

              <label className="mt-7">
                <Button
                  type="button"
                  asChild
                  disabled={disabled}
                  size="lg"
                >
                  <span>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Choose Videos
                  </span>
                </Button>

                <input
                  type="file"
                  accept="video/*"
                  multiple
                  hidden
                  disabled={disabled}
                  onChange={handleChange}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Video thumbnails */}
      {files.length > 0 && (
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2">
            {files.map((item, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={`${item.file.name}-${index}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => setActiveIndex(index)}
                  className={[
                    "group relative flex h-16 w-28 shrink-0 items-center gap-2 overflow-hidden rounded-lg border bg-card p-1.5 text-left transition-all",
                    isActive
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50",
                  ].join(" ")}
                >
                  <div className="flex h-full w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FileVideo className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-foreground">
                      {item.file.name}
                    </p>

                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatFileSize(item.file.size)}
                    </p>
                  </div>

                  {isActive && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}
