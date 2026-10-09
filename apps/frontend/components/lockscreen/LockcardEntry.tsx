"use client";

import dynamic from "next/dynamic";

const Lockcard = dynamic(() => import("./lockcard"), {
  ssr: false,
  loading: () => (
    <section
      aria-label="Lock screen"
      className="lockscreen-shell lockscreen-wallpaper flex h-full min-h-dvh w-full items-center justify-center rounded-xl"
    >
      <span className="text-sm text-muted-foreground">Loading lock screen...</span>
    </section>
  ),
});

export default Lockcard;
