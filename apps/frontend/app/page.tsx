"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Desktop from "@/components/desktop/Desktop";
import Lockcard from "@/components/lockscreen/LockcardEntry";
import { api, ApiError } from "@/lib/api";
import Image from "next/image";
import IssueReporter from "@/components/shared/IssueReporter";

type ShellState = "checking" | "authenticated" | "sleep" | "locked";
const AUTHENTICATED_SESSION_KEY = "utoolity.authenticated";
const SHELL_STATE_KEY = "utoolity.shell-state";
const LAST_ACTIVITY_KEY = "utoolity.last-activity";
const SLEEP_STARTED_KEY = "utoolity.sleep-started";
const SLEEP_AFTER_MS = 5 * 60 * 1000;
const LOCK_AFTER_MS = 2 * 60 * 1000;
const SLEEP_WARNING_BEFORE_MS = 30 * 1000;

export default function Home() {
  const [shellState, setShellState] = useState<ShellState>("checking");
  const lastActivityRef = useRef(Date.now());
  const busyRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const socketRetryRef = useRef<number | undefined>(undefined);
  const lastSocketActivityRef = useRef(0);
  const pendingWorkspaceRef = useRef<unknown>(null);
  const shellStateRef = useRef(shellState);

  const sendSocketActivity = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - lastSocketActivityRef.current < 10_000) return;
    lastSocketActivityRef.current = now;
    socket.send(JSON.stringify({ type: "activity" }));
  }, []);

  const connectSocketRef = useRef<() => void>(() => undefined);
  const connectActivitySocket = useCallback(() => {
    const existing = socketRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (socketRetryRef.current !== undefined) {
      window.clearTimeout(socketRetryRef.current);
      socketRetryRef.current = undefined;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.hostname}:4000/api/auth/socket`);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      if (socketRef.current !== socket) {
        socket.close();
        return;
      }
      lastSocketActivityRef.current = 0;
      sendSocketActivity();
      if (pendingWorkspaceRef.current !== null) {
        socket.send(JSON.stringify({
          type: "workspace",
          workspace: pendingWorkspaceRef.current,
        }));
        pendingWorkspaceRef.current = null;
      }
    });
    socket.addEventListener("close", (event) => {
      if (socketRef.current === socket) socketRef.current = null;
      if (event.code !== 1008 && event.code !== 1000 && shellStateRef.current !== "checking") {
        socketRetryRef.current = window.setTimeout(() => {
          socketRetryRef.current = undefined;
          connectSocketRef.current();
        }, 3000);
      }
    });
    socket.addEventListener("error", () => socket.close(4000, "Connection error"));
  }, [sendSocketActivity]);
  connectSocketRef.current = connectActivitySocket;

  useEffect(() => {
    shellStateRef.current = shellState;
  }, [shellState]);

  useEffect(() => {
    const handleInvalidSession = () => {
      // Only an explicit server 401 invalidates the session. Offline/network
      // failures are handled separately and leave the cached desktop intact.
      localStorage.setItem(AUTHENTICATED_SESSION_KEY, "false");
      localStorage.setItem(SHELL_STATE_KEY, "locked");
      localStorage.removeItem(SLEEP_STARTED_KEY);
      socketRef.current?.close(1000, "Session expired");
      socketRef.current = null;
      setShellState("locked");
    };
    window.addEventListener("utoolity:session-invalid", handleInvalidSession);
    return () => window.removeEventListener("utoolity:session-invalid", handleInvalidSession);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === "utoolity.authenticated-user-id" &&
        event.oldValue &&
        event.oldValue !== event.newValue
      ) {
        // Another tab signed in as a different user (or explicitly signed out).
        // Lock this tab without treating a dropped network connection as logout.
        localStorage.setItem(AUTHENTICATED_SESSION_KEY, "false");
        localStorage.setItem(SHELL_STATE_KEY, "locked");
        localStorage.removeItem(SLEEP_STARTED_KEY);
        setShellState("locked");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (shellState === "authenticated" || shellState === "sleep") {
      connectActivitySocket();
      return;
    }
    socketRef.current?.close(1000, "No active desktop session");
    socketRef.current = null;
    if (socketRetryRef.current !== undefined) {
      window.clearTimeout(socketRetryRef.current);
      socketRetryRef.current = undefined;
    }
  }, [shellState, connectActivitySocket]);

  useEffect(() => {
    const handleWorkspaceState = (event: Event) => {
      const workspace = (event as CustomEvent<unknown>).detail;
      if (!workspace || typeof workspace !== "object") return;
      pendingWorkspaceRef.current = workspace;
      const socket = socketRef.current;
      if (socket?.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({
        type: "workspace",
        workspace,
      }));
      pendingWorkspaceRef.current = null;
    };
    window.addEventListener("utoolity:workspace-state-changed", handleWorkspaceState);
    return () => window.removeEventListener("utoolity:workspace-state-changed", handleWorkspaceState);
  }, []);

  useEffect(() => {
    const activityEvents = ["pointerdown", "keydown", "mousemove", "touchstart"];
    activityEvents.forEach((event) =>
      window.addEventListener(event, sendSocketActivity, { passive: true }),
    );
    return () => {
      activityEvents.forEach((event) =>
        window.removeEventListener(event, sendSocketActivity),
      );
      socketRef.current?.close(1000, "Page closed");
      if (socketRetryRef.current !== undefined) window.clearTimeout(socketRetryRef.current);
    };
  }, [sendSocketActivity]);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      const cachedAuthenticated =
        localStorage.getItem(AUTHENTICATED_SESSION_KEY) === "true";
      const cachedState = localStorage.getItem(SHELL_STATE_KEY);
      const cachedUserId = localStorage.getItem("utoolity.authenticated-user-id");
      const cachedShellState: ShellState =
        cachedAuthenticated && (cachedState === "sleep" || cachedState === "locked")
          ? cachedState
          : cachedAuthenticated
            ? "authenticated"
            : "checking";

      if (active && cachedAuthenticated && cachedUserId) {
        // Keep the shell in its checking state until the server confirms the
        // session. Mounting Desktop from stale localStorage here can trigger
        // protected preference writes before /auth/me rejects an expired session.
        const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? Date.now());
        lastActivityRef.current = Number.isFinite(lastActivity) ? lastActivity : Date.now();
      }

      try {
        const response = await api<{ user: { id: string; hostname: string; displayName: string; role?: "intern" | "admin" } }>("/api/auth/me");
        if (!active) return;

        const nextUserId = response.user.id;
        const previousUserId = localStorage.getItem("utoolity.authenticated-user-id");
        localStorage.setItem("utoolity.cached-user", JSON.stringify(response.user));
        localStorage.setItem("utoolity.authenticated-user-id", nextUserId);

        // A different authenticated account on this browser is the signal to
        // leave the previous desktop and require the newly detected user to unlock.
        if (previousUserId && previousUserId !== nextUserId) {
          // A changed identity must lock the desktop, but must not revoke the
          // newly authenticated server session as a side effect of refresh.
          localStorage.setItem("utoolity.cached-user", JSON.stringify(response.user));
          localStorage.setItem(AUTHENTICATED_SESSION_KEY, "false");
          localStorage.setItem(SHELL_STATE_KEY, "locked");
          localStorage.removeItem(SLEEP_STARTED_KEY);
          setShellState("locked");
          return;
        }

        localStorage.setItem(AUTHENTICATED_SESSION_KEY, "true");
        const savedState = localStorage.getItem(SHELL_STATE_KEY);
        const nextState: ShellState =
          savedState === "locked" || savedState === "sleep"
            ? savedState
            : "authenticated";
        localStorage.setItem(SHELL_STATE_KEY, nextState);
        setShellState(nextState);
        const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? Date.now());
        lastActivityRef.current = Number.isFinite(lastActivity) ? lastActivity : Date.now();
      } catch (error) {
        if (!active) return;

        // Preserve the desktop on transport/server outages, but never treat
        // a definite 401 as authenticated merely because the profile is cached.
        if (error instanceof ApiError && error.status === 401) {
          localStorage.setItem(AUTHENTICATED_SESSION_KEY, "false");
          localStorage.setItem(SHELL_STATE_KEY, "locked");
          localStorage.removeItem(SLEEP_STARTED_KEY);
          setShellState("locked");
        } else if (cachedAuthenticated && cachedUserId) {
          setShellState(cachedShellState);
        } else {
          setShellState("locked");
        }

        if (!(error instanceof ApiError && error.status === 401)) {
          console.warn("Session verification unavailable; preserving cached device state.", error);
        }
      }
    }

    void verifySession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (shellState !== "authenticated") return;

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
      localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivityRef.current));
      sendSocketActivity();
    };
    const activityEvents = ["pointerdown", "keydown", "mousemove", "touchstart"];
    activityEvents.forEach((event) =>
      window.addEventListener(event, recordActivity, { passive: true }),
    );

    let warningShownFor = 0;
    const timer = window.setInterval(() => {
      if (busyRef.current) return;
      const inactiveFor = Date.now() - lastActivityRef.current;
      const remaining = SLEEP_AFTER_MS - inactiveFor;
      if (remaining > 0 && remaining <= SLEEP_WARNING_BEFORE_MS && warningShownFor !== lastActivityRef.current) {
        warningShownFor = lastActivityRef.current;
        window.dispatchEvent(new CustomEvent("utoolity:notification", {
          detail: {
            type: "system",
            title: "Sleep warning",
            message: "The desktop will enter sleep in 30 seconds due to inactivity. Move your mouse or press a key to stay active.",
          },
        }));
      }
      if (remaining > 0) return;
      localStorage.setItem(SHELL_STATE_KEY, "sleep");
      localStorage.setItem(SLEEP_STARTED_KEY, String(Date.now()));
      setShellState("sleep");
    }, 500);
    return () => {
      window.clearInterval(timer);
      activityEvents.forEach((event) =>
        window.removeEventListener(event, recordActivity),
      );
    };
  }, [shellState, sendSocketActivity]);

  useEffect(() => {
    const startWork = () => {
      busyRef.current = true;
      lastActivityRef.current = Date.now();
      localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivityRef.current));
    };
    const finishWork = () => {
      busyRef.current = false;
      lastActivityRef.current = Date.now();
      localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivityRef.current));
      sendSocketActivity();
    };
    window.addEventListener("utoolity:work-started", startWork);
    window.addEventListener("utoolity:work-finished", finishWork);
    return () => {
      window.removeEventListener("utoolity:work-started", startWork);
      window.removeEventListener("utoolity:work-finished", finishWork);
    };
  }, [sendSocketActivity]);


  useEffect(() => {
    if (shellState !== "sleep") return;

    const storedSleepStarted = Number(
      localStorage.getItem(SLEEP_STARTED_KEY),
    );
    const sleepStarted = Number.isFinite(storedSleepStarted) && storedSleepStarted > 0
      ? storedSleepStarted
      : Date.now();
    localStorage.setItem(SLEEP_STARTED_KEY, String(sleepStarted));
    const timer = window.setInterval(() => {
      if (Date.now() - sleepStarted < LOCK_AFTER_MS) return;
      localStorage.setItem(SHELL_STATE_KEY, "locked");
      setShellState("locked");
    }, 1000);

    return () => window.clearInterval(timer);
  }, [shellState]);

  useEffect(() => {
    document.documentElement.dataset.shellState = shellState;
    window.dispatchEvent(
      new CustomEvent("utoolity:shell-state-changed", {
        detail: shellState,
      }),
    );
  }, [shellState]);

  const enterSleep = () => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    localStorage.setItem(SHELL_STATE_KEY, "sleep");
    localStorage.setItem(SLEEP_STARTED_KEY, String(now));
    setShellState("sleep");
  };

  const enterLocked = () => {
    localStorage.setItem(AUTHENTICATED_SESSION_KEY, "true");
    localStorage.setItem(SHELL_STATE_KEY, "locked");
    localStorage.removeItem(SLEEP_STARTED_KEY);
    setShellState("locked");
  };

  return (
    <div className="relative isolate h-dvh min-h-dvh overflow-hidden font-sans text-foreground">
      <IssueReporter />
      {shellState === "checking" ? (
        <div
          className="flex min-h-screen items-center justify-center bg-background"
          aria-label="Loading"
        >
          <Image
            src="/Logo.svg"
            alt=""
            width={96}
            height={96}
            priority
            className="h-24 w-24 brightness-0 invert opacity-90"
          />
        </div>
      ) : (
        <>
          <Desktop
            onSleep={enterSleep}
            onLock={enterLocked}
            isVisible={shellState === "authenticated"}
          />
          <Lockcard
            socketDisconnected={false}
            initialAuthenticated={shellState === "sleep"}
            initialState={shellState === "sleep" ? "sleep" : "locked"}
            isVisible={shellState === "locked" || shellState === "sleep"}
            onUnlock={() => {
              localStorage.setItem(AUTHENTICATED_SESSION_KEY, "true");
              localStorage.setItem(SHELL_STATE_KEY, "authenticated");
              localStorage.removeItem(SLEEP_STARTED_KEY);
              lastActivityRef.current = Date.now();
              localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivityRef.current));
              setShellState("authenticated");
            }}
          />
        </>
      )}
    </div>
  );
}