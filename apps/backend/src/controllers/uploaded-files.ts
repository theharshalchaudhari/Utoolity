
import type { FastifyRequest } from "fastify";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";

export type UploadedFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
};

export type UploadPayload = {
  files: UploadedFile[];
  settings: Record<string, unknown>;
};

const uploadDirectory = path.join(tmpdir(), "utoolity-uploads");

export async function parseUploadedFiles(
  request: FastifyRequest,
  allowedField: string,
): Promise<UploadPayload> {
  await mkdir(uploadDirectory, { recursive: true });

  const files: UploadedFile[] = [];
  let settings: Record<string, unknown> = {};

  for await (const part of request.parts({
    limits: {
      files: 100,
      fields: 50,
      fileSize: 2 * 1024 * 1024 * 1024,
    },
  })) {
    if (part.type === "field") {
      if (part.fieldname === "settings") {
        if (typeof part.value !== "string") {
          throw new Error("The settings field must be text.");
        }

        try {
          const parsed: unknown = JSON.parse(part.value);

          if (
            typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)
          ) {
            throw new Error("Settings must be a JSON object.");
          }

          settings = parsed as Record<string, unknown>;
        } catch {
          throw new Error("The settings field contains invalid JSON.");
        }
      }

      continue;
    }

    if (part.fieldname !== allowedField) {
      part.file.resume();
      throw new Error(
        `Unexpected upload field "${part.fieldname}". Expected "${allowedField}".`,
      );
    }

    if (part.file.truncated) {
      throw new Error("An uploaded file exceeded the size limit.");
    }

    const originalname = path.basename(part.filename || "upload");
    const extension = path.extname(originalname).slice(0, 20);
    const filename = `${randomUUID()}${extension}`;
    const filepath = path.join(uploadDirectory, filename);

    await pipeline(part.file, createWriteStream(filepath));

    if (part.file.truncated) {
      throw new Error(`The file "${originalname}" exceeded the size limit.`);
    }

    const size = part.file.bytesRead;

    files.push({
      fieldname: part.fieldname,
      originalname,
      encoding: "7bit",
      mimetype: part.mimetype,
      destination: uploadDirectory,
      filename,
      path: filepath,
      size,
    });
  }

  if (files.length === 0) {
    throw new Error(`At least one file in "${allowedField}" is required.`);
  }

  return { files, settings };
}
