
import type { UploadedFile } from "../types/uploaded-file.js";
import {
  createUploadJobResult,
  getJobStatus,
} from "./service-utils.js";

export async function save(
  files: UploadedFile[],
  settings: Record<string, unknown>,
) {
  return createUploadJobResult(files, settings, "saved");
}

export async function getStatus(jobId: string) {
  return getJobStatus(jobId);
}
