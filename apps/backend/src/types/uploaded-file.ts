
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

export interface UploadedFileSummary {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export function summarizeUploadedFiles(
  files: UploadedFile[],
): UploadedFileSummary[] {
  return files.map((file) => ({
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  }));
}
