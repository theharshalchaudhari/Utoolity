"use client";

import Image from "next/image";

export default function DesktopBackground() {
  return (
    <div
      aria-hidden="true"
      className="desktop-background pointer-events-none fixed inset-0 -z-10 isolate overflow-hidden bg-background"
    >
      <div className="desktop-background-wash absolute inset-0" />

      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/Logo.svg"
          alt=""
          width={360}
          height={360}
          priority
          className="desktop-logo h-[min(42vw,42vh,360px)] w-[min(42vw,42vh,360px)] object-contain opacity-90"
        />
      </div>

      <div className="desktop-background-vignette absolute inset-0" />
    </div>
  );
}