"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

type Entry = {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
};
const imagePattern = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;

export default function Gallery({ filePath, onOpenFile }: { filePath?: string; onOpenFile?: (path: string, type: "image" | "text") => void }) {
  const [images, setImages] = useState<Entry[]>([]);
  const [index, setIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const image = images[index];

  useEffect(() => {
    setLoadError(null);
    setImages([]);
    setImageUrl(null);
    if (filePath) {
      const name = filePath.split("/").filter(Boolean).pop() ?? filePath;
      setImages([{ name, path: filePath, type: "file", size: 0 }]);
      setIndex(0);
      return;
    }
    let active = true;
    fetch(API_URL + "/api/storage/list?path=server", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Unable to list images (HTTP ${response.status}).`);
        return response.json() as Promise<{ entries: Entry[] }>;
      })
      .then(({ entries }) => {
        if (!active) return;
        const filtered = entries
          .filter(
            (entry) => entry.type === "file" && imagePattern.test(entry.name),
          )
          .sort((a, b) => a.name.localeCompare(b.name));
        setImages(filtered);
        setIndex(0);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : "Unable to list images.",
        );
      });
    return () => {
      active = false;
    };
  }, [filePath]);

  useEffect(() => {
    if (!image) return;
    let active = true;
    let objectUrl: string | null = null;
    setLoadError(null);
    setImageUrl(null);
    fetch(
      API_URL + "/api/storage/download?path=" + encodeURIComponent(image.path),
      {
        credentials: "include",
        cache: "no-store",
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          let detail = "";
          try {
            const body = (await response.json()) as { message?: string };
            detail = body.message ?? "";
          } catch {
            /* The server may return plain text. */
          }
          throw new Error(
            detail || `Unable to load image (HTTP ${response.status}).`,
          );
        }
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : "Unable to load image.",
        );
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image?.path]);

  useEffect(() => {
    const move = (event: KeyboardEvent) => {
      if (!images.length || filePath) return;
      if (event.key === "ArrowRight")
        setIndex((value) => (value + 1) % images.length);
      if (event.key === "ArrowLeft")
        setIndex((value) => (value - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", move);
    return () => window.removeEventListener("keydown", move);
  }, [images.length, filePath]);

  return (
    <main className="flex h-full min-h-105 flex-col bg-background p-5 text-foreground">
      <h2 className="text-lg font-bold">Gallery</h2>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {image && imageUrl ? (
          <img
            src={imageUrl}
            alt={image.name}
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
        ) : loadError ? (
          <p
            role="alert"
            className="max-w-lg text-center text-sm text-destructive"
          >
            {loadError}
          </p>
        ) : image ? (
          <p className="text-center text-sm text-muted-foreground">
            Loading image…
          </p>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            No images found in this folder.
          </p>
        )}
      </div>
      {image && (
        <p className="text-center text-sm font-semibold">
          {image.name} · {index + 1} / {images.length}
        </p>
      )}
    </main>
  );
}
