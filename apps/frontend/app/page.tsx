"use client";

import { useEffect, useState } from "react";
import Desktop from "@/components/desktop/Desktop";
import Lockcard from "@/components/lockscreen/LockcardEntry";
import { api } from "@/lib/api";
import Image from "next/image";

type ShellState = "checking" | "authenticated" | "sleep" | "locked";
const AUTHENTICATED_SESSION_KEY = "utoolity.authenticated";

export default function Home() {
  const [shellState, setShellState] = useState<ShellState>("checking");

  useEffect(() => {
    let active = true;

    async function verifySession() {
      try {
        await api("/api/auth/me");
        if (active) {
          sessionStorage.setItem(AUTHENTICATED_SESSION_KEY, "true");
          setShellState("authenticated");
        }
      } catch {
        if (active) {
          sessionStorage.removeItem(AUTHENTICATED_SESSION_KEY);
          setShellState("locked");
        }
      }
    }

    void verifySession();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative isolate h-dvh min-h-dvh overflow-hidden bg-background font-sans text-foreground">
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
      ) : shellState === "authenticated" ? (
        <Desktop onSleep={() => setShellState("sleep")} />
      ) : (
        <Lockcard
          socketDisconnected={false}
          initialAuthenticated={shellState === "sleep"}
          initialState={shellState === "sleep" ? "sleep" : "locked"}
          onUnlock={() => {
            sessionStorage.setItem(AUTHENTICATED_SESSION_KEY, "true");
            setShellState("authenticated");
          }}
        />
      )}
    </div>
  );
}