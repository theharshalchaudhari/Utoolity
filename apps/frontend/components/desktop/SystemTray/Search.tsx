"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AppWindow,
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  Search as SearchIcon,
  X,
} from "lucide-react";

export type SearchItem = {
  id: string;
  name: string;
  category: string;
  path: string;
  keywords?: string[];
  icon?: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
};

type Props = {
  items: SearchItem[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
};

export default function Search({
  items,
  open,
  onToggle,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const results = items.filter((item) =>
    [
      item.name,
      item.category,
      ...(item.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  const close = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    onClose();
  }, [onClose]);

  const openSearch = useCallback(() => {
    onToggle();
  }, [onToggle]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        openSearch();
      }

      if (event.altKey && event.key.toLowerCase() === "a") {
        // All Windows is handled by the parent.
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [openSearch]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    const frame = requestAnimationFrame(() => inputRef.current?.focus());

    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
    resultRefs.current = [];
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function handleKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }

      if (event.key === "ArrowDown" && results.length > 0) {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % results.length);
      }

      if (event.key === "ArrowUp" && results.length > 0) {
        event.preventDefault();
        setActiveIndex(
          (index) => (index - 1 + results.length) % results.length,
        );
      }

      if (event.key === "Enter" && results.length > 0) {
        event.preventDefault();
        const item = results[activeIndex];

        if (item) {
          close();
          window.location.assign(item.path);
        }
      }
    }

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [open, results, activeIndex, close]);

  useEffect(() => {
    if (open) {
      resultRefs.current[activeIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIndex, open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title="Search (Ctrl + K)"
        aria-label="Search"
        className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-background/75 text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
      >
        <SearchIcon size={17} strokeWidth={1.9} />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close search"
        onClick={close}
        className="fixed inset-0 z-[90] cursor-default bg-background/25 backdrop-blur-md"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Search applications"
        className="fixed left-1/2 top-[12vh] z-[91] flex max-h-[min(510px,76dvh)] w-[min(550px,calc(100vw-28px))] -translate-x-1/2 flex-col overflow-hidden rounded-[24px] border border-border/80 bg-popover text-popover-foreground shadow-2xl shadow-black/25 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
          <SearchIcon
            size={18}
            className="shrink-0 text-muted-foreground"
          />

          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search apps, tools, projects..."
            aria-label="Search apps and tools"
            className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />

          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Esc
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {results.length > 0 ? (
            <>
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Results
              </p>

              {results.map((item, index) => {
                const Icon = item.icon ?? AppWindow;
                const active = index === activeIndex;

                return (
                  <button
                    key={item.id}
                    ref={(node) => {
                      resultRefs.current[index] = node;
                    }}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      close();
                      window.location.assign(item.path);
                    }}
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left transition-colors ${
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-popover-foreground hover:bg-accent/60"
                    }`}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon size={17} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold leading-5">
                        {item.name}
                      </span>

                      <span className="block truncate text-[11px] leading-4 text-muted-foreground">
                        {item.category}
                      </span>
                    </span>

                    {active && (
                      <CornerDownLeft
                        size={14}
                        className="shrink-0 text-muted-foreground"
                      />
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 px-4 text-center">
              <SearchIcon
                size={22}
                className="text-muted-foreground/60"
              />
              <p className="text-sm font-semibold">No results found</p>
              <p className="text-xs text-muted-foreground">
                Try a different app or keyword.
              </p>
            </div>
          )}
        </div>

        <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border px-3 text-[10px] font-medium text-muted-foreground">
          <span>Use arrow keys to navigate</span>

          <span className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <ArrowUp size={11} />
              <ArrowDown size={11} />
            </span>
            <span>Navigate</span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft size={11} />
              Open
            </span>
          </span>
        </footer>
      </section>
    </>
  );
}