"use client";

import { useCallback, useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { api, ApiError } from "../../lib/api";

type ProfileData = {
  id: string;
  hostname: string;
  displayName: string;
  role: "intern";
};

type ProfileResponse = {
  user: ProfileData;
};

type ProfileLoadState = "loading" | "authenticated" | "unauthenticated" | "error";

type ProfileProps = {
  onSleep?: () => void;
};

export default function Profile({ onSleep }: ProfileProps) {

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileState, setProfileState] =
    useState<ProfileLoadState>("loading");
  const [profileError, setProfileError] = useState("");

  const loadProfile = useCallback(async () => {
    setProfileState("loading");
    setProfileError("");

    try {
      const payload = await api<ProfileResponse>("/api/auth/me");
      setProfile(payload.user);
      setProfileState("authenticated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const isUnauthenticated =
        error instanceof ApiError && error.status === 401;

      if (isUnauthenticated) {
        setProfile(null);
        setProfileState("unauthenticated");
        return;
      }

      // Keep the cached authenticated profile on transient network/server errors.
      setProfileState((current) => current === "authenticated" ? "authenticated" : "error");

      console.error("Failed to load authenticated profile:", error);
      setProfileError("Your session could not be verified. Please sign in again.");
    }
  }, []);

  useEffect(() => {
    // The lock screen caches the verified profile on unlock. Reuse it instead
    // of repeating /api/auth/me on every desktop mount.
    try {
      const cached = localStorage.getItem("utoolity.cached-user");
      if (cached) {
        const user = JSON.parse(cached) as ProfileData;
        if (user?.id && user.hostname && user.displayName) {
          setProfile(user);
          setProfileState("authenticated");
          return;
        }
      }
    } catch {
      localStorage.removeItem("utoolity.cached-user");
    }
    void loadProfile();
  }, [loadProfile]);

  const handleProfileClick = () => {
    onSleep?.();
  };

  if (profileState === "loading" || profileState === "unauthenticated") {
    return (
      <div className="fixed left-5 top-4 z-50 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground shadow-lg">
        {profile?.displayName ?? "Profile"}
      </div>
    );
  }

  if (profileState === "error" || !profile) {
    return (
      <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <UserRound className="size-10 text-muted-foreground" />
        <h1 className="text-xl font-bold">Session unavailable</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {profileError || "Your authenticated profile is not available."}
        </p>
        <button
          type="button"
          onClick={() => void loadProfile()}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  const displayName = profile.displayName;

  return (
    <button
      type="button"
      onClick={handleProfileClick}
      aria-label={`Profile: ${displayName}. Click to sleep`}
      title="Sleep workstation"
      className="fixed left-5 top-4 z-50 flex max-w-[min(320px,calc(100vw-40px))] items-center gap-2.5 rounded-full border border-white/15 bg-background/70 px-3.5 py-2 text-foreground shadow-lg backdrop-blur-xl transition hover:border-primary/40 hover:bg-background/90 active:scale-[0.98]"
    >

      <h1 className="max-w-full wrap-break-word text-base font-bold text-foreground">
        {displayName}
      </h1>
    </button>
  );
}