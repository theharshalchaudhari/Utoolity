
import type { UploadedFile } from "../types/uploaded-file.js";
import {
  createUploadJobResult,
  getJobStatus,
} from "./service-utils.js";

export async function classify(
  files: UploadedFile[],
  settings: Record<string, unknown>,
) {
  return createUploadJobResult(files, settings, "processing");
}

export async function getStatus(jobId: string) {
  return getJobStatus(jobId);
}
