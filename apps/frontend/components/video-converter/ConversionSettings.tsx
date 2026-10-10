"use client";

import { Check, ChevronDown, Gauge, Loader2, Video, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/shadcn/select";
import type { Compression, Resolution } from "@/api/videoConverter.api";

interface ConversionSettingsProps {
  resolution: Resolution;
  compression: Compression;
  onResolutionChange: (value: Resolution) => void;
  onCompressionChange: (value: Compression) => void;
  disabled?: boolean;
  hasFiles: boolean;
  isConverting: boolean;
  onConvert: () => void;
  onClear: () => void;
}

const resolutionOptions = [
  { value: "original", label: "Original", description: "Keep source resolution" },
  { value: "720p", label: "720p", description: "HD · 1280 × 720 maximum" },
  { value: "1080p", label: "1080p", description: "Full HD · 1920 × 1080 maximum" },
] as const;

const compressionOptions = [
  { value: "low", label: "Low", description: "Higher quality, larger file" },
  { value: "medium", label: "Medium", description: "Balanced quality and size" },
  { value: "high", label: "High", description: "Smaller output file" },
] as const;

export default function ConversionSettings({
  resolution,
  compression,
  onResolutionChange,
  onCompressionChange,
  disabled = false,
  hasFiles,
  isConverting,
  onConvert,
  onClear,
}: ConversionSettingsProps) {
  return (
    <aside className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Gauge className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">Convert to MP4</h2>
          <p className="mt-1 text-xs text-muted-foreground">H.264 video · AAC audio</p>
        </div>
      </div>

      <div className="my-5 h-px bg-border/70" />

      <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Video className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">MP4</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Widely compatible video format
            </p>
          </div>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Resolution
          </label>
          <Select
            value={resolution}
            disabled={disabled}
            onValueChange={(value) => onResolutionChange(value as Resolution)}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-border/70 bg-background">
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent className="z-50 border border-border bg-popover text-popover-foreground shadow-xl" position="popper" sideOffset={6}>
              {resolutionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="cursor-pointer rounded-lg py-2.5">
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Compression
          </label>
          <Select
            value={compression}
            disabled={disabled}
            onValueChange={(value) => onCompressionChange(value as Compression)}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-border/70 bg-background">
              <SelectValue placeholder="Select compression" />
            </SelectTrigger>
            <SelectContent className="z-50 border border-border bg-popover text-popover-foreground shadow-xl" position="popper" sideOffset={6}>
              {compressionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="cursor-pointer rounded-lg py-2.5">
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        <Button
          type="button"
          className="h-11 w-full rounded-full text-sm font-medium shadow-sm"
          disabled={!hasFiles || disabled}
          onClick={onConvert}
        >
          {isConverting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Converting…
            </>
          ) : (
            <>
              Convert to MP4
              <ChevronDown className="ml-2 h-4 w-4 -rotate-90" />
            </>
          )}
        </Button>

        {hasFiles && (
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full rounded-full text-muted-foreground"
            disabled={isConverting}
            onClick={onClear}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear selected videos
          </Button>
        )}
      </div>
    </aside>
  );
}
