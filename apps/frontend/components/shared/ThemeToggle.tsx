"use client";

/**
 * Light / dark switch.
 *
 * `@repo/theme` defines its dark palette under a `.dark` class
 * (`@custom-variant dark (&:is(.dark *))`), so switching theme means toggling
 * that one class on `<html>`. Nothing in the app set it before, which is why
 * the dark palette was unreachable.
 *
 * The class on `<html>` *is* the state — it is read back rather than
 * duplicated into React, so the button can never disagree with the page. The
 * choice is remembered per browser and falls back to the operating system's
 * preference; `THEME_BOOTSTRAP` applies it before the first paint so the page
 * never flashes the wrong palette.
 */

import { useCallback, useSyncExternalStore } from "react";

import { Moon, Sun } from "lucide-react";

import { Button } from "@repo/ui/shadcn/button";

export const THEME_KEY = "utoolity-theme";

type Mode = "light" | "dark";

/**
 * Inlined into <head> by the root layout. Kept as a string because it has to
 * run before React does.
 */
export const THEME_BOOTSTRAP = `
(function(){try{
var stored=localStorage.getItem(${JSON.stringify(THEME_KEY)});
var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.classList.toggle("dark",dark);
}catch(e){}})();
`.trim();

/** Subscribers for changes this tab makes itself. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // another tab switching theme, or the OS preference changing
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Mode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** The server cannot know the preference; the bootstrap script fixes it up. */
function getServerSnapshot(): Mode {
  return "light";
}

export default function ThemeToggle({ className }: { className?: string }) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = mode === "dark";

  const toggle = useCallback(() => {
    const next: Mode = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // private browsing: the class still applies, only the memory is lost
    }
    for (const onChange of listeners) onChange();
  }, []);

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      className={className}
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
