"use client";

import {
Check,
ChevronDown,
Gauge,
Loader2,
Video,
} from "lucide-react";

import { Button } from "@repo/ui/shadcn/button";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@repo/ui/shadcn/select";

import type {
Compression,
Resolution,
} from "@/api/videoConverter.api";

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
{
value: "original",
label: "Original",
description: "Keep original resolution",
},
{
value: "720p",
label: "720p",
description: "HD resolution",
},
{
value: "1080p",
label: "1080p",
description: "Full HD resolution",
},
] as const;

const compressionOptions = [
{
value: "low",
label: "Low",
description: "Better quality, larger file",
},
{
value: "medium",
label: "Medium",
description: "Balanced quality and size",
},
{
value: "high",
label: "High",
description: "Smaller file size",
},
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
<aside className="w-full">
<div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
{/* Header */}
<div>
<div className="flex items-center gap-3">
<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
<Gauge className="h-5 w-5" />
</div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold text-card-foreground">
            Convert to MP4
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            H.264 video with AAC audio
          </p>
        </div>
      </div>

      <div className="mt-5 h-px bg-border" />

      <p className="mt-5 text-sm leading-6 text-muted-foreground">
        Convert your video to a high-quality MP4 file with H.264
        encoding.
      </p>
    </div>

    {/* Output */}
    <div className="mt-7">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Output
      </p>

      <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Video className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              MP4
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              H.264 video + AAC audio
            </p>
          </div>
        </div>

        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>

    {/* Resolution */}
    <div className="mt-5">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Resolution
      </label>

      <Select
        value={resolution}
        disabled={disabled}
        onValueChange={(value) =>
          onResolutionChange(value as Resolution)
        }
      >
        <SelectTrigger className="h-12 w-full rounded-xl border-border bg-background">
          <SelectValue placeholder="Select resolution" />
        </SelectTrigger>

        <SelectContent
          className="z-50 border border-border bg-popover text-popover-foreground shadow-xl"
          position="popper"
          sideOffset={6}
        >
          {resolutionOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="cursor-pointer rounded-lg py-3 focus:bg-muted"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {option.label}
                </span>

                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Compression */}
    <div className="mt-5">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Compression
      </label>

      <Select
        value={compression}
        disabled={disabled}
        onValueChange={(value) =>
          onCompressionChange(value as Compression)
        }
      >
        <SelectTrigger className="h-12 w-full rounded-xl border-border bg-background">
          <SelectValue placeholder="Select compression" />
        </SelectTrigger>

        <SelectContent
          className="z-50 border border-border bg-popover text-popover-foreground shadow-xl"
          position="popper"
          sideOffset={6}
        >
          {compressionOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="cursor-pointer rounded-lg py-3 focus:bg-muted"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {option.label}
                </span>

                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Actions */}
    <div className="mt-7 space-y-2">
      <Button
        type="button"
        className="h-12 w-full rounded-xl text-sm font-semibold"
        disabled={!hasFiles || disabled}
        onClick={onConvert}
      >
        {isConverting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Converting...
          </>
        ) : (
          <>
            Convert to MP4
            <ChevronDown className="ml-2 h-4 w-4 rotate-[-90deg]" />
          </>
        )}
      </Button>

      {hasFiles && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={isConverting}
          onClick={onClear}
        >
          Clear selected videos
        </Button>
      )}
    </div>
  </div>
</aside>


);
}