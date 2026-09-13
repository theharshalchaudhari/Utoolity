import RoiStudioInfo from "@/components/polygon-annotation/RoiStudioInfo";

export default function PolygonAnnotationPage() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <h1 className="text-3xl font-bold text-foreground">Polygon ROI Annotation</h1>
      <RoiStudioInfo />
    </div>
  );
}
