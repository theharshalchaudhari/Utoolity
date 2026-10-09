"use client";

import {
  useCallback,
  useState,
} from "react";

import {
  videoConverterApi,
  type Compression,
  type ConversionStatus,
  type Resolution,
} from "@/api/videoConverter.api";

interface FileConversion {
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

export function useVideoConverter() {
  const [files, setFiles] =
    useState<FileConversion[]>([]);

  const [resolution, setResolution] =
    useState<Resolution>("original");

  const [compression, setCompression] =
    useState<Compression>("medium");

  const [isConverting, setIsConverting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const videoFiles =
        newFiles.filter((file) =>
          file.type.startsWith("video/"),
        );

      const convertedFiles =
        videoFiles.map((file) => ({
          file,
          progress: 0,
          status: "waiting" as const,
          inputFormat:
            file.name
              .split(".")
              .pop()
              ?.toUpperCase() || "UNKNOWN",
          outputFormat: "MP4" as const,
        }));

      setFiles((current) => [
        ...current,
        ...convertedFiles,
      ]);

      setError(null);
    },
    [],
  );

  const removeFile = useCallback(
    (index: number) => {
      setFiles((current) =>
        current.filter(
          (_, currentIndex) =>
            currentIndex !== index,
        ),
      );
    },
    [],
  );

  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const updateJob = useCallback(
    (
      index: number,
      status: ConversionStatus,
    ) => {
      setFiles((current) =>
        current.map((item, currentIndex) => {
          if (currentIndex !== index) {
            return item;
          }

          return {
            ...item,
            jobId: status.jobId,
            progress: status.progress,
            status:
              status.status === "completed"
                ? "completed"
                : status.status === "error"
                  ? "error"
                  : "processing",
            error: status.error,
          };
        }),
      );
    },
    [],
  );

  const monitorJob = useCallback(
    async (
      jobId: string,
      index: number,
    ) => {
      while (true) {
        const status =
          await videoConverterApi.getStatus(
            jobId,
          );

        updateJob(index, status);

        if (
          status.status === "completed"
        ) {
          break;
        }

        if (
          status.status === "error"
        ) {
          throw new Error(
            status.error ||
              "Video conversion failed.",
          );
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 1000),
        );
      }
    },
    [updateJob],
  );

  const convert = useCallback(
    async () => {
      if (files.length === 0) {
        setError(
          "Please select at least one video.",
        );

        return;
      }

      setIsConverting(true);
      setError(null);

      try {
        const response =
          await videoConverterApi.convert(
            files.map((item) => item.file),
            {
              resolution,
              compression,
            },
          );

        await Promise.all(
          response.jobs.map(
            async (job, index) => {
              if (!job.jobId) {
                setFiles((current) =>
                  current.map(
                    (item, currentIndex) =>
                      currentIndex === index
                        ? {
                            ...item,
                            status: "error",
                            progress: 0,
                            error:
                              job.error ||
                              "Unable to start conversion.",
                          }
                        : item,
                  ),
                );

                return;
              }

              await monitorJob(
                job.jobId,
                index,
              );
            },
          ),
        );

      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Video conversion failed.";

        setError(message);
      } finally {
        setIsConverting(false);
      }
    },
    [
      files,
      resolution,
      compression,
      monitorJob,
    ],
  );

  return {
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
  };
}
