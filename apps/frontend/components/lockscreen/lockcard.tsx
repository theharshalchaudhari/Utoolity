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
import { saveWallpaperPreference } from "../../lib/wallpapers";
type LockProfile = {
  id: string;
  hostname: string;
  displayName: string;
  locked: boolean;
  passwordConfigured?: boolean;
  preferences?: Record<string, string>;
};
type LockProfileResponse = {
  user?: {
    id: string;
    hostname: string;
    displayName: string;
    role: "intern" | "admin";
    passwordConfigured: boolean;
    preferences?: Record<string, string>;
  };
  requiresDeviceId?: boolean;
};
type UnlockResponse = {
  success: boolean;
  user?: {
    id: string;
    hostname: string;
    displayName: string;
    role: "intern" | "admin";
    passwordConfigured: boolean;
  };
};
type LockcardProps = {
  socketDisconnected: boolean;
  initialAuthenticated?: boolean;
  initialState?: LockscreenState;
  onUnlock?: () => void;
  isVisible?: boolean;
};
type LockscreenState = "sleep" | "locked";
const HOSTNAME_STORAGE_KEY = "utoolity.hostname";
const INACTIVITY_TIMEOUT_MS = 60_000;
function applyProfilePreferences(preferences?: Record<string, string>) {
  const root = document.documentElement;
  if (preferences?.["utoolity.wallpaper"]) {
    saveWallpaperPreference(preferences["utoolity.wallpaper"]);
  } else {
    saveWallpaperPreference("default.jpg");
  }
  const theme = preferences?.["utoolity.theme"];
  if (theme === "dark" || theme === "light") {
    localStorage.setItem("utoolity.theme", theme);
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.style.colorScheme = theme;
  } else {
    localStorage.removeItem("utoolity.theme");
    const deviceTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    root.classList.toggle("dark", deviceTheme === "dark");
    root.classList.toggle("light", deviceTheme === "light");
    root.style.colorScheme = deviceTheme;
  }
  const grain = preferences?.["utoolity.grain"] ?? "none";
  localStorage.setItem("utoolity.grain", grain);
  root.dataset.grain = grain.toLowerCase();
}
function recordLockscreenError(title: string, message: string, errorName = "Lockscreen error") {
  const notice = {
    id: `lockscreen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "error" as const,
    title,
    message: `${errorName}: ${message}`,
    createdAt: Date.now(),
  };
  // Persist before dispatch so startup errors survive refresh and do not depend
  // on whether the tray listener has mounted yet.
  try {
    const saved = JSON.parse(window.sessionStorage.getItem("utoolity.notifications") || "[]") as Array<{ id?: string }>;
    window.sessionStorage.setItem("utoolity.notifications", JSON.stringify([notice, ...saved.filter((item) => item.id !== notice.id)].slice(0, 100)));
  } catch {
    try {
      window.sessionStorage.setItem("utoolity.notifications", JSON.stringify([notice]));
    } catch {
      // Keep the lock screen usable if browser storage is unavailable.
    }
  }
  window.dispatchEvent(new CustomEvent("utoolity:notification", { detail: notice }));
}

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

function Lockcard({
  socketDisconnected,
  initialAuthenticated = false,
  initialState = "locked",
  onUnlock,
  isVisible = true,
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
  const [deviceIdInput, setDeviceIdInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [password, setPassword] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
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
    let active = true;

    async function loadProfile() {
      const hasAuthenticatedSession = initialAuthenticated;

      // Home already verifies /api/auth/me before rendering this lock screen.
      // Avoid issuing the same unauthenticated request a second time here.

      if (!active) return;
      setAuthenticated(hasAuthenticatedSession);
      setLockscreenState(
        hasAuthenticatedSession && initialState === "sleep" ? "sleep" : "locked",
      );

      const savedHostname = window.localStorage
        .getItem(HOSTNAME_STORAGE_KEY)
        ?.trim();
      const configuredHostname = savedHostname || "";

      setHostname(configuredHostname);
      // Cached profile is only a temporary display hint; keep the default wallpaper
      // and setup prompt visible instead of displaying a loading lock screen.
      const cachedProfileRaw = window.localStorage.getItem("utoolity.cached-user");
      if (cachedProfileRaw) {
        try {
          const cached = JSON.parse(cachedProfileRaw) as LockProfileResponse["user"];
          if (cached?.id && cached.hostname && cached.displayName) {
            setProfile({ ...cached, locked: true });
            setHostname(cached.hostname);
          }
        } catch {
          window.localStorage.removeItem("utoolity.cached-user");
        }
      }
      try {
        // api() sends the stable device ID. The backend remains authoritative.
        let resolvedUser: LockProfileResponse["user"];
        const profilePath = configuredHostname
          ? `/api/lockscreen/me?hostname=${encodeURIComponent(configuredHostname)}`
          : "/api/lockscreen/me";
        const response = await api<LockProfileResponse>(profilePath);
        resolvedUser = response.user;
        if (!active) return;
        if (!resolvedUser && response.requiresDeviceId) {
          setProfile(null);
          setHostname("");
          setDeviceIdInput("");
          setNeedsRegistration(false);
          setError("");
          return;
        }
        if (!resolvedUser) throw new Error("The backend returned an empty profile.");

        applyProfilePreferences(resolvedUser.preferences);
        window.localStorage.setItem("utoolity.cached-user", JSON.stringify(resolvedUser));
        window.localStorage.setItem("utoolity.authenticated-user-id", resolvedUser.id);
        window.localStorage.setItem(HOSTNAME_STORAGE_KEY, resolvedUser.hostname);
        setProfile({ ...resolvedUser, locked: true });
        setHostname(resolvedUser.hostname);
        setError("");
      } catch (cause) {
        if (!active) return;
        console.warn("Lock-screen profile lookup failed; preserving cached profile if available.", cause);
        recordLockscreenError("Lock-screen profile lookup failed", cause instanceof Error ? cause.message : String(cause), cause instanceof ApiError ? `HTTP ${cause.status}` : "Profile lookup error");
        // Never turn a transport/server error into a fake Guest assignment.
        // Guest is shown only when the backend explicitly resolves Guest.
        setProfile((current) => current ?? null);
        setError("");
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
  }, [clearInactivityTimer, initialAuthenticated, initialState]);
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
  const handleDeviceIdSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const enteredDeviceId = deviceIdInput.trim();
    if (!enteredDeviceId || checking || loadingProfile) return;
    setChecking(true);
    setError("");
    try {
      const response = await api<LockProfileResponse>(
        `/api/lockscreen/me?hostname=${encodeURIComponent(enteredDeviceId)}`,
        { headers: { "X-Utoolity-Device-Id": enteredDeviceId } },
      );
      if (!response.user) {
        setNeedsRegistration(true);
        setDisplayNameInput("");
        setError("");
        return;
      }
      applyProfilePreferences(response.user.preferences);
      window.localStorage.setItem(HOSTNAME_STORAGE_KEY, response.user.hostname);
      window.localStorage.setItem("utoolity.device-id", response.user.hostname);
      window.localStorage.setItem("utoolity.cached-user", JSON.stringify(response.user));
      window.localStorage.setItem("utoolity.authenticated-user-id", response.user.id);
      setHostname(response.user.hostname);
      setProfile({ ...response.user, locked: true });
      setDeviceIdInput("");
    } catch (cause) {
      recordLockscreenError("Device ID lookup failed", cause instanceof Error ? cause.message : String(cause), cause instanceof ApiError ? `HTTP ${cause.status}` : "Device ID error");
      setError(cause instanceof Error ? cause.message : "Unable to verify this device ID.");
    } finally {
      setChecking(false);
    }
  };
  const handleRegisterDevice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hostId = deviceIdInput.trim();
    const displayName = displayNameInput.trim();
    if (!hostId || displayName.length < 2 || newPasswordInput.length < 8 || checking) return;
    setChecking(true);
    setError("");
    try {
      const response = await api<{ success: boolean; user: NonNullable<LockProfileResponse["user"]> }>(
        "/api/lockscreen/register",
        { method: "POST", body: JSON.stringify({ hostname: hostId, displayName, password: newPasswordInput }) },
      );
      const user = response.user;
      setNewPasswordInput("");
      applyProfilePreferences(user.preferences);
      window.localStorage.setItem(HOSTNAME_STORAGE_KEY, user.hostname);
      window.localStorage.setItem("utoolity.device-id", user.hostname);
      window.localStorage.setItem("utoolity.cached-user", JSON.stringify(user));
      window.localStorage.setItem("utoolity.authenticated-user-id", user.id);
      window.localStorage.setItem("utoolity.authenticated", "true");
      setProfile({ ...user, locked: false });
      setHostname(user.hostname);
      leaveLockscreen();
    } catch (cause) {
      recordLockscreenError("Device registration failed", cause instanceof Error ? cause.message : String(cause), cause instanceof ApiError ? `HTTP ${cause.status}` : "Registration error");
      setError(cause instanceof Error ? cause.message : "Unable to create this profile.");
    } finally {
      setChecking(false);
    }
  };
  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const assignedHostname = (hostname || profile?.hostname || "").trim();
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
      window.localStorage.setItem("utoolity.authenticated-user-id", user.id);
      window.localStorage.setItem("utoolity.cached-user", JSON.stringify(user));
      window.localStorage.setItem("utoolity.authenticated", "true");
      window.localStorage.setItem(HOSTNAME_STORAGE_KEY, user.hostname);
      leaveLockscreen();
    } catch (cause) {
      recordLockscreenError("Unlock failed", cause instanceof Error ? cause.message : String(cause), cause instanceof ApiError ? `HTTP ${cause.status}` : "Authentication error");
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
        // Fullscreen the document root so the wallpaper and custom cursor
        // remain inside the fullscreen rendering tree instead of being left
        // behind as siblings of a fullscreen lock-card element.
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (cause) {
      recordLockscreenError("Fullscreen unavailable", cause instanceof Error ? cause.message : String(cause), "Fullscreen error");
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
      aria-hidden={!isVisible}
      inert={!isVisible || undefined}
      className={`lockscreen-shell fixed inset-0 z-[110] flex h-dvh min-h-dvh w-full flex-col items-center justify-center overflow-hidden rounded-none bg-transparent text-foreground transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className={`lockscreen-content relative z-10 flex w-full flex-col items-center transition-[opacity,transform] duration-350 ease-out motion-reduce:transition-none ${
          leaving ? "translate-y-[-12px] opacity-0" : isVisible ? "translate-y-0 opacity-100" : "translate-y-0 opacity-0"
        }`}
      >
      <button
        type="button"
        onClick={toggleFullscreen}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        _aria-label_={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className="absolute top-5 right-5 z-20 rounded-full border border-white/20 bg-black/20 p-3 text-white/80 backdrop-blur-2xl transition hover:bg-black/35 hover:text-white"
      >
        <Maximize className="size-4" />
      </button>
      <div className="lockscreen-frost-panel relative flex w-full flex-col items-center px-5 py-8 text-center">
        <p className="text-xl font-bold tracking-[0.24em] text-white/80">
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
        <p className="mt-5 text-base font-semibold text-white/80 sm:text-xl">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <div className="mt-12 flex w-full flex-col items-center">
          <div className="mb-4 flex size-20 items-center justify-center rounded-full border border-white/25 bg-black/15 shadow-lg backdrop-blur-sm">
            <LockKeyhole
              className={`size-8 text-white/90 transition-opacity duration-500 ${
                lockscreenState === "locked" ? "opacity-100" : "opacity-35"
              }`}
            />
          </div>
          <h1 className="max-w-full wrap-break-word text-xl font-bold text-white">
            {profile?.displayName ?? "Set up this device"}
          </h1>
          {!profile && !needsRegistration ? (
            <form
              onSubmit={handleDeviceIdSubmit}
              className="mt-8 flex w-full max-w-sm flex-col items-center"
            >
              <p className="mb-4 text-sm font-medium tracking-wide text-white/80">
                Enter your assigned device ID
              </p>
              <input
                aria-label="Device ID"
                type="text"
                value={deviceIdInput}
                onChange={(event) => setDeviceIdInput(event.target.value)}
                placeholder="e.g. wraith-os"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={checking}
                className="w-full rounded-2xl border border-white/20 bg-black/25 px-5 py-4 text-center text-lg text-white outline-none backdrop-blur-sm placeholder:text-white/45 focus:border-white/50 focus:ring-2 focus:ring-white/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={checking || !deviceIdInput.trim()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checking ? "Checking..." : "Use this device"}
              </button>
              {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
            </form>
          ) : !profile && needsRegistration ? (
            <form onSubmit={handleRegisterDevice} className="mt-8 flex w-full max-w-sm flex-col items-center">
              <p className="mb-4 text-sm font-medium tracking-wide text-white/80">New device — enter your name</p>
              <input aria-label="Your name" type="text" value={displayNameInput} onChange={(event) => setDisplayNameInput(event.target.value)} placeholder="Your name" autoComplete="name" maxLength={80} disabled={checking} className="w-full rounded-2xl border border-white/20 bg-black/25 px-5 py-4 text-center text-lg text-white outline-none placeholder:text-white/45 focus:border-white/50 disabled:opacity-50" />
              <input aria-label="Create password" type="password" value={newPasswordInput} onChange={(event) => setNewPasswordInput(event.target.value)} placeholder="Create password (8+ characters)" autoComplete="new-password" minLength={8} maxLength={1024} required disabled={checking} className="mt-3 w-full rounded-2xl border border-white/20 bg-black/25 px-5 py-4 text-center text-lg text-white outline-none placeholder:text-white/45 focus:border-white/50 disabled:opacity-50" />
              <button type="submit" disabled={checking || displayNameInput.trim().length < 2 || newPasswordInput.length < 8} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{checking ? "Saving profile…" : "Save and continue"}</button>
              {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
            </form>
          ) : isLocked && lockscreenState === "locked" ? (
            <form
              onSubmit={handleUnlock}
              className="mt-8 flex w-full max-w-sm flex-col items-center"
            >
              <p className="mb-4 text-sm font-medium tracking-wide text-white/80">
                Sign in to unlock
              </p>
              <input
                _aria-label_="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={profile?.passwordConfigured === false ? "No password set — leave blank" : "••••••••"}
                autoComplete="current-password"
                disabled={loadingProfile || checking}
                className="w-full rounded-2xl border border-white/20 bg-black/25 px-5 py-4 text-center font-mono text-3xl tracking-[0.45em] text-white outline-none backdrop-blur-sm placeholder:text-white/45 focus:border-white/50 focus:ring-2 focus:ring-white/20 disabled:opacity-50"
              />
              <button
                type="submit"
                _aria-label_="Unlock"
                disabled={loadingProfile || checking || (!password && profile?.passwordConfigured !== false) || !profile?.hostname}
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
      </div>
    </section>
  );
}
export default Lockcard;
