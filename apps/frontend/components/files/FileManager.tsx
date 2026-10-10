"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  File,
  Folder,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { api, API_URL } from "@/lib/api";

type Entry = { name: string; path: string; type: "file" | "directory"; size: number };
type SharedUser = { id: string; displayName: string; hostname: string };
type Props = { onOpenFile?: (path: string, type: "image" | "text") => void };
const imagePattern = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;

export default function FileManager({ onOpenFile }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [path, setPath] = useState("server");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [users, setUsers] = useState<SharedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderPickerMode, setFolderPickerMode] = useState(false);
  const [folderPickerRequester, setFolderPickerRequester] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const load = async (nextPath = path) => {
    setError(null);
    try {
      const result = await api<{ entries: Entry[] }>(
        `/api/storage/list?path=${encodeURIComponent(nextPath)}`,
      );
      setEntries(result.entries.sort((a, b) => a.name.localeCompare(b.name)));
      setPath(nextPath);
      localStorage.setItem("utoolity.files.path", nextPath);
      setSelected(null);
      setMenuOpen(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load files.");
    }
  };

  useEffect(() => {
    void load(localStorage.getItem("utoolity.files.path") ?? "server");
    const requester = localStorage.getItem("utoolity.files.folder-picker");
    if (requester) {
      setFolderPickerMode(true);
      setFolderPickerRequester(requester);
      localStorage.removeItem("utoolity.files.folder-picker");
    }
  }, []);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    const openPicker = (event: Event) => {
      const requester = (event as CustomEvent<{ requester?: string }>).detail?.requester;
      if (!requester) return;
      setFolderPickerMode(true);
      setFolderPickerRequester(requester);
      setSelected(null);
      setMenuOpen(false);
    };
    window.addEventListener("utoolity:polygon-folder-request", openPicker);
    return () => window.removeEventListener("utoolity:polygon-folder-request", openPicker);
  }, []);

  const createFolder = async () => {
    const name = folderName.trim();
    if (!name) return;
    window.dispatchEvent(new Event("utoolity:work-started"));
    try {
      await api("/api/storage/mkdir", {
        method: "POST",
        body: JSON.stringify({ path: `${path}/${name.trim()}` }),
      });
      await load();
      setFolderName("");
      setFolderDialogOpen(false);
    } catch (folderError) {
      setError(folderError instanceof Error ? folderError.message : "Unable to create folder.");
    } finally {
      window.dispatchEvent(new Event("utoolity:work-finished"));
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    window.dispatchEvent(new Event("utoolity:work-started"));
    const form = new FormData();
    const selectedFiles = Array.from(files);
    const relativePaths = selectedFiles.map((file) =>
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    );
    const folderRoot = relativePaths
      .map((relativePath) => relativePath.split("/")[0])
      .find((root) => root && relativePaths.some((value) => value.startsWith(`${root}/`)));
    form.append("relativePaths", JSON.stringify(relativePaths));
    if (folderRoot) form.append("rootFolder", folderRoot);
    selectedFiles.forEach((file, index) => {
      form.append("files", file, relativePaths[index]);
    });
    form.append("path", path);
    try {
      await api<{ entries: Entry[] }>("/api/storage/upload", {
        method: "POST",
        body: form,
      });
      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload.");
    } finally {
      window.dispatchEvent(new Event("utoolity:work-finished"));
      if (inputRef.current) inputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  };

  const renameSelected = async () => {
    if (!selected) return;
    const name = window.prompt("New name", selected.name);
    if (!name?.trim()) return;
    try {
      await api("/api/storage/rename", {
        method: "POST",
        body: JSON.stringify({ path: selected.path, name: name.trim() }),
      });
      await load();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Unable to rename.");
    }
  };

  const deleteSelected = async () => {
    if (!selected || !window.confirm(`Delete ${selected.name}?`)) return;
    try {
      await api("/api/storage/delete", {
        method: "POST",
        body: JSON.stringify({ path: selected.path }),
      });
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete.");
    }
  };

  const showShare = async () => {
    setShareOpen(true);
    setMenuOpen(false);
    try {
      const result = await api<{ users: SharedUser[] }>("/api/storage/users");
      setUsers(result.users);
    } catch (usersError) {
      setError(usersError instanceof Error ? usersError.message : "Unable to load users.");
    }
  };

  const openSelected = () => {
    if (!selected) return;
    if (selected.type === "directory") {
      void load(selected.path);
    } else {
      onOpenFile?.(selected.path, imagePattern.test(selected.name) ? "image" : "text");
    }
  };

  const selectFolderForPolygon = () => {
    if (!selected || selected.type !== "directory") return;
    window.dispatchEvent(new CustomEvent("utoolity:polygon-folder-selected", {
      detail: { path: selected.path, requester: folderPickerRequester },
    }));
    window.dispatchEvent(new Event("utoolity:close-file-manager"));
    setFolderPickerMode(false);
    setMenuOpen(false);
  };

  return (
    <main className="flex h-full min-h-0 bg-background text-foreground">
      <aside className="w-44 shrink-0 border-r border-border p-3">
        <h2 className="mb-3 text-lg font-bold">Files</h2>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-xl bg-accent px-3 py-2 text-left font-semibold"
          onClick={() => void load("server")}
        >
          <Folder className="size-4 text-primary" /> Server
        </button>
      </aside>

      <section
        className="min-w-0 flex-1 p-4"
        onClick={(event) => {
          if (event.target === event.currentTarget) void createFolder();
        }}
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{folderPickerMode ? "Select a folder for Polygon Studio" : "Server"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {path === "server" ? "Your uploaded files" : path}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              aria-label="Refresh folder"
              title="Refresh folder"
              className="flex size-9 items-center justify-center rounded-xl border border-border hover:bg-accent"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
        </header>

        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <div
              key={entry.path}
              className={`flex items-center gap-3 rounded-2xl border p-3 ${selected?.path === entry.path ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"}`}
              onDoubleClick={() => {
                setSelected(entry);
                if (entry.type === "directory") void load(entry.path);
                else onOpenFile?.(entry.path, imagePattern.test(entry.name) ? "image" : "text");
              }}
            >
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { setSelected(entry); setMenuOpen(true); }}>
                {entry.type === "directory" ? <Folder className="size-6 text-primary" /> : <File className="size-6 text-primary" />}
                <span className="min-w-0 truncate font-semibold">{entry.name}</span>
              </button>
              {entry.type === "file" && (
                <a href={`${API_URL}/api/storage/download?path=${encodeURIComponent(entry.path)}`} aria-label={`Download ${entry.name}`}>
                  <Download className="size-4" />
                </a>
              )}
              <button type="button" aria-label={`Actions for ${entry.name}`} onClick={() => { setSelected(entry); setMenuOpen(true); }} className="rounded-lg p-1 hover:bg-accent">
                <MoreHorizontal className="size-4" />
              </button>
            </div>
          ))}
          {entries.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground" onClick={() => setFolderDialogOpen(true)}>This folder is empty. Click the blank space to create a folder.</p>}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 text-sm">
          <div className="relative">
            <button
              type="button"
              onClick={() => (folderPickerMode ? folderInputRef.current : inputRef.current)?.click()}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
            >
              <Upload className="mr-1 inline size-4" /> Upload
            </button>
          </div>
          <input ref={inputRef} hidden type="file" multiple onChange={(event) => void upload(event.target.files)} />
          <input
            ref={folderInputRef}
            hidden
            type="file"
            multiple
            onChange={(event) => void upload(event.target.files)}
          />
          <div className="flex items-center gap-2">
          <button type="button" disabled={path === "server"} onClick={() => void load(path.split("/").slice(0, -1).join("/") || "server")} className="rounded-xl border border-border px-3 py-2 font-semibold disabled:opacity-40">Back</button>
          {selected && <span className="truncate text-muted-foreground">{selected.name}</span>}
          </div>
        </div>

        {folderDialogOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/50 p-4 backdrop-blur-sm">
            <form
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl"
              onSubmit={(event) => { event.preventDefault(); void createFolder(); }}
            >
              <h3 className="text-base font-bold">Create folder</h3>
              <input
                autoFocus
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Folder name"
                className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => { setFolderDialogOpen(false); setFolderName(""); }} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={!folderName.trim()} className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40">Create</button>
              </div>
            </form>
          </div>
        )}

        {menuOpen && selected && (
          <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3 shadow-lg">
            {folderPickerMode && selected.type === "directory" && <button type="button" onClick={selectFolderForPolygon} className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Use this folder</button>}
            <button type="button" onClick={openSelected} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">Open</button>
            <button type="button" onClick={() => void renameSelected()} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold"><Pencil className="mr-1 inline size-4" />Rename</button>
            <button type="button" onClick={() => void deleteSelected()} className="rounded-xl border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive"><Trash2 className="mr-1 inline size-4" />Delete</button>
            <button type="button" onClick={() => void showShare()} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold"><Share2 className="mr-1 inline size-4" />Share</button>
          </div>
        )}

        {shareOpen && (
          <div className="mt-3 rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold">Share with users</h3>
              <button type="button" onClick={() => setShareOpen(false)} className="text-sm text-muted-foreground">Close</button>
            </div>
            {users.length ? <ul className="space-y-2">{users.map((user) => <li key={user.id} className="rounded-xl bg-muted px-3 py-2 text-sm font-semibold">{user.displayName}</li>)}</ul> : <p className="text-sm text-muted-foreground">No users present.</p>}
          </div>
        )}
      </section>
    </main>
  );
}
