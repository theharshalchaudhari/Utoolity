"use client";

import Link from "next/link";

interface LogoProps {
  href?: string;
  size?: number;
  className?: string;
}

export function Logo({ href = "/", size = 48, className = "" }: LogoProps) {
  return (
    <Link href={href} aria-label="Logo" className="shrink-0">
      <div
        role="img"
        aria-label="Logo"
        className={`bg-foreground transition-all duration-300 hover:opacity-80 ${className}`}
        style={{
          width: size,
          height: size,
          maskImage: 'url("/Logo.svg")',
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskImage: 'url("/Logo.svg")',
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
        }}
      />
    </Link>
  );
}