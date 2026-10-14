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
import { api, ApiError } from "../../lib/api";
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
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperVisible, setWallpaperVisible] = useState(false);
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
    let availableWallpapers: Array<{ file: string; url: string }> = [];
    let selectedWallpaper =
      window.localStorage.getItem("utoolity.wallpaper") ?? "default.jpg";
    const normalizeWallpaper = (value: string) =>
      value === "Midnight" ? "default.jpg" : value;
    const applyWallpaper = () => {
      selectedWallpaper = normalizeWallpaper(selectedWallpaper);
      document.documentElement.dataset.wallpaper = selectedWallpaper;
      setWallpaperUrl(
        availableWallpapers.find(({ file }) => file === selectedWallpaper)?.url ??
          availableWallpapers.find(({ file }) => file === "default.jpg")?.url ??
          availableWallpapers[0]?.url ??
          null,
      );
    };
    applyWallpaper();
    void fetch("/api/wallpapers", { cache: "no-store" })
      .then((response) =>
        response.json() as Promise<{
          wallpapers?: Array<{ file: string; url: string }>;
        }>,
      )
      .then(({ wallpapers = [] }) => {
        availableWallpapers = wallpapers;
        applyWallpaper();
      })
      .catch(() => undefined);
    void api<{ preferences: Record<string, string> }>("/api/auth/preferences")
      .then(({ preferences }) => {
        const wallpaper = preferences["utoolity.wallpaper"];
        if (wallpaper) {
          selectedWallpaper = wallpaper;
          window.localStorage.setItem(
            "utoolity.wallpaper",
            normalizeWallpaper(wallpaper),
          );
          applyWallpaper();
        }
      })
      .catch(() => {
        // The cached wallpaper remains active while the backend reconnects.
      });
  }, []);
  useEffect(() => {
    if (!wallpaperUrl) return;
    setWallpaperVisible(false);
    const frame = window.requestAnimationFrame(() => setWallpaperVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [wallpaperUrl]);
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
      setLockscreenState(
        hasAuthenticatedSession && initialState === "sleep" ? "sleep" : "locked",
      );
      const injectedHostname = (
        window as Window & { __UTOOLITY_DEVICE_HOSTNAME__?: string }
      ).__UTOOLITY_DEVICE_HOSTNAME__?.trim();
      const savedHostname = window.localStorage
        .getItem(HOSTNAME_STORAGE_KEY)
        ?.trim();

      // The browser runs on the intern's workstation. The Next.js server's OS
      // hostname is the web server/container hostname and must not take priority.
      const deviceHostname = injectedHostname || savedHostname || "";
      if (!active) return;

      try {
        // First use the assigned identity supplied by deployment/local device
        // configuration; if absent or stale, fall back to the known account list.
        if (deviceHostname) {
          const response = await api<LockProfileResponse>(
            `/api/lockscreen/me?hostname=${encodeURIComponent(deviceHostname)}`,
          );
          if (!active) return;
          if (response.user && response.user.id !== "guest-intern") {
            setProfile({ ...response.user, locked: true });
            setHostname(response.user.hostname);
            window.localStorage.setItem(HOSTNAME_STORAGE_KEY, response.user.hostname);
            setError("");
          } else {
            throw new Error("The assigned workstation is not registered.");
          }
        } else {
          throw new Error("No assigned workstation identity is configured.");
        }
      } catch (cause) {
        if (!active) return;
        // Use the first real intern account as a usable sign-in identity when
        // this browser cannot discover its assigned hostname. The unlock API
        // still validates hostname and password against users.json.
        try {
          const fallback = await api<LockProfileResponse>(
            "/api/lockscreen/me?hostname=guest-intern",
          );
          if (!active) return;
          if (fallback.user) {
            setProfile({ ...fallback.user, locked: true });
            setHostname(fallback.user.hostname);
            setError(
              deviceHostname
                ? "Assigned workstation was not recognized. Use the Guest Intern account or correct the workstation hostname."
                : "Workstation hostname could not be detected. Use the Guest Intern account or configure the hostname.",
            );
          } else {
            throw new Error("No fallback account is configured.");
          }
        } catch (fallbackError) {
          if (!active) return;
          console.error("Failed to load lockscreen profile:", fallbackError ?? cause);
          setProfile(getInitialProfile(deviceHostname));
          setHostname("");
          setError(
            cause instanceof Error
              ? `Unable to load the device profile: ${cause.message}`
              : "Unable to contact the backend.",
          );
        }
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
    const syncShellState = (event: Event) => {
      const state = (event as CustomEvent<LockscreenState>).detail;
      if (state !== "sleep" && state !== "locked") return;
      setLockscreenState(state);
      setAuthenticated(state === "sleep");
      setLeaving(false);
      setPassword("");
      if (state === "locked") {
        setProfile((current) =>
          current ? { ...current, locked: true } : current,
        );
      }
    };
    window.addEventListener("utoolity:shell-state-changed", syncShellState);
    return () =>
      window.removeEventListener("utoolity:shell-state-changed", syncShellState);
  }, []);
  useEffect(() => {
    setLockscreenState(initialState);
    setAuthenticated(initialAuthenticated);
    setLeaving(false);
    setPassword("");
    if (initialState === "locked") {
      setProfile((current) =>
        current ? { ...current, locked: true } : current,
      );
    }
  }, [initialAuthenticated, initialState]);
  useEffect(() => {
    if (!profile || authenticated !== true || lockscreenState !== "sleep") {
      return;
    }
    const wakeToDesktop = () => leaveLockscreen();
    window.addEventListener("pointerdown", wakeToDesktop, { passive: true });
    window.addEventListener("keydown", wakeToDesktop);
    return () => {
      window.removeEventListener("pointerdown", wakeToDesktop);
      window.removeEventListener("keydown", wakeToDesktop);
    };
  }, [authenticated, leaveLockscreen, lockscreenState, profile]);
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
      if (!(cause instanceof ApiError && cause.status === 401)) {
        console.error("Lockscreen authentication failed:", cause);
      }
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
      _aria-label_="Lock screen"
      className={`lockscreen-shell lockscreen-wallpaper relative isolate flex h-full min-h-dvh w-full flex-col items-center justify-center overflow-hidden rounded-xl text-foreground ${
        leaving ? "lockscreen-exit" : "lockscreen-enter"
      }`}
    >
      {wallpaperUrl && (
        <div
          _aria-hidden_="true"
          className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-700 ease-out ${
            wallpaperVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url("${wallpaperUrl}")` }}
        />
      )}
      <div _aria-hidden_="true" className="lockscreen-orb lockscreen-orb-one" />
      <div _aria-hidden_="true" className="lockscreen-orb lockscreen-orb-two" />
      <div _aria-hidden_="true" className="lockscreen-orb lockscreen-orb-three" />
      <button
        type="button"
        onClick={toggleFullscreen}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        _aria-label_={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className="absolute top-5 right-5 z-20 rounded-full border border-border/60 bg-card/50 p-3 text-foreground/70 backdrop-blur-xl transition hover:bg-card hover:text-foreground"
      >
        <Maximize className="size-4" />
      </button>
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center px-5 py-12 text-center">
        <p className="text-xl font-bold tracking-[0.24em] text-background/80">
          {getGreeting(now)}
        </p>
        <time
          dateTime={now.toISOString()}
          className="mt-3 bg-linear-to-b from-primary to-black bg-clip-text font-mono text-[clamp(1rem,16vw,11.5rem)] leading-none font-black tracking-[-0.08em] text-transparent tabular-nums"
        >
          {now.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
        </time>
        <p className="mt-5 text-base font-semibold text-background/80 sm:text-xl">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <div className="mt-12 flex w-full flex-col items-center">
          <div className="mb-4 flex size-20 items-center justify-center rounded-full border border-border/70 bg-card/60 shadow-[00_0_8pxcolor-mix(in_oklab,var(--border)_20%,transparent)]">
            <LockKeyhole
              className={`size-8 text-background/85 transition-opacity duration-500 ${
                lockscreenState === "locked" ? "opacity-100" : "opacity-35"
              }`}
            />
          </div>
          <h1 className="max-w-full wrap-break-word text-xl font-bold text-background">
            {loadingProfile
              ? "Loading profile..."
              : profile?.displayName ?? "Assigned workstation"}
          </h1>
          {isLocked && lockscreenState === "locked" ? (
            <form
              onSubmit={handleUnlock}
              className="mt-8 flex w-full max-w-sm flex-col items-center"
            >
              <p className="mb-4 text-sm font-medium tracking-wide text-background/80">
                Enter password to unlock
              </p>
              <input
                _aria-label_="Password"
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
                _aria-label_="Unlock"
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
            <p className="mt-8 text-sm font-medium tracking-wide text-background/80">
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
