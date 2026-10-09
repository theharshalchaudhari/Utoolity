"use client";

import { useEffect } from "react";

function applyDeviceTheme(mediaQuery: MediaQueryList) {
  const savedTheme = localStorage.getItem("utoolity.theme");
  const theme =
    savedTheme === "dark" || (savedTheme !== "light" && mediaQuery.matches)
      ? "dark"
      : "light";
  const root = document.documentElement;

  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

export default function DeviceTheme() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => applyDeviceTheme(mediaQuery);

    handleThemeChange();
    mediaQuery.addEventListener("change", handleThemeChange);

    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, []);

  return null;
}
