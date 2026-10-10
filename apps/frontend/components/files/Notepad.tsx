"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Notepad({ initialPath }: { initialPath?: string }) {
  const [path, setPath] = useState(initialPath ?? "");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const query = initialPath ?? new URLSearchParams(window.location.search).get("path");
    if (!query) return;
    setPath(query);
    void api<{ content: string }>(`/api/storage/content?path=${encodeURIComponent(query)}`)
      .then(({ content }) => setValue(content))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to open file."));
  }, [initialPath]);

  const save = async () => {
    if (!path) {
      setMessage("Choose a file from File Manager first.");
      return;
    }
    try {
      await api("/api/storage/content", { method: "PUT", body: JSON.stringify({ path, content: value }) });
      setMessage("Saved.");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Unable to save file.");
    }
  };

  const saveAs = async () => {
    const nextPath = window.prompt("Save as", path || "untitled.txt");
    if (!nextPath?.trim()) return;
    try {
      setPath(nextPath.trim());
      await api("/api/storage/content", { method: "PUT", body: JSON.stringify({ path: nextPath.trim(), content: value }) });
      setMessage("Saved as.");
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Unable to save file.");
    }
  };

  return (
    <main className="flex h-full min-h-[420px] flex-col gap-3 bg-background p-4 text-foreground">
      <header className="flex items-center gap-2">
        <input value={path} onChange={(event) => setPath(event.target.value)} placeholder="Storage file path" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" />
        <button type="button" onClick={() => void save()} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Save</button>
        <button type="button" onClick={() => void saveAs()} className="rounded-xl border border-border px-4 py-2 text-sm font-bold">Save as</button>
        <button type="button" onClick={() => { setPath(""); setValue(""); setMessage(""); }} className="rounded-xl border border-border px-4 py-2 text-sm font-bold">New</button>
      </header>
      <textarea value={value} onChange={(event) => setValue(event.target.value)} className="min-h-0 flex-1 resize-none rounded-2xl border border-input bg-background p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" spellCheck={false} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </main>
  );
}
