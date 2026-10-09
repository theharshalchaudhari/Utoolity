"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  LockKeyhole,
  Maximize,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { api } from "../../lib/api";
import { useClock } from "../shared/useClock";

type LockProfile = {
  id: string;
  hostname: string;
  displayName: string;
  locked: boolean;
};

type LockProfileResponse = {
  user?: {
    id: string;
    hostname: string;
    displayName: string;
    role: "intern";
  };
};

type UnlockResponse = {
  success: boolean;
  user?: {
    id: string;
    hostname: string;
    displayName: string;
    role: "intern";
  };
};

type LockcardProps = {
  socketDisconnected: boolean;
  initialAuthenticated?: boolean;
  initialState?: LockscreenState;
  onUnlock?: () => void;
};

type LockscreenState = "sleep" | "locked";

const HOSTNAME_STORAGE_KEY = "utoolity.hostname";
const INACTIVITY_TIMEOUT_MS = 60_000;

function getGreeting(date: Date): string {
  const hour = date.getHours();

  if (hour >= 22 || hour < 5) return "STILL UP?";
  if (hour < 9) return "EARLY BIRD?";
  if (hour < 12) return "GOOD MORNING";
  if (hour < 14) return "LUNCH O'CLOCK?";
  if (hour < 17) return "GOOD AFTERNOON";
  if (hour < 20) return "GOOD EVENING";
  return "CALLING IT A DAY?";
}

function getInitialProfile(hostname = ""): LockProfile {
  return {
    id: "unknown",
    hostname,
    displayName: hostname ? "Loading profile..." : "Assigned workstation",
    locked: true,
  };
}

function Lockcard({
  socketDisconnected,
  initialAuthenticated = false,
  initialState = "locked",
  onUnlock,
}: LockcardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const now = useClock();
  const [profile, setProfile] = useState<LockProfile | null>(null);
  const [hostname, setHostname] = useState("");
  const [password, setPassword] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(
    initialAuthenticated,
  );
  const [lockscreenState, setLockscreenState] =
    useState<LockscreenState>(initialState);
  const [leaving, setLeaving] = useState(false);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = undefined;
    }
  }, []);

  const relock = useCallback(() => {
    clearInactivityTimer();
    setPassword("");
    setError("");
    setProfile((current) =>
      current ? { ...current, locked: true } : current,
    );
  }, [clearInactivityTimer]);

  const lock = useCallback(() => {
    setLockscreenState("locked");
    setError("");
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(relock, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, relock]);

  const leaveLockscreen = useCallback(() => {
    if (leaving) return;

    setLeaving(true);
    transitionTimerRef.current = setTimeout(() => {
      onUnlock?.();
    }, 350);
  }, [leaving, onUnlock]);

  useEffect(() => {
    const savedWallpaper =
      window.localStorage.getItem("utoolity.wallpaper") ?? "Wraith";
    document.documentElement.dataset.wallpaper = savedWallpaper.toLowerCase();
    void api<{ preferences: Record<string, string> }>("/api/auth/preferences")
      .then(({ preferences }) => {
        const wallpaper = preferences["utoolity.wallpaper"];
        if (wallpaper) {
          window.localStorage.setItem("utoolity.wallpaper", wallpaper);
          document.documentElement.dataset.wallpaper = wallpaper.toLowerCase();
        }
      })
      .catch(() => {
        // The cached wallpaper remains active while the backend reconnects.
      });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      let hasAuthenticatedSession = initialAuthenticated;

      if (!initialAuthenticated) {
        try {
          await api("/api/auth/me");
          hasAuthenticatedSession = true;
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "";
          const isExpectedUnauthenticated =
            message === "Not authenticated." ||
            message === "Session user no longer exists." ||
            message.includes("(401)");

          if (!isExpectedUnauthenticated) {
            console.error("Could not verify the current session:", cause);
          }
        }
      }

      if (!active) return;
      setAuthenticated(hasAuthenticatedSession);
      setLockscreenState(hasAuthenticatedSession ? "sleep" : "locked");

      const injectedHostname = (
        window as Window & { __UTOOLITY_DEVICE_HOSTNAME__?: string }
      ).__UTOOLITY_DEVICE_HOSTNAME__?.trim();
      const savedHostname = window.localStorage
        .getItem(HOSTNAME_STORAGE_KEY)
        ?.trim();

      let frontendHostname = "";
      try {
        const response = await fetch("/internal/device-hostname", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (response.ok) {
          const payload: unknown = await response.json();
          if (
            typeof payload === "object" &&
            payload !== null &&
            "hostname" in payload &&
            typeof payload.hostname === "string"
          ) {
            frontendHostname = payload.hostname.trim();
          }
        }
      } catch (cause) {
        console.error("Could not resolve frontend hostname:", cause);
      }

      const deviceHostname =
        frontendHostname || injectedHostname || savedHostname || "";

      if (!active) return;
      setHostname(deviceHostname);

      if (!deviceHostname) {
        setProfile({
          id: "unknown",
          hostname: "",
          displayName: "Device not identified",
          locked: true,
        });
        setError("This device has no assigned workstation identity.");
        setLoadingProfile(false);
        return;
      }

      setProfile(getInitialProfile(deviceHostname));

      try {
        const response = await api<LockProfileResponse>(
          `/api/lockscreen/me?hostname=${encodeURIComponent(deviceHostname)}`,
        );
        if (!active) return;

        const user = response.user;
        if (!user || user.id === "guest") {
          setProfile({
            id: "guest",
            hostname: deviceHostname,
            displayName: "Unregistered workstation",
            locked: true,
          });
          setError("This workstation is not registered on the server.");
        } else {
          setProfile({ ...user, locked: true });
          setError("");
        }
      } catch (cause) {
        if (!active) return;
        console.error("Failed to load lockscreen profile:", cause);
        setProfile(getInitialProfile(deviceHostname));
        setError(
          cause instanceof Error
            ? `Unable to load the device profile: ${cause.message}`
            : "Unable to contact the backend.",
        );
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    void loadProfile();
    return () => {
      active = false;
      clearInactivityTimer();
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [clearInactivityTimer]);

  useEffect(() => {
    if (!profile || authenticated !== true || lockscreenState !== "sleep") {
      return;
    }

    const sleepTimer = setTimeout(lock, 10 * 60 * 1000);
    const wakeToDesktop = () => leaveLockscreen();
    window.addEventListener("pointerdown", wakeToDesktop, { passive: true });
    window.addEventListener("keydown", wakeToDesktop);

    return () => {
      clearTimeout(sleepTimer);
      window.removeEventListener("pointerdown", wakeToDesktop);
      window.removeEventListener("keydown", wakeToDesktop);
    };
  }, [authenticated, leaveLockscreen, lock, lockscreenState, profile]);

  useEffect(() => {
    if (!profile || lockscreenState !== "locked") return;

    const activityEvents = ["pointerdown", "keydown", "mousemove", "touchstart"];
    const handleActivity = () => startInactivityTimer();
    activityEvents.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true }),
    );
    startInactivityTimer();

    return () => {
      activityEvents.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
      clearInactivityTimer();
    };
  }, [clearInactivityTimer, lockscreenState, profile, startInactivityTimer]);

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const assignedHostname = hostname.trim();
    if (!assignedHostname || !password || checking || !profile) return;

    setChecking(true);
    setError("");

    try {
      const response = await api<UnlockResponse>("/api/lockscreen/unlock", {
        method: "POST",
        body: JSON.stringify({ hostname: assignedHostname, password }),
      });
      if (!response.success) {
        setError("Unable to unlock this device.");
        return;
      }

      const user = response.user ?? profile;
      setProfile({ ...user, locked: false });
      setHostname(user.hostname);
      window.localStorage.setItem(HOSTNAME_STORAGE_KEY, user.hostname);
      leaveLockscreen();
    } catch (cause) {
      console.error("Lockscreen authentication failed:", cause);
      setError(
        cause instanceof Error ? cause.message : "Authentication failed.",
      );
    } finally {
      setChecking(false);
      setPassword("");
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await cardRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setError("Fullscreen is not available.");
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const isLocked = profile?.locked !== false;

  return (
    <section
      ref={cardRef}
      aria-label="Lock screen"
      className={`lockscreen-shell lockscreen-wallpaper relative isolate flex h-full min-h-dvh w-full flex-col items-center justify-center overflow-hidden rounded-xl text-foreground ${
        leaving ? "lockscreen-exit" : "lockscreen-enter"
      }`}
    >
      <div aria-hidden="true" className="lockscreen-orb lockscreen-orb-one" />
      <div aria-hidden="true" className="lockscreen-orb lockscreen-orb-two" />
      <div aria-hidden="true" className="lockscreen-orb lockscreen-orb-three" />

      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className="absolute top-5 right-5 z-20 rounded-full border border-border/60 bg-card/50 p-3 text-foreground/70 backdrop-blur-xl transition hover:bg-card hover:text-foreground"
      >
        <Maximize className="size-4" />
      </button>

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center px-5 py-12 text-center">
        <p className="text-xl font-bold tracking-[0.24em] text-muted-foreground">
          {getGreeting(now)}
        </p>
        <time
          dateTime={now.toISOString()}
          className="mt-3 font-mono text-[clamp(1rem,16vw,11.5rem)] leading-none font-black tracking-[-0.08em] text-foreground tabular-nums"
        >
          {now.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </time>
        <p className="mt-5 text-base font-semibold text-muted-foreground sm:text-xl">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>

        <div className="mt-12 flex w-full flex-col items-center">
          <div className="mb-4 flex size-20 items-center justify-center rounded-full border border-border/70 bg-card/60 shadow-[0_0_0_8px_color-mix(in_oklab,var(--border)_20%,transparent)]">
            <LockKeyhole className="size-8 text-foreground/85" />
          </div>
          <h1 className="max-w-full wrap-break-word text-xl font-bold text-foreground">
            {loadingProfile
              ? "Loading profile..."
              : profile?.displayName ?? "Assigned workstation"}
          </h1>

          {isLocked && lockscreenState === "locked" ? (
            <form
              onSubmit={handleUnlock}
              className="mt-8 flex w-full max-w-sm flex-col items-center"
            >
              <p className="mb-4 text-sm font-medium tracking-wide text-muted-foreground">
                Tap to unlock
              </p>
              <input
                aria-label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                autoFocus
                disabled={loadingProfile || checking || !hostname}
                className="w-full rounded-2xl border border-border/70 bg-input/70 px-5 py-4 text-center font-mono text-3xl tracking-[0.45em] text-foreground outline-none backdrop-blur-xl placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/35 disabled:opacity-50"
              />
              <button
                type="submit"
                aria-label="Unlock"
                disabled={loadingProfile || checking || !password || !hostname}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShieldCheck className="size-4" />
                {checking ? "Checking..." : "Unlock"}
              </button>
              {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {error}
                </p>
              )}
            </form>
          ) : (
            <p className="mt-8 text-sm font-medium tracking-wide text-muted-foreground">
              Tap or press any key to wake
            </p>
          )}
        </div>
      </div>

      {socketDisconnected && isLocked && (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-border/60 bg-card/50 px-3 py-2 text-xs text-muted-foreground backdrop-blur-xl">
          <WifiOff className="size-3.5" />
          Connection lost
        </div>
      )}
    </section>
  );
}

export default Lockcard;
