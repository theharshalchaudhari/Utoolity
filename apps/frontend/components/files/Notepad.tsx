"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/shadcn/dialog";

export default function Notepad({ initialPath }: { initialPath?: string }) {
  const [path, setPath] = useState(initialPath ?? "");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsPath, setSaveAsPath] = useState(
    initialPath ?? "server/untitled.txt",
  );

  useEffect(() => {
    const query =
      initialPath ?? new URLSearchParams(window.location.search).get("path");
    if (!query) return;
    setPath(query);
    void api<{ content: string }>(
      `/api/storage/content?path=${encodeURIComponent(query)}`,
    )
      .then(({ content }) => setValue(content))
      .catch((error) =>
        setMessage(
          error instanceof Error ? error.message : "Unable to open file.",
        ),
      );
  }, [initialPath]);

  const save = async () => {
    if (!path) {
      setMessage("Choose a file from File Manager first.");
      return;
    }
    try {
      await api("/api/storage/content", {
        method: "PUT",
        body: JSON.stringify({ path, content: value }),
      });
      setMessage("Saved.");
    } catch (saveError) {
      setMessage(
        saveError instanceof Error ? saveError.message : "Unable to save file.",
      );
    }
  };

  const saveAs = async () => {
    const nextPath = saveAsPath.trim();
    if (!nextPath || nextPath === "." || nextPath === "..") return;
    try {
      await api("/api/storage/content", {
        method: "PUT",
        body: JSON.stringify({ path: nextPath, content: value }),
      });
      setPath(nextPath);
      setSaveAsOpen(false);
      setMessage("Saved as.");
    } catch (saveError) {
      setMessage(
        saveError instanceof Error ? saveError.message : "Unable to save file.",
      );
    }
  };

  return (
    <main className="flex h-full min-h-105 flex-col gap-3 bg-background p-4 text-foreground">
      <header className="flex items-center gap-2">
        <div
          className="min-w-0 flex-1 truncate rounded-xl border border-input bg-muted/40 px-3 py-2 text-sm"
          title={path}
        >
          {path.split("/").filter(Boolean).at(-1) ?? "Untitled"}
        </div>
        <button
          type="button"
          onClick={() => void save()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setSaveAsPath(path || "server/untitled.txt");
            setSaveAsOpen(true);
          }}
          className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
        >
          Save as
        </button>
        <button
          type="button"
          onClick={() => {
            setPath("");
            setValue("");
            setMessage("");
          }}
          className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
        >
          New
        </button>
      </header>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="min-h-0 flex-1 resize-none rounded-2xl border border-input bg-background p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
        spellCheck={false}
      />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save file as</DialogTitle>
            <DialogDescription>
              Enter a path relative to your workspace, for example
              server/notes.json.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveAs();
            }}
            className="space-y-4"
          >
            <input
              autoFocus
              value={saveAsPath}
              onChange={(event) => setSaveAsPath(event.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <DialogFooter>
              <button
                type="button"
                onClick={() => setSaveAsOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!saveAsPath.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                Save
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
