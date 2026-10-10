"use client";

type Props = {
  imageName?: string;
  polygonCount: number;
  onExport: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canNavigate: boolean;
};

export default function BoundingBoxStudioHeader({
  imageName,
  polygonCount,
  onExport,
  onPrevious,
  onNext,
  canNavigate,
}: Props) {
  return (
    <header className="z-40 flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card/90 px-3 py-1.5 shadow-sm backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 max-w-full items-center gap-2 sm:gap-3">
        <span className="shrink-0 font-semibold tracking-tight">Bounding Box Studio</span>
        <span className="text-muted-foreground">/</span>
        <button type="button" onClick={onPrevious} disabled={!canNavigate} aria-label="Previous image" className="rounded-full border border-border px-2 py-0.5 text-sm disabled:opacity-40">←</button>
        <span
          className="max-w-[min(18rem,45vw)] truncate text-xs text-muted-foreground"
          title={imageName ?? "No image loaded"}
        >
          {imageName ?? "No image loaded"}
        </span>
        <button type="button" onClick={onNext} disabled={!canNavigate} aria-label="Next image" className="rounded-full border border-border px-2 py-0.5 text-sm disabled:opacity-40">→</button>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden text-xs text-muted-foreground md:inline">
          {polygonCount} polygon{polygonCount !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={onExport}
          disabled={!polygonCount}
          className="rounded-full border border-primary bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
        >
          Export
        </button>
      </div>
    </header>
  );
}
