"use client";

import { useState } from "react";
import { AppWindow, Check, Maximize2, Minus, X } from "lucide-react";

export type WindowSummary = {
  key: string;
  title: string;
  active: boolean;
  minimized: boolean;
  maximized: boolean;
};
type Props = {
  windows: WindowSummary[];
  onFocus: (key: string) => void;
  onClose: (key: string) => void;
};

export default function AllWindows({ windows, onFocus, onClose }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="All windows (Alt + A)"
        aria-label="All windows"
        aria-expanded={open}
        className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/75 text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
      >
        <AppWindow size={17} strokeWidth={1.9} />
        {windows.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {windows.length}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Open windows"
          className="absolute right-0 top-11 z-[90] w-[min(320px,calc(100vw-24px))] rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl"
        >
          <header className="flex items-center justify-between px-2 py-1.5">
            <h2 className="text-sm font-semibold">Open windows</h2>
            <span className="text-xs text-muted-foreground">
              {windows.length} {windows.length === 1 ? "app" : "apps"}
            </span>
          </header>

          {windows.length === 0 ? (
            <p className="px-2 py-5 text-center text-sm text-muted-foreground">
              No open apps.
            </p>
          ) : (
            <ul className="space-y-1">
              {windows.map((window) => (
                <li key={window.key} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onFocus(window.key);
                      setOpen(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-accent"
                  >
                    {window.minimized ? (
                      <Minus size={14} className="shrink-0 text-muted-foreground" />
                    ) : window.maximized ? (
                      <Maximize2 size={14} className="shrink-0 text-primary" />
                    ) : window.active ? (
                      <Check size={14} className="shrink-0 text-primary" />
                    ) : (
                      <AppWindow size={14} className="shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{window.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {window.minimized ? "Minimized" : window.maximized ? "Full" : window.active ? "Active" : "Open"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onClose(window.key)}
                    aria-label={`Close ${window.title}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}