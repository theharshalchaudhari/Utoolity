import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const allowed = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);

export async function GET() {
  const directory = path.join(process.cwd(), "public", "wallpapers");
  try {
    const files = (await readdir(directory))
      .filter((file) => allowed.has(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => ({
        file,
        name: path
          .basename(file, path.extname(file))
          .replace(/[-_]+/g, " ")
          .replace(/\b\w/g, (character) => character.toUpperCase()),
        url: `/wallpapers/${encodeURIComponent(file)}`,
      }));
    return NextResponse.json({ wallpapers: files });
  } catch {
    return NextResponse.json({ wallpapers: [] });
  }
}
