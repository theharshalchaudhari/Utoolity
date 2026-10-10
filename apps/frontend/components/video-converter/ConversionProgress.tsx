"use client";

import {
  CheckCircle2,
  Download,
  FileVideo,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import { videoConverterApi } from "@/api/videoConverter.api";

interface ConversionFile {
  file: File;
  jobId?: string;
  progress: number;
  status: "waiting" | "processing" | "completed" | "error";
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
  if (files.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Conversion queue</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Track progress and download finished files.
          </p>
        </div>
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums">
          {files.length}
        </span>
      </div>

      <div className="space-y-2">
        {files.map((item, index) => {
          const isWaiting = item.status === "waiting";
          const isProcessing = item.status === "processing";
          const isCompleted = item.status === "completed";
          const isError = item.status === "error";

          return (
            <div
              key={`${item.file.name}-${item.file.lastModified}-${index}`}
              className="rounded-xl border border-border/60 bg-background/60 p-3 sm:p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    isCompleted
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : isError
                        ? "bg-destructive/10 text-destructive"
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

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.file.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.inputFormat} <span className="px-1">→</span>{" "}
                    {item.outputFormat} <span className="px-1">·</span>{" "}
                    {formatFileSize(item.file.size)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {isWaiting && (
                    <>
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        Ready
                      </span>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onRemove(index)}
                        aria-label={`Remove ${item.file.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {isProcessing && (
                    <span className="text-xs font-medium tabular-nums">
                      {item.progress}%
                    </span>
                  )}
                  {isCompleted && item.jobId && (
                    <a
                      href={videoConverterApi.getDownloadUrl(item.jobId)}
                      download
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90"
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

              {(isProcessing || isCompleted) && (
                <div className="mt-3">
                  <div
                    role="progressbar"
                    aria-label={`Conversion progress for ${item.file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progress}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>{isCompleted ? "Completed" : "Converting…"}</span>
                    <span className="tabular-nums">{item.progress}%</span>
                  </div>
                </div>
              )}

              {isError && item.error && (
                <p className="mt-3 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {item.error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(bytes / 1024, 0.1).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
