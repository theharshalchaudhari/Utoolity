"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

type PreferencesResponse = {
  preferences: Record<string, string>;
};

export function useUserPreference<T extends string>(
  key: string,
  defaultValue: T,
) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const preferenceChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; value?: string }>).detail;
      if (detail?.key === key && typeof detail.value === "string") {
        setValue(detail.value as T);
      }
    };
    window.addEventListener("utoolity:preference-changed", preferenceChanged);

    const localValue = localStorage.getItem(key);
    if (localValue) setValue(localValue as T);

    void api<PreferencesResponse>("/api/auth/preferences")
      .then(({ preferences }) => {
        const savedValue = preferences[key];
        if (savedValue) {
          setValue(savedValue as T);
          localStorage.setItem(key, savedValue);
        }
      })
      .catch(() => {
        // Local preferences remain usable when the session is unavailable.
      });

    return () =>
      window.removeEventListener("utoolity:preference-changed", preferenceChanged);
  }, [key]);

  const update = (nextValue: T) => {
    setValue(nextValue);
    localStorage.setItem(key, nextValue);
    window.dispatchEvent(
      new CustomEvent("utoolity:preference-changed", {
        detail: { key, value: nextValue },
      }),
    );
    void api("/api/auth/preferences", {
      method: "PATCH",
      body: JSON.stringify({ [key]: nextValue }),
    }).catch(() => undefined);
  };

  return [value, update] as const;
}
