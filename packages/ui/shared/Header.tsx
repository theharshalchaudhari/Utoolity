import * as React from "react";
import Link from "next/link";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@repo/ui/lib/utils";

const headerVariants = cva(
  [
    "sticky top-0 z-50 w-full",
    "border-b border-border",
    "bg-background text-foreground",
  ],
  {
    variants: {
      variant: {
        default: "",

        elevated: [
          "shadow-sm",
        ],

        floating: [
          "mx-auto mt-4 max-w-7xl rounded-(--radius)",
          "border",
          "shadow-sm",
        ],

        minimal: [
          "border-transparent",
        ],
      },

      size: {
        sm: "h-14",
        default: "h-16",
        lg: "h-20",
      },

      container: {
        default: "max-w-7xl",
        narrow: "max-w-5xl",
        full: "max-w-full",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
      container: "default",
    },
  }
);

const navItemVariants = cva(
  [
    "inline-flex items-center justify-center",
    "rounded-(--radius)",
    "px-4 py-2",
    "text-sm font-medium",
    "transition-colors",
    "outline-none",
    "text-muted-foreground",
    "hover:bg-accent",
    "hover:text-accent-foreground",
    "focus-visible:ring-[3px]",
    "focus-visible:ring-ring/50",
  ]
);

export interface HeaderNavItem {
  label: string;
  href: string;
}

interface HeaderProps
  extends VariantProps<typeof headerVariants> {
  logo: React.ReactNode;
  navigation: HeaderNavItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function Header({
  logo,
  navigation,
  actions,
  variant,
  size,
  container,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        headerVariants({
          variant,
          size,
        }),
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-full items-center justify-between px-4 md:px-6",
          container === "full"
            ? "max-w-full"
            : container === "narrow"
              ? "max-w-5xl"
              : "max-w-7xl"
        )}
      >
        <div className="flex shrink-0 items-center">
          {logo}
        </div>

        <nav
          aria-label="Main Navigation"
          className="hidden items-center gap-2 md:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(navItemVariants())}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}