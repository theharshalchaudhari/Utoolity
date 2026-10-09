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
  }, [key]);

  const update = (nextValue: T) => {
    setValue(nextValue);
    localStorage.setItem(key, nextValue);
    void api("/api/auth/preferences", {
      method: "PATCH",
      body: JSON.stringify({ [key]: nextValue }),
    }).catch(() => undefined);
  };

  return [value, update] as const;
}
