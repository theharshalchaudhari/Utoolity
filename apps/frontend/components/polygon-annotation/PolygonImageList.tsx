"use client";

type ImageItem = { name: string };

type Props = {
  images: ImageItem[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
};

export default function PolygonImageList({ images, selectedIndex, onSelect }: Props) {
  return (
    <div className="space-y-1">
      {images.map((image, index) => (
        <button
          key={`${image.name}-${index}`}
          type="button"
          onClick={() => onSelect(index)}
          title={image.name}
          className={`w-full truncate rounded-md border px-2.5 py-2 text-left text-xs transition ${
            selectedIndex === index
              ? "border-sidebar-primary bg-sidebar-primary/15 text-sidebar-primary"
              : "border-transparent hover:border-sidebar-border hover:bg-sidebar-accent"
          }`}
        >
          {image.name}
        </button>
      ))}
    </div>
  );
}
