import Link from "next/link";

import { LayoutDashboard } from "lucide-react";

import { Button } from "@repo/ui/shadcn/button";

import RoiStudioWorkspace from "@/components/polygon-annotation/RoiStudioWorkspace";
import ThemeToggle from "@/components/shared/ThemeToggle";

export const metadata = {
  title: "Polygon ROI Annotation",
  description:
    "Draw polygon regions of interest on a folder of camera images, in the browser.",
};

export default function PolygonAnnotationPage() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-foreground text-3xl font-bold">Polygon ROI Annotation</h1>
          <p className="text-muted-foreground text-sm">
            Images are read and results written on your own machine — nothing is
            uploaded.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">
              <LayoutDashboard />
              Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <RoiStudioWorkspace />
    </div>
  );
}
