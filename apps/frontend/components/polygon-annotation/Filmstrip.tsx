"use client";

/**
 * The batch navigator: every image, its state, and where you are.
 *
 * A batch can run to thousands of images, so this is a plain scrolling list of
 * names and status dots rather than thumbnails — decoding every image to show
 * a strip would cost far more than it is worth.
 */

import { useEffect, useRef } from "react";

import type { RowsByImage } from "@/types/roi";

export interface FilmstripProps {
  names: string[];
  index: number;
  rows: RowsByImage;
  onSelect: (index: number) => void;
}

function stateOf(rows: RowsByImage, name: string): {
  label: string;
  dot: string;
} {
  const row = rows[name];
  if (row?.row_type === "roi" && row.total_polygons > 0) {
    return { label: `${row.total_polygons} ROI`, dot: "bg-primary" };
  }
  if (row?.row_type === "no_roi") return { label: "no ROI", dot: "bg-chart-2" };
  return { label: "", dot: "bg-muted-foreground/30" };
}

export default function Filmstrip({ names, index, rows, onSelect }: FilmstripProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // keep the current image in view when moving with the keyboard
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  return (
    <section className="border-border bg-card flex min-h-0 flex-col rounded-lg border">
      <header className="border-border border-b p-3">
        <h3 className="text-foreground text-sm font-semibold">
          Images{" "}
          <span className="text-muted-foreground font-normal">
            ({names.length ? index + 1 : 0}/{names.length})
          </span>
        </h3>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {names.map((name, i) => {
          const { label, dot } = stateOf(rows, name);
          const isCurrent = i === index;
          return (
            <li key={name}>
              <button
                ref={isCurrent ? activeRef : undefined}
                type="button"
                aria-current={isCurrent}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                  isCurrent ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
                onClick={() => onSelect(i)}
              >
                <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{name}</span>
                {label && <span className="text-muted-foreground shrink-0">{label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
