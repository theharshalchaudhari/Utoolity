import React from "react";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export function Icon({
  name,
  size = 23,
  className = "",
}: IconProps) {
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
        maskImage: `url("/${name}.svg")`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskImage: `url("/${name}.svg")`,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
      }}
    />
  );
}