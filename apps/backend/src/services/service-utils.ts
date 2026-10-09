
import { randomUUID } from "node:crypto";

import type { UploadedFile } from "../types/uploaded-file.js";
import { summarizeUploadedFiles } from "../types/uploaded-file.js";

export type UploadJobStatus = "saved" | "processing";

export function createUploadJobResult(
  files: UploadedFile[],
  settings: Record<string, unknown>,
  status: UploadJobStatus,
) {
  return {
    jobId: randomUUID(),
    status,
    files: summarizeUploadedFiles(files),
    settings,
  };
}

export function getJobStatus(jobId: string) {
  return {
    jobId,
    status: "completed" as const,
  };
}
