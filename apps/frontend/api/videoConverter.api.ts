import { api } from "./client";

export type Resolution =
  | "original"
  | "720p"
  | "1080p";

export type Compression =
  | "low"
  | "medium"
  | "high";

export interface ConversionSettings {
  resolution: Resolution;
  compression: Compression;
}

export interface ConversionJob {
  jobId: string;
  status: string;
  filename: string;
  error?: string;
}

export interface ConversionResponse {
  jobs: ConversionJob[];
}

export interface ConversionStatus {
  jobId: string;
  status:
    | "processing"
    | "completed"
    | "error";
  progress: number;
  inputFormat: string;
  outputFormat: "MP4";
  outputUrl?: string;
  error?: string;
}

export const videoConverterApi = {
  async convert(
    files: File[],
    settings: ConversionSettings,
  ): Promise<ConversionResponse> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("videos", file);
    });

    formData.append(
      "resolution",
      settings.resolution,
    );

    formData.append(
      "compression",
      settings.compression,
    );

    const { data } = await api.post(
      "/tools/video-converter",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return data;
  },

  async getStatus(
    jobId: string,
  ): Promise<ConversionStatus> {
    const { data } = await api.get(
      `/tools/video-converter/status/${jobId}`,
    );

    return data;
  },

  getDownloadUrl(jobId: string): string {
    const baseUrl =
      (globalThis as typeof globalThis & {
        process?: { env?: { NEXT_PUBLIC_API_URL?: string } };
      }).process?.env?.NEXT_PUBLIC_API_URL ||
      "http://localhost:5000/api";

    return `${baseUrl}/tools/video-converter/download/${jobId}`;
  },
};
