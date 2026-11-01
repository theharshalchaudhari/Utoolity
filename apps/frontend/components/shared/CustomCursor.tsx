"use client";

import { useEffect, useState } from "react";
import { useUserPreference } from "@/lib/user-preference";

const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "[role='button']",
  "[role='link']",
  "summary",
  "select",
  "input[type='checkbox']",
  "input[type='radio']",
  "input[type='range']",
  "label[for]",
  ".desktop-app-icon",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type CursorPosition = {
  x: number;
  y: number;
  visible: boolean;
  interactive: boolean;
};

export default function CustomCursor() {
  const [sizeValue] = useUserPreference<string>("utoolity.cursor-size", "32");
  const [position, setPosition] = useState<CursorPosition>({
    x: 0,
    y: 0,
    visible: false,
    interactive: false,
  });

  const parsedSize = Number(sizeValue);
  const size = Number.isFinite(parsedSize)
    ? Math.min(64, Math.max(16, parsedSize))
    : 32;

  useEffect(() => {
    const updateCursor = (event: PointerEvent) => {
      // Ignore events whose target belongs to another document or is an SVG
      // instance node that cannot be safely inspected from this document.
      let target: EventTarget | null;
      try {
        target = event.composedPath()[0] ?? event.target;
        if (!(target instanceof Element)) target = null;
      } catch {
        return;
      }

      if (event.pointerType && event.pointerType !== "mouse") {
        setPosition((current) => ({ ...current, visible: false }));
        return;
      }

      let interactive = false;
      if (target) {
        try {
          interactive = Boolean(target.closest(INTERACTIVE_SELECTOR));
        } catch {
          // Cursor styling must never interrupt the underlying pointer event.
        }
      }

      setPosition({
        x: event.clientX,
        y: event.clientY,
        visible: true,
        interactive,
      });
    };

    const hideCursor = () =>
      setPosition((current) => ({ ...current, visible: false }));

    window.addEventListener("pointermove", updateCursor, { passive: true });
    window.addEventListener("pointerdown", updateCursor, { passive: true });
    window.addEventListener("blur", hideCursor);
    document.addEventListener("mouseleave", hideCursor);

    return () => {
      window.removeEventListener("pointermove", updateCursor);
      window.removeEventListener("pointerdown", updateCursor);
      window.removeEventListener("blur", hideCursor);
      document.removeEventListener("mouseleave", hideCursor);
    };
  }, []);

  // Match the original Bibata artwork's hotspots while rendering the SVG inline
  // so all colors inherit the active theme tokens instead of fixed SVG colors.
  const hotspotX = size * (position.interactive ? 0.44 : 46 / 256);
  const hotspotY = size * (position.interactive ? 0.05 : 24 / 256);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 256 256"
      className="utoolity-custom-cursor"
      style={{
        left: position.x - hotspotX,
        top: position.y - hotspotY,
        width: size,
        height: size,
        opacity: position.visible ? 1 : 0,
      }}
    >
      {position.interactive ? (
        <>
          <path
            d="M120.764 243.559C106.064 243.654 94.9315 234.669 87.33 226.47C79.4457 217.966 72.2147 206.838 65.6646 196.382C64.2676 194.152 62.8936 191.939 61.5335 189.749C56.2005 181.16 51.0808 172.915 45.6262 165.321C38.7567 155.756 32.4011 148.765 26.3033 144.633L15.5723 137.361L19.7447 125.088L21.19 121.644C21.9919 119.999 23.1992 117.834 24.9231 115.515C28.3468 110.91 34.2913 105.096 43.5504 102.37C55.11 98.9669 67.7847 101.278 81.7607 109.426V53.5426C81.7607 33.8583 92.6922 13.7197 113.92 13.7197C135.148 13.7197 146.079 33.8583 146.079 53.5426V68.5677C148.285 68.8131 150.453 69.277 152.536 69.9474C157.658 71.5961 162.433 74.4963 166.346 78.4184C171.172 77.2686 176.261 77.2401 181.23 78.443C187.462 79.9516 192.776 83.1349 196.914 87.5425C202.677 86.2935 208.508 86.7836 213.723 88.5338C228.189 93.3895 238.812 108.053 236.948 126.259L225.329 242.882L120.764 243.559Z"
            fill="var(--primary)"
            stroke="var(--foreground)"
            strokeWidth="13"
            strokeLinejoin="round"
          />
          <path
            d="M120.654 226.56L209.928 225.982L220.035 124.547C222.154 103.987 196.764 95.4317 189.716 114.404C189.805 91.6041 166.436 88.7513 159.398 104.26C160.279 85.423 136.433 78.1324 129.079 94.1164V53.5431C129.079 23.1126 98.7605 23.1126 98.7605 53.5431V144.834C48.2297 94.1168 35.8398 130.561 35.8398 130.561C70.1776 153.83 91.1807 226.751 120.654 226.56Z"
            fill="var(--primary)"
          />
        </>
      ) : (
        <path
          d="M201.163 133.54L201.149 133.528L201.134 133.515L91.6855 36.4935C86.5144 31.7659 81.4269 27.9549 76.5421 25.525C71.7671 23.1497 66.0861 21.5569 60.4133 23.1213C54.3118 24.8039 50.4875 29.4674 48.3639 34.759C46.3122 39.8715 45.4999 46.2787 45.4999 53.5383L45.4999 200.431V200.493L45.5008 200.555C45.6218 208.862 50.4279 217.843 55.9963 223.894C58.8934 227.043 62.5163 229.986 66.6704 231.742C70.9172 233.537 76.217 234.254 81.4691 231.884C85.7536 229.951 89.6754 226.055 92.8565 222.651C94.6841 220.695 96.8336 218.252 99.0355 215.749C100.71 213.847 102.414 211.91 104.03 210.126C112.189 201.122 121.346 192.286 132.161 187.407C143.013 182.511 155.809 181.375 167.963 181.146C170.959 181.089 173.85 181.087 176.65 181.085H176.663H176.686C179.447 181.083 182.164 181.081 184.662 181.019C189.231 180.906 194.643 180.609 198.777 178.88C208.711 174.723 210.972 163.838 210.753 156.445C210.521 148.596 207.57 139.272 201.163 133.54Z"
          fill="var(--primary)"
          stroke="var(--foreground)"
          strokeWidth="13"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
