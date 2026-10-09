"use client";

import { AppWindow } from "lucide-react";

type Props = {
  onClick?: () => void;
};

export default function AllWindows({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="All windows (Alt + A)"
      aria-label="All windows"
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/75 text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
    >
      <AppWindow size={17} strokeWidth={1.9} />
    </button>
  );
}