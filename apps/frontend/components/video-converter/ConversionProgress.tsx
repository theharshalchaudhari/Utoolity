"use client";

import {
  CheckCircle2,
  Clock3,
  Download,
  FileVideo,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";

import { Button } from "@repo/ui/shadcn/button";
import { videoConverterApi } from "@/api/videoConverter.api";

interface ConversionFile {
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

interface ConversionProgressProps {
  files: ConversionFile[];
  onRemove: (index: number) => void;
  disabled?: boolean;
}

export default function ConversionProgress({
  files,
  onRemove,
  disabled = false,
}: ConversionProgressProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">
            Uploaded Videos
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            {files.length}{" "}
            {files.length === 1 ? "video" : "videos"} uploaded
            successfully
          </p>
        </div>

        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {files.length}
        </div>
      </div>

      {/* File list */}
      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {files.map((item, index) => {
          const isWaiting = item.status === "waiting";
          const isProcessing = item.status === "processing";
          const isCompleted = item.status === "completed";
          const isError = item.status === "error";

          return (
            <div
              key={`${item.file.name}-${index}`}
              className={[
                "rounded-xl border p-3 transition-colors",
                isCompleted
                  ? "border-primary/30 bg-primary/5"
                  : isError
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-background",
              ].join(" ")}
            >
              {/* File row */}
              <div className="flex items-center gap-3">
                {/* Status icon */}
                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    isCompleted
                      ? "bg-primary/10 text-primary"
                      : isError
                        ? "bg-destructive/10 text-destructive"
                        : isProcessing
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isError ? (
                    <XCircle className="h-5 w-5" />
                  ) : isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileVideo className="h-5 w-5" />
                  )}
                </div>

                {/* File information */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.file.name}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {item.inputFormat} → {item.outputFormat}
                    </span>

                    <span>•</span>

                    <span>
                      {formatFileSize(item.file.size)}
                    </span>
                  </div>
                </div>

                {/* Status / actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {isWaiting && (
                    <>
                      <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        Ready
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        onClick={() => onRemove(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {isProcessing && (
                    <span className="text-xs font-medium text-primary">
                      {item.progress}%
                    </span>
                  )}

                  {isCompleted && item.jobId && (
                    <a
                      href={videoConverterApi.getDownloadUrl(
                        item.jobId,
                      )}
                      download
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  )}

                  {isError && (
                    <span className="text-xs font-medium text-destructive">
                      Failed
                    </span>
                  )}
                </div>
              </div>

              {/* Progress */}
              {(isProcessing || isCompleted) && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${item.progress}%`,
                      }}
                    />
                  </div>

                  <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                    <span>
                      {isCompleted
                        ? "Conversion complete"
                        : "Converting video..."}
                    </span>

                    <span>{item.progress}%</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {isError && item.error && (
                <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {item.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
