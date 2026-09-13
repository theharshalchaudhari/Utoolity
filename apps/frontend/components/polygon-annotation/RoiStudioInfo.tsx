import { Button } from "@repo/ui/shadcn/button";

const SOURCE_URL =
  "https://github.com/theharshalchaudhari/Utoolity/tree/main/apps/roi-studio";

const FEATURES: string[] = [
  "Polygon, rectangle, circle and freehand ROI tools",
  "Multiple ROIs per image with vertex editing, move, duplicate and delete",
  "Undo / redo, zoom and pan, fully rebindable keyboard shortcuts",
  "Copy ROIs onto any set of images from the same camera",
  "Pixel and normalized coordinates saved to .xlsx and JSON",
  "COCO, YOLO, Pascal VOC and binary mask exports",
  "Self-contained HTML batch report and coverage stats",
  "Atomic saves, backups, crash recovery and an audit log",
];

const SETUP_COMMANDS = `cd apps/roi-studio
python bootstrap.py --shortcut --run

# or, from the repository root
pnpm --filter roi-studio setup
pnpm roi-studio`;

export default function RoiStudioInfo() {
  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-6 text-card-foreground">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">ROI Studio</h2>
        <p className="text-muted-foreground">
          Polygon ROI annotation for camera image batches. ROI Studio is a desktop
          application for Windows, macOS and Linux, so it runs natively on your
          machine rather than in the browser.
        </p>
        <p className="text-sm text-muted-foreground">
          Author: <span className="font-medium text-foreground">Ashaz Qureshi</span>
        </p>
      </header>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Features</h3>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Get started</h3>
        <p className="text-muted-foreground">Requires Python 3.9 or newer.</p>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-sm text-foreground">
          <code>{SETUP_COMMANDS}</code>
        </pre>
      </div>

      <Button asChild>
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          View ROI Studio source
        </a>
      </Button>
    </section>
  );
}
