"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  Check,
  ChevronRight,
  Download,
  File,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, API_URL } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/shadcn/dialog";

type Entry = {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
};

type SharedUser = {
  id: string;
  displayName: string;
  hostname: string;
};

type StorageUsage = {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
};

type Props = {
  onOpenFile?: (path: string, type: "image" | "text") => void;
};

const imagePattern = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;
const textPattern =
  /\.(txt|md|json|csv|xml|yaml|yml|log|ts|tsx|js|jsx|py|html|css)$/i;

const formatSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB", "PB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
};

const isImage = (name: string) => imagePattern.test(name);

export default function FileManager({ onOpenFile }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [path, setPath] = useState("server");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [users, setUsers] = useState<SharedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderPickerMode, setFolderPickerMode] = useState(false);
  const [folderPickerRequester, setFolderPickerRequester] = useState<
    string | null
  >(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (nextPath = path) => {
      setLoading(true);
      setError(null);

      try {
        const result = await api<{ entries: Entry[] }>(
          `/api/storage/list?path=${encodeURIComponent(nextPath)}`,
        );

        const sorted = [...(result.entries ?? [])].sort((a, b) =>
          a.type === b.type
            ? a.name.localeCompare(b.name)
            : a.type === "directory"
              ? -1
              : 1,
        );

        setEntries(sorted);

        // Storage information is optional and must not block file browsing.
        void api<StorageUsage>("/api/storage/usage")
          .then((usage) => {
            if (
              Number.isFinite(usage.totalBytes) &&
              Number.isFinite(usage.usedBytes) &&
              Number.isFinite(usage.availableBytes) &&
              usage.totalBytes >= 0 &&
              usage.usedBytes >= 0 &&
              usage.availableBytes >= 0
            ) {
              setStorageUsage(usage);
            }
          })
          .catch(() => undefined);

        setPath(nextPath);
        localStorage.setItem("utoolity.files.path", nextPath);
        setSelected(null);
        setMenuOpen(false);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load files.";

        // File Manager reports the storage operation's actual error. Desktop
        // authentication is owned by the shell, not by individual applications.
        setError(message);

        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    const requester = localStorage.getItem("utoolity.files.folder-picker");

    if (requester) {
      setFolderPickerMode(true);
      setFolderPickerRequester(requester);
      localStorage.removeItem("utoolity.files.folder-picker");
      void load("server");
    } else {
      void load("server");
    }

    // Initial hydration only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    const openPicker = (event: Event) => {
      const requester = (event as CustomEvent<{ requester?: string }>).detail
        ?.requester;

      if (!requester) return;

      setFolderPickerMode(true);
      setFolderPickerRequester(requester);
      setSelected(null);
      setMenuOpen(false);
      setQuery("");
      void load("server");
    };

    window.addEventListener("utoolity:polygon-folder-request", openPicker);

    return () =>
      window.removeEventListener("utoolity:polygon-folder-request", openPicker);
  }, [load]);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return normalized
      ? entries.filter((entry) => entry.name.toLowerCase().includes(normalized))
      : entries;
  }, [entries, query]);

  const withBusy = async (task: () => Promise<void>) => {
    setBusy(true);
    window.dispatchEvent(new Event("utoolity:work-started"));

    try {
      await task();
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event("utoolity:work-finished"));
    }
  };

  const createFolder = async () => {
    const name = folderName.trim();

    if (
      !name ||
      name === "." ||
      name === ".." ||
      name.includes("/") ||
      name.includes("\\")
    ) {
      setError("Enter a valid folder name without path separators.");
      return;
    }

    await withBusy(async () => {
      try {
        await api("/api/storage/mkdir", {
          method: "POST",
          body: JSON.stringify({ path: `${path}/${name}` }),
        });

        setFolderDialogOpen(false);
        setFolderName("");
        await load(path);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to create folder.",
        );
      }
    });
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;

    await withBusy(async () => {
      const form = new FormData();
      const selectedFiles = Array.from(files);

      const relativePaths = selectedFiles.map(
        (file) =>
          (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
          file.name,
      );

      const folderRoot = relativePaths
        .map((value) => value.split("/")[0])
        .find(
          (root) =>
            root && relativePaths.some((value) => value.startsWith(`${root}/`)),
        );

      form.append("relativePaths", JSON.stringify(relativePaths));

      if (folderRoot) {
        form.append("rootFolder", folderRoot);
      }

      selectedFiles.forEach((file, index) => {
        form.append("files", file, relativePaths[index]);
      });

      form.append("path", path);

      try {
        await api("/api/storage/upload", {
          method: "POST",
          body: form,
        });

        await load(path);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to upload files.",
        );
      } finally {
        if (inputRef.current) inputRef.current.value = "";
        if (folderInputRef.current) folderInputRef.current.value = "";
      }
    });
  };

  const renameSelected = async () => {
    if (!selected) return;
    const name = renameName.trim();
    if (
      !name ||
      name === selected.name ||
      name === "." ||
      name === ".." ||
      name.includes("/") ||
      name.includes("\\")
    ) {
      setError("Enter a different valid name without path separators.");
      return;
    }
    await withBusy(async () => {
      try {
        await api("/api/storage/rename", {
          method: "POST",
          body: JSON.stringify({ path: selected.path, name }),
        });
        setRenameDialogOpen(false);
        await load(path);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to rename.");
      }
    });
  };

  const deleteSelected = async () => {
    if (selected) setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    await withBusy(async () => {
      try {
        await api("/api/storage/delete", {
          method: "POST",
          body: JSON.stringify({ path: selected.path }),
        });
        setDeleteDialogOpen(false);
        await load(path);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to delete.");
      }
    });
  };

  const showShare = async () => {
    setShareOpen(true);
    setMenuOpen(false);

    try {
      const result = await api<{ users: SharedUser[] }>("/api/storage/users");
      setUsers(result.users ?? []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load users.",
      );
    }
  };

  const openEntry = (entry: Entry) => {
    setSelected(entry);
    setMenuOpen(false);

    if (entry.type === "directory") {
      setQuery("");
      void load(entry.path);
    } else if (isImage(entry.name) || textPattern.test(entry.name)) {
      onOpenFile?.(entry.path, isImage(entry.name) ? "image" : "text");
    } else {
      window.open(
        `${API_URL}/api/storage/download?path=${encodeURIComponent(entry.path)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  const selectFolderForPolygon = () => {
    if (!selected || selected.type !== "directory") return;

    window.dispatchEvent(
      new CustomEvent("utoolity:polygon-folder-selected", {
        detail: {
          path: selected.path,
          requester: folderPickerRequester,
        },
      }),
    );

    window.dispatchEvent(new Event("utoolity:close-file-manager"));
    setFolderPickerMode(false);
    setMenuOpen(false);
  };

  const parentPath =
    path === "server"
      ? "server"
      : path.split("/").slice(0, -1).join("/") || "server";

  const breadcrumbs = path
    .split("/")
    .filter((part) => part && part !== "server");

  const storagePercent =
    storageUsage && storageUsage.totalBytes > 0
      ? Math.min(
          100,
          Math.max(0, (storageUsage.usedBytes / storageUsage.totalBytes) * 100),
        )
      : 0;

  return (
    <main className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Folder className="size-5" />
          </span>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">
              {folderPickerMode ? "Choose a folder" : "File Manager"}
            </h2>

            <p className="text-xs text-muted-foreground">
              {folderPickerMode
                ? "Select a folder to use in Polygon Studio"
                : `${entries.length} items`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFolderDialogOpen(true)}
            disabled={busy}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-accent disabled:opacity-50"
          >
            <FolderPlus className="size-4" />
            <span className="hidden sm:inline">New folder</span>
          </button>

          <button
            type="button"
            onClick={() => void load(path)}
            aria-label="Refresh"
            title="Refresh"
            disabled={loading}
            className="flex size-9 items-center justify-center rounded-xl border border-border hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <input
          ref={inputRef}
          hidden
          type="file"
          multiple
          onChange={(event) => void upload(event.target.files)}
        />

        <input
          ref={folderInputRef}
          hidden
          type="file"
          multiple
          onChange={(event) => void upload(event.target.files)}
        />
      </header>

      <div className="flex shrink-0 items-center gap-1 border-b border-border px-5 py-3 text-sm">
        <button
          type="button"
          onClick={() => void load("server")}
          className="rounded-lg px-2 py-1 font-semibold hover:bg-accent"
        >
          Folder
        </button>

        {breadcrumbs
          .filter((part) => part !== "server")
          .map((part, index, parts) => {
            const target = ["server", ...parts.slice(0, index + 1)].join("/");

            return (
              <span key={target} className="flex min-w-0 items-center gap-1">
                <ChevronRight className="size-3 shrink-0 text-muted-foreground" />

                <button
                  type="button"
                  onClick={() => void load(target)}
                  className="max-w-44 truncate rounded-lg px-2 py-1 hover:bg-accent"
                >
                  {part}
                </button>
              </span>
            );
          })}

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <div className="relative w-44 max-w-[45vw] sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this folder"
              aria-label="Search files"
              className="h-9 w-full rounded-xl border border-border bg-muted/50 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span className="min-w-0 flex-1">{error}</span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Server storage usage: visible summary with a hover detail panel. */}
      {storageUsage && (
        <div className="group absolute inset-x-5 bottom-[4.15rem] z-20">
          <div className="mb-1 flex items-center justify-between gap-3 text-[10px] leading-none">
            <span className="truncate text-muted-foreground">
              Server storage{" "}
              <span className="font-medium text-foreground">
                {formatSize(storageUsage.usedBytes)}
              </span>
              {" / "}
              {formatSize(storageUsage.totalBytes)}
            </span>

            <span className="shrink-0 tabular-nums text-muted-foreground">
              {Math.round(storagePercent)}%
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Server storage used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(storagePercent)}
            className="relative h-0.5 w-full overflow-visible rounded-full bg-border/70"
          >
            <div
              className="relative h-full min-w-0.5 rounded-full bg-primary shadow-[0_0_5px_hsl(var(--primary)/0.7)] transition-[width] duration-500 ease-out motion-reduce:transition-none after:absolute after:-right-0.5 after:top-1/2 after:size-1.25 after:-translate-y-1/2 after:rounded-full after:bg-primary after:shadow-[0_0_5px_2px_hsl(var(--primary)/0.75)] after:content-[''] after:animate-pulse motion-reduce:after:animate-none"
              style={{ width: `${storagePercent}%` }}
            />
          </div>

          <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden min-w-52 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl group-hover:block group-focus-within:block">
            <p className="font-semibold">Server storage</p>

            <div className="mt-2 flex justify-between gap-4">
              <span className="text-muted-foreground">Used</span>
              <span className="tabular-nums">
                {formatSize(storageUsage.usedBytes)}
              </span>
            </div>

            <div className="mt-1 flex justify-between gap-4">
              <span className="text-muted-foreground">Available</span>
              <span className="tabular-nums">
                {formatSize(storageUsage.availableBytes)}
              </span>
            </div>

            <div className="mt-1 flex justify-between gap-4">
              <span className="text-muted-foreground">Total</span>
              <span className="tabular-nums">
                {formatSize(storageUsage.totalBytes)}
              </span>
            </div>
          </div>
        </div>
      )}

      <section className="min-h-0 flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-2xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : visibleEntries.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {visibleEntries.map((entry) => {
              const active = selected?.path === entry.path;
              const directory = entry.type === "directory";
              const image = !directory && isImage(entry.name);

              return (
                <article
                  key={entry.path}
                  onClick={() => {
                    setSelected(entry);
                    setMenuOpen(false);
                  }}
                  onDoubleClick={() => openEntry(entry)}
                  className={`group relative min-w-0 overflow-visible rounded-2xl border text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                      : "border-border bg-card hover:border-foreground/20 hover:bg-muted/50"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`Open ${entry.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected(entry);
                      setMenuOpen(false);
                    }}
                    className="block w-full text-left"
                  >
                    <div
                      className={`flex h-28 items-center justify-center ${
                        directory ? "bg-amber-500/8" : "bg-muted/40"
                      }`}
                    >
                      {directory ? (
                        <Folder
                          className="size-14 fill-amber-400/20 text-amber-400"
                          strokeWidth={1.4}
                        />
                      ) : image ? (
                        <ImageIcon
                          className="size-12 text-emerald-500"
                          strokeWidth={1.3}
                        />
                      ) : textPattern.test(entry.name) ? (
                        <FileText
                          className="size-12 text-sky-500"
                          strokeWidth={1.3}
                        />
                      ) : (
                        <File
                          className="size-12 text-muted-foreground"
                          strokeWidth={1.3}
                        />
                      )}
                    </div>

                    <div className="min-w-0 px-3 pb-3 pt-2">
                      <p
                        className="truncate text-sm font-semibold"
                        title={entry.name}
                      >
                        {entry.name}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {directory
                          ? "Folder"
                          : formatSize(entry.size) || "File"}
                      </p>
                    </div>
                  </button>

                  <div
                    className="absolute right-2 top-2"
                    ref={active && menuOpen ? menuRef : undefined}
                  >
                    <button
                      type="button"
                      aria-label={`More actions for ${entry.name}`}
                      aria-expanded={active && menuOpen}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(entry);
                        setMenuOpen((open) => (active ? !open : true));
                      }}
                      className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/90 opacity-100 shadow-sm backdrop-blur hover:bg-accent sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>

                    {active && menuOpen && (
                      <div className="absolute right-0 top-9 z-9999 w-48 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
                        {folderPickerMode && directory && (
                          <button
                            type="button"
                            onClick={selectFolderForPolygon}
                            className="flex w-full items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary/15"
                          >
                            <Check className="size-4" />
                            Use this folder
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEntry(entry)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <ArrowRight className="size-4" />
                          {directory ? "Open folder" : "Open file"}
                        </button>

                        {!directory && (
                          <a
                            href={`${API_URL}/api/storage/download?path=${encodeURIComponent(entry.path)}`}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                          >
                            <Download className="size-4" />
                            Download
                          </a>
                        )}

                        {!directory &&
                          entry.name.toLowerCase().endsWith(".zip") && (
                            <button
                              type="button"
                              onClick={() =>
                                void withBusy(async () => {
                                  try {
                                    await api("/api/storage/extract", {
                                      method: "POST",
                                      body: JSON.stringify({
                                        path: `${path}/${entry.name}`,
                                      }),
                                    });

                                    await load(path);
                                    setMenuOpen(false);
                                  } catch (cause) {
                                    setError(
                                      cause instanceof Error
                                        ? cause.message
                                        : "Unable to extract archive.",
                                    );
                                  }
                                })
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                            >
                              <Archive className="size-4" />
                              Extract here
                            </button>
                          )}

                        <button
                          type="button"
                          onClick={() => {
                            setRenameName(selected?.name ?? "");
                            setRenameDialogOpen(true);
                            setMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <Pencil className="size-4" />
                          Rename
                        </button>

                        <button
                          type="button"
                          onClick={() => void showShare()}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <Share2 className="size-4" />
                          Share
                        </button>

                        <div className="my-1 border-t border-border" />

                        <button
                          type="button"
                          onClick={() => void deleteSelected()}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFolderDialogOpen(true)}
            className="flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-5 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
          >
            <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FolderPlus className="size-7" />
            </span>

            <span className="font-semibold">
              {query ? "No matching items" : "This folder is empty"}
            </span>

            <span className="mt-1 text-sm text-muted-foreground">
              {query
                ? "Try another search."
                : "Create a folder or upload files to get started."}
            </span>
          </button>
        )}
      </section>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>
          {visibleEntries.length}{" "}
          {visibleEntries.length === 1 ? "item" : "items"}
          {selected ? ` · ${selected.name} selected` : ""}
        </span>

        <div className="flex items-center gap-2">
          {folderPickerMode && (
            <button
              type="button"
              disabled={!selected || selected.type !== "directory"}
              onClick={selectFolderForPolygon}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              <Check className="size-4" />
              Select folder
            </button>
          )}

          <button
            type="button"
            disabled={path === "server" || loading}
            onClick={() => void load(parentPath)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-40"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>
      </footer>

      <div className="absolute bottom-6 right-6 z-40">
        {plusMenuOpen && (
          <div className="absolute bottom-16 right-0 w-48 rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                inputRef.current?.click();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
            >
              <Upload className="size-4" />
              Upload files
            </button>

            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                folderInputRef.current?.click();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
            >
              <Folder className="size-4" />
              Upload folder
            </button>

            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                setFolderDialogOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
            >
              <FolderPlus className="size-4" />
              New folder
            </button>
          </div>
        )}

        <button
          type="button"
          aria-label="Add files or folders"
          title="Add files or folders"
          disabled={busy}
          onClick={() => setPlusMenuOpen((open) => !open)}
          className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-background/80 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {plusMenuOpen ? (
            <X className="size-6" />
          ) : (
            <Plus className="size-6" />
          )}
        </button>
      </div>

      {folderDialogOpen && (
        <div
          className="fixed inset-0 z-90 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setFolderDialogOpen(false);
              setFolderName("");
            }
          }}
        >
          <form
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              void createFolder();
            }}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FolderPlus className="size-5" />
              </span>

              <div>
                <h3 className="font-bold">Create folder</h3>
                <p className="text-xs text-muted-foreground">
                  In {path.split("/").at(-1) || "Folder"}
                </p>
              </div>
            </div>

            <input
              autoFocus
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Folder name"
              maxLength={120}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setFolderDialogOpen(false);
                  setFolderName("");
                }}
                className="rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-accent"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!folderName.trim() || busy}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
              >
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename item</DialogTitle>
            <DialogDescription>
              Enter a new name. Path separators are not allowed.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void renameSelected();
            }}
            className="space-y-4"
          >
            <input
              autoFocus
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              maxLength={180}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <DialogFooter>
              <button
                type="button"
                onClick={() => setRenameDialogOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameName.trim() || busy}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                Rename
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selected?.type === "directory" ? "folder" : "file"}?
            </DialogTitle>
            <DialogDescription>
              Delete “{selected?.name}”?{" "}
              {selected?.type === "directory"
                ? "Everything inside this folder will also be deleted."
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={busy}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {shareOpen && (
        <div
          className="fixed inset-0 z-90 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShareOpen(false);
            }
          }}
        >
          <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold">Share with users</h3>
                <p className="text-xs text-muted-foreground">
                  Available workspace users
                </p>
              </div>

              <button
                type="button"
                aria-label="Close share dialog"
                onClick={() => setShareOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>

            {users.length ? (
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {users.map((user) => (
                  <li key={user.id} className="rounded-xl bg-muted px-3 py-2">
                    <p className="text-sm font-semibold">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.hostname}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                No other users are available.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
