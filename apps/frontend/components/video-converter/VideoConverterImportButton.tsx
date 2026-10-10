"use client";

import { FolderOpen } from "lucide-react";

export default function VideoConverterImportButton() {
  const requestFolder = () => {
    window.dispatchEvent(
      new CustomEvent("utoolity:polygon-folder-request", {
        detail: { requester: "video-converter" },
      }),
    );
  };

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={requestFolder}
        title="Import videos from Files"
        aria-label="Import videos from Files"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 text-sm font-medium text-foreground shadow-sm backdrop-blur transition hover:bg-accent hover:text-accent-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        <FolderOpen className="h-4 w-4" />
        Import from Files
      </button>
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        Import videos from Files
      </span>
    </div>
  );
}
