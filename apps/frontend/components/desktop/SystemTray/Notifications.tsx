
"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

type Props = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
};

export default function Notifications({
  open,
  onToggle,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    const timer = window.setTimeout(() => setMounted(false), 180);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/75 text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95 ${
          open ? "bg-accent text-accent-foreground" : ""
        }`}
      >
        <Bell size={18} strokeWidth={1.9} />

        <span
          aria-hidden="true"
          className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-background"
        />
      </button>

      {mounted && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close notifications"
            onClick={onClose}
            className={`fixed inset-0 z-[85] cursor-default bg-transparent transition-opacity duration-150 ${
              open ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />

          <section
            role="dialog"
            aria-label="Notifications"
            aria-hidden={!open}
            className={`absolute right-0 top-[calc(100%+12px)] z-[86] w-[min(350px,calc(100vw-24px))] origin-top-right overflow-hidden rounded-3xl border border-border/80 bg-popover p-4 text-popover-foreground shadow-2xl shadow-black/20 transition-[opacity,transform] duration-200 ease-out sm:p-5 ${
              open
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
            }`}
          >
            <header className="flex min-h-7 items-center justify-between gap-3">
              <h2 className="text-base font-bold leading-6 tracking-tight">
                Notifications
              </h2>

              <button
                type="button"
                onClick={onClose}
                tabIndex={open ? 0 : -1}
                aria-label="Close notifications"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <X size={17} strokeWidth={1.8} />
              </button>
            </header>

            <div className="mt-3 flex min-h-11 items-center justify-center rounded-2xl bg-muted px-4 py-3">
              <p className="text-sm font-medium leading-5 text-muted-foreground">
                You are all caught up.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
