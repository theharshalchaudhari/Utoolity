"use client";

import { useEffect, useState } from "react";
import { api, API_URL } from "@/lib/api";

type Entry = { name: string; path: string; type: "file" | "directory"; size: number };

const imagePattern = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;

export default function Gallery({ initialPath }: { initialPath?: string }) {
  const [images, setImages] = useState<Entry[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    void api<{ entries: Entry[] }>("/api/storage/list?path=server")
      .then(({ entries }) => {
        const filtered = entries.filter((entry) => entry.type === "file" && imagePattern.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name));
        const selected = initialPath ? filtered.findIndex((entry) => entry.path === initialPath) : -1;
        setImages(filtered);
        setIndex(selected >= 0 ? selected : 0);
      })
      .catch(() => setImages([]));
  }, [initialPath]);

  useEffect(() => {
    const move = (event: KeyboardEvent) => {
      if (!images.length) return;
      if (event.key === "ArrowRight") setIndex((value) => (value + 1) % images.length);
      if (event.key === "ArrowLeft") setIndex((value) => (value - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", move);
    return () => window.removeEventListener("keydown", move);
  }, [images.length]);

  const image = images[index];
  return (
    <main className="flex h-full min-h-[420px] flex-col bg-background p-5 text-foreground">
      <h2 className="text-lg font-bold">Gallery</h2>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {image ? (
          <img src={`${API_URL}/api/storage/download?path=${encodeURIComponent(image.path)}`} alt={image.name} className="max-h-full max-w-full rounded-2xl object-contain" />
        ) : (
          <p className="text-muted-foreground">No images found in shared storage.</p>
        )}
      </div>
      {image && <p className="text-center text-sm font-semibold">{image.name} · {index + 1} / {images.length}</p>}
    </main>
  );
}
