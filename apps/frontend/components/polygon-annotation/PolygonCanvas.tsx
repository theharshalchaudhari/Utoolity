'use client';

import React, { useRef, useEffect } from 'react';
import { Point, PolygonAnnotation } from '../../hooks/usePolygonAnnotation';

interface CanvasProps {
  imageSrc: string | null;
  points: Point[];
  polygons: PolygonAnnotation[];
  onCanvasClick: (point: Point) => void;
}

export const PolygonCanvas: React.FC<CanvasProps> = ({
  imageSrc,
  points,
  polygons,
  onCanvasClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw completed polygons
    polygons.forEach((poly) => {
      if (poly.points.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(poly.points[0].x, poly.points[0].y);
      poly.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw current active points and connecting lines
    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
      });
    }
  }, [points, polygons]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onCanvasClick({ x, y });
  };

  return (
    <div className="relative border rounded-lg overflow-hidden bg-slate-900 flex justify-center items-center w-fit mx-auto">
      {imageSrc && (
        <img
          src={imageSrc}
          alt="Annotation Target"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onClick={handleClick}
        className="cursor-crosshair z-10 relative"
      />
    </div>
  );
};