"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Maximize,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { api } from "../../lib/api";
import "./Lockcard.css";

gsap.registerPlugin(Draggable);

type LockProfile = {
  id: string;
  hostname: string;
  displayName: string;
  locked: boolean;
};

type LockProfileResponse = {
  user: {
    id: string;
    hostname: string;
    displayName: string;
    role: "intern";
    locked?: boolean;
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
  onUnlock?: () => void;
};

const HOSTNAME_STORAGE_KEY = "utoolity.hostname";

function getGreeting(date: Date): string {
  const hour = date.getHours();

  if (hour < 12) return "GOOD MORNING";
  if (hour < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function getInitialProfile(hostname = ""): LockProfile {
  return {
    id: "unknown",
    hostname,
    displayName: hostname ? "Loading profile..." : "Assigned workstation",
    locked: true,
  };
}

function Lockcard({ socketDisconnected, onUnlock }: LockcardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const draggableRef = useRef<Draggable[]>([]);
  const dismissedRef = useRef(false);

  const [profile, setProfile] = useState<LockProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [hostname, setHostname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordMode, setPasswordMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  // The server render and the first browser render must use identical state.
  // Until the first effect runs, both password buttons remain disabled.
  useEffect(() => {
    setMounted(true);
  }, []);

  const canEnterPassword =
    mounted &&
    !loadingProfile &&
    profile?.locked === true &&
    hostname.trim().length > 0;

  const canSubmitUnlock =
    mounted &&
    !checking &&
    !loadingProfile &&
    profile !== null &&
    hostname.trim().length > 0;

  // A regular browser cannot read a Windows hostname itself. Ask the Next.js
  // frontend server for its hostname; use injected/saved values only as fallback.
  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const injectedHostname = (
        window as Window & { __UTOOLITY_DEVICE_HOSTNAME__?: string }
      ).__UTOOLITY_DEVICE_HOSTNAME__?.trim();
      const savedHostname = window.localStorage
        .getItem(HOSTNAME_STORAGE_KEY)
        ?.trim();

      // Ask the Next.js frontend server for its machine hostname. Browsers do
      // not have permission to read the Windows hostname directly.
      let frontendHostname = "";
      try {
        const hostnameResponse = await fetch("/internal/device-hostname", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        if (hostnameResponse.ok) {
          const payload: unknown = await hostnameResponse.json();
          if (
            typeof payload === "object" &&
            payload !== null &&
            "hostname" in payload &&
            typeof payload.hostname === "string"
          ) {
            frontendHostname = payload.hostname.trim();
          }
        } else {
          console.error(
            "Could not resolve frontend hostname:",
            hostnameResponse.status,
          );
        }
      } catch (hostnameError) {
        console.error("Could not resolve frontend hostname:", hostnameError);
      }

      // The fresh frontend hostname takes priority over any stale saved value.
      const deviceHostname =
        frontendHostname || injectedHostname || savedHostname || "";

      if (!deviceHostname) {
        if (active) {
          setHostname("");
          setProfile({
            id: "unknown",
            hostname: "",
            displayName: "Device not identified",
            locked: true,
          });
          setError(
            "This browser has no assigned workstation identity. The device hostname must be provisioned before sign-in.",
          );
          setLoadingProfile(false);
        }
        return;
      }

      if (active) {
        setHostname(deviceHostname);
        setProfile(getInitialProfile(deviceHostname));
      }

      try {
        const response = await api<LockProfileResponse>(
          `/api/lockscreen/me?hostname=${encodeURIComponent(deviceHostname)}`,
        );

        if (!active) return;

        const user = response?.user;
        if (!user || user.id === "guest") {
          setProfile({
            id: "guest",
            hostname: deviceHostname,
            displayName: "Unregistered workstation",
            locked: true,
          });
          setError("This workstation is not registered on the server.");
          return;
        }

        setProfile({
          id: user.id,
          hostname: user.hostname,
          displayName: user.displayName,
          locked: true,
        });
        setError("");
      } catch (cause) {
        if (!active) return;

        console.error("Failed to load lockscreen profile:", cause);
        setProfile(getInitialProfile(deviceHostname));
        setError(
          cause instanceof Error
            ? `Unable to load the device profile: ${cause.message}`
            : "Unable to contact the backend. Check the API URL and server.",
        );
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  // Initialize the clock after hydration and update every second.
  useEffect(() => {
    const update = () => setNow(new Date());
    update();

    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const dismissCard = useCallback(() => {
    const card = cardRef.current;

    if (!card || dismissedRef.current) return;
    dismissedRef.current = true;

    gsap.to(card, {
      y: -(window.innerHeight + card.offsetHeight + 80),
      opacity: 0,
      duration: 0.65,
      ease: "power3.in",
      overwrite: true,
    });
  }, []);

  // Enable drag-to-dismiss only while disconnected and locked.
  useEffect(() => {
    const card = cardRef.current;

    if (!card || !socketDisconnected || !profile?.locked) {
      draggableRef.current.forEach((instance) => instance.kill());
      draggableRef.current = [];
      return;
    }

    let active = true;

    async function initializeDraggable() {
      const { Draggable: DraggablePlugin } = await import("gsap/Draggable");
      if (!active || !cardRef.current) return;

      gsap.registerPlugin(DraggablePlugin);
      draggableRef.current.forEach((instance) => instance.kill());

      draggableRef.current = DraggablePlugin.create(card, {
        type: "x,y",
        trigger: card,
        dragClickables: false,
        minimumMovement: 2,
        onPress() {
          gsap.to(card, {
            scale: 0.995,
            duration: 0.12,
            overwrite: true,
          });
        },
        onRelease() {
          gsap.to(card, {
            scale: 1,
            duration: 0.15,
            overwrite: true,
          });
        },
        onDragEnd() {
          dismissCard();
        },
      });
    }

    void initializeDraggable();

    return () => {
      active = false;
      draggableRef.current.forEach((instance) => instance.kill());
      draggableRef.current = [];
    };
  }, [socketDisconnected, profile?.locked, dismissCard]);

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const assignedHostname = hostname.trim();

    if (!assignedHostname) {
      setError(
        "This browser has no assigned workstation identity. Contact the administrator to enroll this device.",
      );
      return;
    }

    if (!password || checking) return;

    setChecking(true);
    setError("");

    try {
      // Refresh the profile using the provisioned workstation hostname.
      const profileResponse = await api<LockProfileResponse>(
        `/api/lockscreen/me?hostname=${encodeURIComponent(assignedHostname)}`,
      );
      const candidate = profileResponse?.user;

      if (!candidate || candidate.id === "guest") {
        setProfile({
          id: "guest",
          hostname: assignedHostname,
          displayName: "Unregistered workstation",
          locked: true,
        });
        setError("This workstation is not registered on the server.");
        return;
      }

      // The user is only asked for the password. The hostname comes from the
      // enrolled device identity, not from a form field.
      const response = await api<UnlockResponse>("/api/lockscreen/unlock", {
        method: "POST",
        body: JSON.stringify({
          hostname: assignedHostname,
          password,
        }),
      });

      if (!response?.success) {
        setError("Unable to unlock this device.");
        return;
      }

      const authenticatedUser = response.user ?? candidate;

      setProfile({
        id: authenticatedUser.id,
        hostname: authenticatedUser.hostname,
        displayName: authenticatedUser.displayName,
        locked: false,
      });
      setHostname(authenticatedUser.hostname);
      window.localStorage.setItem(
        HOSTNAME_STORAGE_KEY,
        authenticatedUser.hostname,
      );

      onUnlock?.();

      gsap.to(cardRef.current, {
        y: -(window.innerHeight + 100),
        opacity: 0,
        duration: 0.65,
        ease: "power3.in",
        overwrite: true,
      });
    } catch (cause) {
      console.error("Lockscreen authentication failed:", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Authentication failed. Please try again.",
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
    const handleFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  return (
    <section
      ref={cardRef}
      aria-label="Lock screen"
      className="lockcard relative isolate flex h-full min-h-140 w-full select-text flex-col items-center justify-center overflow-hidden rounded-xl border border-white/8 text-foreground shadow-2xl"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="lockcard-glow lockcard-glow-blue" />
        <div className="lockcard-glow lockcard-glow-purple" />
        <div className="lockcard-glow lockcard-glow-pink" />
        <div className="lockcard-glow lockcard-glow-teal" />
        <div className="absolute inset-0 bg-background/15 backdrop-blur-[75px]" />
        <div className="absolute inset-0 bg-linear-to-br from-white/4 via-transparent to-black/20" />
      </div>

      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className="absolute top-4 right-4 z-20 flex size-11 items-center justify-center rounded-full border border-white/8 bg-black/25 text-white/80 shadow-lg backdrop-blur-xl transition hover:bg-black/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Maximize className="size-4.25" />
      </button>

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center px-5 py-12 text-center">
        <p className="mb-3 text-xs font-bold tracking-[0.2em] text-white/65 sm:text-sm">
          {now ? getGreeting(now) : "\u00A0"}
        </p>

        <time
          dateTime={now?.toISOString()}
          suppressHydrationWarning
          className="font-sans text-[clamp(5rem,15vw,11.5rem)] leading-none font-black tracking-[-0.085em] text-white/90 tabular-nums"
        >
          {now
            ? now.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : "--:--"}
        </time>

        <p className="mt-5 text-base font-semibold tracking-tight text-white/75 sm:text-xl">
          {now
            ? now.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "\u00A0"}
        </p>

        <div className="mt-12 flex w-full flex-col items-center">
          <div className="mb-4 flex size-20.5 items-center justify-center rounded-full border-2 border-white/25 bg-white/10 shadow-[0_0_0_4px_rgba(255,255,255,0.05)]">
            <LockKeyhole className="size-8 text-white/85" />
          </div>

          <h1 className="max-w-full wrap-break-word text-lg font-bold tracking-tight text-white/90">
            {loadingProfile
              ? "Loading profile..."
              : profile?.displayName ?? "Assigned workstation"}
          </h1>

          {profile?.hostname && (
            <p className="mt-1 text-xs tracking-wide text-white/45">
              {profile.hostname}
            </p>
          )}

          {error && !passwordMode && (
            <p role="alert" className="mt-3 max-w-md text-sm text-destructive">
              {error}
            </p>
          )}

          {!passwordMode ? (
            <>
              <p className="mt-7 text-sm text-white/55">
                {socketDisconnected ? "Drag to dismiss" : "Tap to unlock"}
              </p>

              <button
                type="button"
                disabled={!canEnterPassword}
                onClick={() => {
                  setError("");
                  setPasswordMode(true);
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/7 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LockKeyhole className="size-4" />
                Enter password
                <ArrowRight className="size-3.5" />
              </button>
            </>
          ) : (
            <form
              onSubmit={handleUnlock}
              className="mt-6 w-full max-w-xs space-y-3 text-left"
            >
              <label
                htmlFor="lockcard-password"
                className="block text-sm font-medium text-white/80"
              >
                Password
              </label>

              <div className="flex items-center rounded-xl border border-white/15 bg-background/25 backdrop-blur-xl focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                <input
                  id="lockcard-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={checking}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="mr-2 rounded-md p-2 text-white/60 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmitUnlock}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldCheck className="size-4" />
                {checking ? "Verifying..." : "Unlock"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPasswordMode(false);
                  setPassword("");
                  setError("");
                }}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm text-white/60 hover:text-white"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            </form>
          )}
        </div>
      </div>

      {socketDisconnected && (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/60 backdrop-blur-xl">
          <WifiOff className="size-3.5" />
          Connection lost
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 h-1.25 w-30 -translate-x-1/2 rounded-full bg-white/30" />
    </section>
  );
}

export default Lockcard;
