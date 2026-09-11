import fs from 'fs';
import path from 'path';

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getOutputPath(filename: string) {
  const dir = process.env.OUTPUT_DIR || './outputs';
  ensureDir(dir);
  return path.join(dir, filename);
}