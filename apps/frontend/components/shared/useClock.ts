import { useSyncExternalStore } from "react";

let currentTime = new Date();
let clockTimer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function notify() {
  currentTime = new Date();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (listeners.size === 1) {
    clockTimer = setInterval(notify, 1000);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

function getSnapshot() {
  return currentTime;
}

function getServerSnapshot() {
  return new Date(0);
}

export function useClock() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
