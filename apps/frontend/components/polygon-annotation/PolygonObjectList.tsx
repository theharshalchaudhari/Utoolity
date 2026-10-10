"use client";

type Polygon = { id: string; label: string; points: unknown[] };

export default function PolygonObjectList({
  polygons,
  selectedId,
  onSelect,
}: {
  polygons: Polygon[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      {polygons.map((polygon, index) => (
        <div
          key={polygon.id}
          onClick={() => onSelect?.(polygon.id)}
          className={`flex items-center justify-between gap-2 rounded-md border p-2 text-xs ${
            selectedId === polygon.id
              ? "border-sidebar-primary bg-sidebar-primary/15"
              : "border-sidebar-border bg-sidebar-accent/50"
          }`}
        >
          <span className="truncate">{index + 1}. {polygon.label}</span>
          <span className="shrink-0 text-sidebar-foreground/60">{polygon.points.length}</span>
        </div>
      ))}
    </div>
  );
}
