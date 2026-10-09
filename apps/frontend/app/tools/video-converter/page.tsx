"use client";

import VideoUploader from "@/components/video-converter/VideoUploader";
import ConversionSettings from "@/components/video-converter/ConversionSettings";
import ConversionProgress from "@/components/video-converter/ConversionProgress";

import { useVideoConverter } from "@/hooks/useVideoConverter";

export default function VideoConverterPage() {
  const {
    files,
    resolution,
    compression,
    isConverting,
    error,
    setResolution,
    setCompression,
    addFiles,
    removeFile,
    clearFiles,
    convert,
  } = useVideoConverter();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-350 px-5 py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* LEFT SIDE */}
          <div className="min-w-0">
            <VideoUploader
              files={files}
              onFilesSelected={addFiles}
              disabled={isConverting}
            />

            {files.length > 0 && (
              <div className="mt-5">
                <ConversionProgress
                  files={files}
                  onRemove={removeFile}
                  disabled={isConverting}
                />
              </div>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="min-w-0">
            <ConversionSettings
              resolution={resolution}
              compression={compression}
              onResolutionChange={setResolution}
              onCompressionChange={setCompression}
              disabled={isConverting}
              hasFiles={files.length > 0}
              isConverting={isConverting}
              onConvert={convert}
              onClear={clearFiles}
            />

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
              >
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}