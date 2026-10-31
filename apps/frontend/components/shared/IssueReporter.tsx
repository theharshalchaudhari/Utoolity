"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "@/lib/api";

type IssueDetected = { appName?: string; errorName?: string; details?: string };

export default function IssueReporter() {
  const [open, setOpen] = useState(false);
  const [appName, setAppName] = useState("Utoolity Desktop");
  const [errorName, setErrorName] = useState("Application error");
  const [details, setDetails] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [reported, setReported] = useState(false);

  useEffect(() => {
    const receive = (event: Event, showDialog = true) => {
      const detail = (event as CustomEvent<IssueDetected>).detail ?? {};
      setAppName(
        detail.appName?.slice(0, 120) || document.title || "Utoolity Desktop",
      );
      setErrorName(detail.errorName?.slice(0, 160) || "Application error");
      setDetails(
        detail.details?.slice(0, 12000) || "An application issue was detected.",
      );
      setDescription("");
      setStatus("");
      setReported(false);
      const notice = {
        id: `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "error" as const,
        title: "Issue detected",
        message: `${detail.errorName || "Application error"} in ${detail.appName || "Utoolity Desktop"}. You can report it from the open dialog.`,
        createdAt: Date.now(),
        issue: {
          appName: detail.appName || document.title || "Utoolity Desktop",
          errorName: detail.errorName || "Application error",
          details: detail.details || "An application issue was detected.",
        },
      };
      // Buffer the notification before dispatching it. The tray may not have
      // mounted yet when a startup error is detected.
      try {
        const existing = JSON.parse(
          window.sessionStorage.getItem("utoolity.notifications") || "[]",
        ) as (typeof notice)[];
        window.sessionStorage.setItem(
          "utoolity.notifications",
          JSON.stringify(
            [notice, ...existing.filter((item) => item.id !== notice.id)].slice(
              0,
              100,
            ),
          ),
        );
      } catch {
        window.sessionStorage.setItem(
          "utoolity.notifications",
          JSON.stringify([notice]),
        );
      }
      window.dispatchEvent(
        new CustomEvent("utoolity:notification", { detail: notice }),
      );
      if (showDialog) setOpen(true);
    };
    const runtimeError = (event: ErrorEvent) => {
      receive(
        new CustomEvent("utoolity:issue-detected", {
          detail: {
            appName: document.title || "Utoolity Desktop",
            errorName: event.message || "Unhandled JavaScript error",
            details: [
              event.filename,
              event.lineno ? `line ${event.lineno}` : "",
              event.error?.stack || "",
            ]
              .filter(Boolean)
              .join("\\n"),
          },
        }),
        false,
      );
    };
    const unhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      receive(
        new CustomEvent("utoolity:issue-detected", {
          detail: {
            appName: document.title || "Utoolity Desktop",
            errorName:
              reason instanceof Error
                ? reason.name
                : "Unhandled promise rejection",
            details:
              reason instanceof Error
                ? reason.stack || reason.message
                : String(reason),
          },
        }),
        false,
      );
    };
    const reopenIssue = (event: Event) => {
      const detail = (event as CustomEvent<IssueDetected>).detail ?? {};
      setAppName(
        detail.appName?.slice(0, 120) || document.title || "Utoolity Desktop",
      );
      setErrorName(detail.errorName?.slice(0, 160) || "Application error");
      setDetails(
        detail.details?.slice(0, 12000) || "An application issue was detected.",
      );
      setDescription("");
      setStatus("");
      setReported(false);
      setOpen(true);
    };
    window.addEventListener("utoolity:reopen-issue", reopenIssue);
    window.addEventListener("utoolity:issue-detected", receive);
    window.addEventListener("error", runtimeError);
    window.addEventListener("unhandledrejection", unhandledRejection);
    return () => {
      window.removeEventListener("utoolity:reopen-issue", reopenIssue);
      window.removeEventListener("utoolity:issue-detected", receive);
      window.removeEventListener("error", runtimeError);
      window.removeEventListener("unhandledrejection", unhandledRejection);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    try {
      await api("/api/auth/report-issue", {
        method: "POST",
        body: JSON.stringify({ appName, errorName, details, description }),
      });
      setReported(true);
      setStatus("Issue report saved. You can continue using the desktop.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to report this issue.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="issue-report-title"
        aria-describedby="issue-report-description"
        className="w-full max-w-xl rounded-2xl border border-border bg-background p-5 text-foreground shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            !
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="issue-report-title" className="text-lg font-semibold">
              An issue was detected
            </h2>
            <p
              id="issue-report-description"
              className="mt-1 text-sm text-muted-foreground"
            >
              You can report the details now and continue using the app.
              Reporting is optional.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Dismiss issue report"
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-sm font-medium">
            App name
            <input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              maxLength={120}
              required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium">
            Error name
            <input
              value={errorName}
              onChange={(e) => setErrorName(e.target.value)}
              maxLength={160}
              required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium">
            Error details
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={12000}
              rows={4}
              className="mt-1 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium">
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              rows={2}
              placeholder="What were you doing when this happened?"
              className="mt-1 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          {status && (
            <p role="status" className="text-sm text-muted-foreground">
              {status}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              {reported ? "Close" : "Continue without reporting"}
            </button>
            {!reported && (
              <button
                type="submit"
                disabled={
                  submitting || (!details.trim() && !description.trim())
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Reporting…" : "Report issue"}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
