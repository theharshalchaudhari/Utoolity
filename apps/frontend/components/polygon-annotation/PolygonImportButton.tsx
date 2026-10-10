"use client";

export default function PolygonImportButton() {
  const requestFolder = () => {
    window.dispatchEvent(new CustomEvent("utoolity:polygon-folder-request", {
      detail: { requester: "polygon-annotation" },
    }));
  };

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={requestFolder}
        title="Import Folder from Files"
        className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-95"
      >
        <span className="text-lg leading-none">+</span>
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        Import Folder from Files
      </span>
    </div>
  );
}
