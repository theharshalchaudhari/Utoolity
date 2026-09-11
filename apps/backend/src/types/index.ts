export type JobStatus = 'processing' | 'completed' | 'failed' | 'saved';

export interface Job {
  jobId: string;
  status: JobStatus;
}