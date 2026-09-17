"use client";

/**
 * Keyboard shortcuts, using the desktop app's bindings so muscle memory
 * carries over: V select, W polygon, B rectangle, C circle, G freehand,
 * S save and advance, N file under no_roi, ? for the shortcut sheet.
 *
 * Bindings are skipped while the user is typing in a field, and a binding that
 * would otherwise collide with the browser's own (Ctrl+Z, Ctrl+S) is claimed
 * with preventDefault.
 */

import { useEffect } from "react";

export interface ShortcutHandlers {
  [combo: string]: (() => void) | undefined;
}

function comboFor(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("ctrl");
  if (event.shiftKey) parts.push("shift");
  if (event.altKey) parts.push("alt");
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  parts.push(key);
  return parts.join("+");
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * @param handlers combo -> action, e.g. `{ "ctrl+z": undo, v: select }`
 * @param enabled  false unmounts the listener, e.g. while no batch is open
 */
export function useShortcuts(handlers: ShortcutHandlers, enabled = true): void {
  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (isTyping(event.target)) return;
      const handler = handlers[comboFor(event)];
      if (!handler) return;
      event.preventDefault();
      handler();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handlers]);
}
