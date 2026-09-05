import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  src: string;
  alt: string;
  href?: string;
  size?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({
  src,
  alt,
  href = "/",
  size = 48,
  className = "",
  priority = false,
}: LogoProps) {
  const logo = (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`
        object-contain
        transition-opacity duration-300
        hover:opacity-80
        ${className}
      `}
    />
  );

  if (!href) return logo;

  return (
    <Link
      href={href}
      aria-label={alt}
      className="shrink-0 inline-flex"
    >
      {logo}
    </Link>
  );
}