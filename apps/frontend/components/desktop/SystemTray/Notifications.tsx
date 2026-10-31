"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  X,
  ShieldAlert,
  AppWindow,
  AlertTriangle,
  CheckCheck,
} from "lucide-react";

type Notice = {
  id: string;
  title: string;
  message: string;
  type: "system" | "app" | "error";
  createdAt: number;
  issue?: { appName?: string; errorName?: string; details?: string };
};

const NOTIFICATION_STORAGE_KEY = "utoolity.notifications";
const CLEARED_NOTIFICATION_IDS_KEY = "utoolity.cleared-notification-ids";

type Props = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
};

export default function Notifications({ open, onToggle, onClose }: Props) {
  const [mounted, setMounted] = useState(open);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [filter, setFilter] = useState<"all" | "system" | "app" | "error">(
    "all",
  );
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());
  const clearedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const persist = (items: Notice[]) => {
      try {
        window.sessionStorage.setItem(
          NOTIFICATION_STORAGE_KEY,
          JSON.stringify(items.slice(0, 100)),
        );
      } catch {
        // Notifications remain usable for this mount if session storage is unavailable.
      }
    };
    let cleared = new Set<string>();
    try {
      const savedCleared = JSON.parse(
        window.sessionStorage.getItem(CLEARED_NOTIFICATION_IDS_KEY) || "[]",
      ) as unknown;
      if (Array.isArray(savedCleared))
        cleared = new Set(
          savedCleared.filter((id): id is string => typeof id === "string"),
        );
      clearedIdsRef.current = cleared;
      setClearedIds(cleared);
      const saved = window.sessionStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Notice[];
        if (Array.isArray(parsed))
          setNotices(
            parsed
              .filter(
                (item) =>
                  item &&
                  typeof item.id === "string" &&
                  typeof item.message === "string" &&
                  !cleared.has(item.id),
              )
              .slice(0, 100),
          );
      }
    } catch {
      window.sessionStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    }
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<Partial<Notice>>).detail;
      if (!detail || !detail.message) return;
      if (clearedIdsRef.current.has(detail.id ?? "")) return;
      const type =
        detail.type === "system" || detail.type === "error"
          ? detail.type
          : "app";
      const notice: Notice = {
        id: detail.id ?? `${Date.now()}-${Math.random()}`,
        title:
          detail.title ??
          (type === "system"
            ? "System"
            : type === "error"
              ? "Error"
              : "App notification"),
        message: detail.message,
        type,
        createdAt: detail.createdAt ?? Date.now(),
        // Preserve the issue payload so clicking this notification can reopen
        // the report dialog with the original error details.
        issue:
          detail.issue && typeof detail.issue === "object"
            ? detail.issue
            : undefined,
      };
      setNotices((current) => {
        if (current.some((item) => item.id === notice.id)) return current;
        const updated = [notice, ...current].slice(0, 100);
        setHasNewNotification(true);
        persist(updated);
        return updated;
      });
      if (type === "system")
        window.dispatchEvent(
          new CustomEvent("utoolity:system-notification-focus", {
            detail: notice,
          }),
        );
    };
    window.addEventListener("utoolity:notification", receive);
    return () => window.removeEventListener("utoolity:notification", receive);
  }, []);

  const visibleNotices = notices.filter(
    (notice) => filter === "all" || notice.type === filter,
  );

  useEffect(() => {
    if (open) {
      setMounted(true);
      setHasNewNotification(false);
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

        {notices.length > 0 && (
          <span
            aria-label={`${notices.length} notifications`}
            className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-muted px-1 py-0.5 text-[9px] font-bold leading-none text-foreground ring-2 ring-background"
          >
            {notices.length > 99 ? "99+" : notices.length}
          </span>
        )}
        {hasNewNotification && !open && (
          <span
            aria-label="New notification"
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background"
          />
        )}
      </button>

      {mounted && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close notifications"
            onClick={onClose}
            className={`fixed inset-0 z-85 cursor-default bg-transparent transition-opacity duration-150 ${
              open ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />

          <section
            role="dialog"
            aria-label="Notifications"
            aria-hidden={!open}
            className={`absolute right-0 top-[calc(100%+12px)] z-86 w-[min(350px,calc(100vw-24px))] origin-top-right overflow-hidden rounded-3xl border border-border/80 bg-popover p-4 text-popover-foreground shadow-lg shadow-black/10 transition-[opacity,transform] duration-150 ease-out will-change-transform desktop-panel sm:p-5 ${
              open
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
            }`}
          >
            <header className="flex min-h-7 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="text-base font-bold leading-6 tracking-tight">
                  Notifications
                </h2>
                <span
                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground"
                  aria-label={`${notices.length} notifications`}
                >
                  {notices.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {notices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const ids = notices.map((notice) => notice.id);
                      const nextCleared = new Set([...clearedIds, ...ids]);
                      clearedIdsRef.current = nextCleared;
                      setClearedIds(nextCleared);
                      setNotices([]);
                      try {
                        window.sessionStorage.setItem(
                          CLEARED_NOTIFICATION_IDS_KEY,
                          JSON.stringify([...nextCleared].slice(-500)),
                        );
                        window.sessionStorage.setItem(
                          NOTIFICATION_STORAGE_KEY,
                          "[]",
                        );
                      } catch {
                        // Clear the current view even if storage is unavailable.
                      }
                    }}
                    tabIndex={open ? 0 : -1}
                    className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    title="Clear all notifications"
                  >
                    <CheckCheck size={14} />
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  tabIndex={open ? 0 : -1}
                  aria-label="Close notifications"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <X size={17} strokeWidth={1.8} />
                </button>
              </div>
            </header>

            {visibleNotices.length === 0 ? (
              <div className="mt-3 flex min-h-11 items-center justify-center rounded-2xl bg-muted px-4 py-3">
                <p className="text-sm font-medium leading-5 text-muted-foreground">
                  You are all caught up.
                </p>
              </div>
            ) : (
              <div className="mt-3 max-h-[min(60vh,420px)] space-y-2 overflow-y-auto">
                {visibleNotices.map((notice) => (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => {
                      // Opening a notification consumes it. Persist the removal
                      // and tombstone its ID so refreshes or repeated events do
                      // not bring it back.
                      const nextCleared = new Set(clearedIdsRef.current);
                      nextCleared.add(notice.id);
                      clearedIdsRef.current = nextCleared;
                      setClearedIds(nextCleared);
                      setNotices((current) => {
                        const updated = current.filter(
                          (item) => item.id !== notice.id,
                        );
                        try {
                          window.sessionStorage.setItem(
                            NOTIFICATION_STORAGE_KEY,
                            JSON.stringify(updated),
                          );
                          window.sessionStorage.setItem(
                            CLEARED_NOTIFICATION_IDS_KEY,
                            JSON.stringify([...nextCleared].slice(-500)),
                          );
                        } catch {
                          // Removal still applies to the current session state.
                        }
                        return updated;
                      });
                      onClose();
                      if (notice.issue) {
                        window.setTimeout(() => {
                          window.dispatchEvent(
                            new CustomEvent("utoolity:reopen-issue", {
                              detail: notice.issue,
                            }),
                          );
                        }, 160);
                      }
                    }}
                    className="block w-full rounded-2xl border border-border/70 bg-background/70 p-3 text-left transition-colors hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={
                      notice.issue
                        ? `Reopen issue report: ${notice.title}`
                        : notice.title
                    }
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${notice.type === "error" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
                      >
                        {notice.type === "error" ? (
                          <AlertTriangle size={15} />
                        ) : notice.type === "system" ? (
                          <ShieldAlert size={15} />
                        ) : (
                          <AppWindow size={15} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold">
                          {notice.title}
                        </h3>
                        <p className="mt-1 whitespace-pre-wrap wrap-break-word text-xs leading-5 text-muted-foreground">
                          {notice.message}
                        </p>
                        <time
                          className="mt-2 block text-[11px] text-muted-foreground"
                          dateTime={new Date(notice.createdAt).toISOString()}
                        >
                          {new Date(notice.createdAt).toLocaleString()}
                        </time>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
