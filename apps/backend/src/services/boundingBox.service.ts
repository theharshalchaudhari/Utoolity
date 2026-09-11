import { randomUUID } from 'node:crypto';

export async function save(
  files: Express.Multer.File[],
  settings: Record<string, unknown>,
) {
  const jobId = randomUUID();
  return { jobId, status: 'saved', files, settings };
}

export async function getStatus(jobId: string) {
  return { jobId, status: 'completed' };
}