"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@repo/ui/lib/utils"
import { Button } from "@repo/ui/shadcn/button"

function Dialog(
  props: React.ComponentProps<typeof DialogPrimitive.Root>
) {
  return (
    <DialogPrimitive.Root
      data-slot="dialog"
      {...props}
    />
  )
}

function DialogTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>
) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      {...props}
    />
  )
}

function DialogPortal(
  props: React.ComponentProps<typeof DialogPrimitive.Portal>
) {
  return (
    <DialogPrimitive.Portal
      data-slot="dialog-portal"
      {...props}
    />
  )
}

function DialogClose(
  props: React.ComponentProps<typeof DialogPrimitive.Close>
) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      {...props}
    />
  )
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm",
        "data-[state=open]:animate-in",
        "data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0",
        "data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />

      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          [
            "fixed",
            "left-1/2",
            "top-1/2",
            "z-[9999]",
            "grid",
            "w-full",
            "max-w-lg",
            "-translate-x-1/2",
            "-translate-y-1/2",
            "gap-4",
            "rounded-xl",
            "border",
            "border-border",
            "bg-card",
            "text-card-foreground",
            "p-6",
            "shadow-2xl",
            "outline-none",
            "data-[state=open]:animate-in",
            "data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0",
            "data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95",
            "data-[state=closed]:zoom-out-95",
          ].join(" "),
          className
        )}
        {...props}
      >
        {children}

        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              "absolute",
              "left-4",
              "top-4",
              "inline-flex",
              "h-8",
              "w-8",
              "items-center",
              "justify-center",
              "rounded-md",
              "text-muted-foreground",
              "transition-colors",
              "hover:bg-accent",
              "hover:text-foreground"
            )}
          >
            <XIcon className="h-7 w-7" />

          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-2 text-center sm:text-left",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}

      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">
            Close
          </Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-lg font-semibold leading-none",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}