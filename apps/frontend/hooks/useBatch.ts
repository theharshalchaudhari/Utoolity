"use client";

/**
 * The batch: where the images came from, the row recorded for each one, and
 * which image is on screen.
 *
 * Rows are the canonical rows from `@repo/roi-core` — the same records the
 * spreadsheet and both JSON files are built from — so this hook is the single
 * place the annotation state becomes something writable.
 */

import { useCallback, useMemo, useRef, useState } from "react";

import {
  DEFAULT_CLASS,
  makeRow,
  parseMultiPolys,
  parseShapeClasses,
  parseShapeTypes,
  polysToNorm,
  polysToShapes,
  shapesToClasses,
  shapesToKinds,
  shapesToPolys,
  type CanonRow,
  type Shape,
} from "@repo/roi-core";

import {
  loadExistingRows,
  openFileBatch,
  openFolderBatch,
} from "@/services/polygonAnnotation.service";
import type { BatchSource, RowsByImage } from "@/types/roi";

export interface LoadedImage {
  name: string;
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export interface UseBatch {
  source: BatchSource | null;
  rows: RowsByImage;
  index: number;
  current: string | null;
  image: LoadedImage | null;
  loading: boolean;
  error: string | null;
  openFolder: () => Promise<boolean>;
  openFiles: (files: readonly File[]) => Promise<boolean>;
  close: () => void;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  /** Shapes recorded for an image, rebuilt from its row. */
  shapesFor: (name: string) => Shape[];
  /** Record shapes for an image, or file it as having nothing to annotate. */
  record: (name: string, shapes: readonly Shape[], comment?: string) => void;
  markNoRoi: (name: string, comment?: string) => void;
  clearRow: (name: string) => void;
  rowList: CanonRow[];
}

export function useBatch(): UseBatch {
  const [source, setSource] = useState<BatchSource | null>(null);
  const [rows, setRows] = useState<RowsByImage>({});
  const [index, setIndex] = useState(0);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // guards against a slow decode landing after the user has moved on
  const loadToken = useRef(0);

  const names = useMemo(() => source?.images.map((img) => img.name) ?? [], [source]);
  const current = names[index] ?? null;

  const decode = useCallback(
    async (batch: BatchSource, at: number) => {
      const name = batch.images[at]?.name;
      if (!name) {
        setImage(null);
        return;
      }
      const token = loadToken.current + 1;
      loadToken.current = token;
      setLoading(true);
      try {
        const file = await batch.images[at]!.getFile();
        const bitmap = await createImageBitmap(file);
        if (loadToken.current !== token) {
          bitmap.close(); // superseded
          return;
        }
        setImage((previous) => {
          previous?.bitmap.close();
          return { name, bitmap, width: bitmap.width, height: bitmap.height };
        });
        setError(null);
      } catch {
        if (loadToken.current === token) {
          setImage(null);
          setError(`Could not read ${name}. It may not be a supported image.`);
        }
      } finally {
        if (loadToken.current === token) setLoading(false);
      }
    },
    [],
  );

  const adopt = useCallback(
    async (batch: BatchSource): Promise<boolean> => {
      if (batch.images.length === 0) {
        setError("That folder has no supported images in it.");
        return false;
      }
      setError(null);
      setSource(batch);
      setIndex(0);
      // pick up whatever the folder already holds, so work resumes
      const existing = await loadExistingRows(batch);
      const byName: RowsByImage = {};
      for (const row of existing) byName[row.image_name] = row;
      setRows(byName);
      await decode(batch, 0);
      return true;
    },
    [decode],
  );

  const openFolder = useCallback(async (): Promise<boolean> => {
    try {
      const batch = await openFolderBatch();
      if (!batch) return false;
      return await adopt(batch);
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }, [adopt]);

  const openFiles = useCallback(
    async (files: readonly File[]): Promise<boolean> => {
      try {
        return await adopt(openFileBatch(files));
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
    },
    [adopt],
  );

  const close = useCallback(() => {
    loadToken.current += 1;
    setImage((previous) => {
      previous?.bitmap.close();
      return null;
    });
    setSource(null);
    setRows({});
    setIndex(0);
    setError(null);
  }, []);

  const goTo = useCallback(
    (to: number) => {
      if (!source) return;
      const clamped = Math.min(Math.max(0, to), source.images.length - 1);
      setIndex(clamped);
      void decode(source, clamped);
    },
    [decode, source],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  const shapesFor = useCallback(
    (name: string): Shape[] => {
      const row = rows[name];
      if (!row || row.row_type !== "roi") return [];
      const polys = parseMultiPolys(row.pixel_coords);
      if (polys.length === 0) return [];
      return polysToShapes(
        polys,
        parseShapeTypes(row.shape_types, polys.length),
        parseShapeClasses(row.shape_classes, polys.length),
      );
    },
    [rows],
  );

  const record = useCallback(
    (name: string, shapes: readonly Shape[], comment = "") => {
      const size = image?.name === name ? image : null;
      const width = size?.width ?? rows[name]?.image_width ?? 0;
      const height = size?.height ?? rows[name]?.image_height ?? 0;
      const polys = shapesToPolys(shapes);
      const row = makeRow({
        fname: name,
        rowType: shapes.length ? "roi" : "comment",
        polysPx: polys,
        normPolys: polysToNorm(polys, width, height),
        comment,
        width,
        height,
        kinds: shapesToKinds(shapes),
        classes: shapesToClasses(shapes),
      });
      setRows((current) => ({ ...current, [name]: row }));
    },
    [image, rows],
  );

  const markNoRoi = useCallback(
    (name: string, comment = "") => {
      const size = image?.name === name ? image : null;
      const row = makeRow({
        fname: name,
        rowType: "no_roi",
        comment,
        width: size?.width ?? rows[name]?.image_width ?? 0,
        height: size?.height ?? rows[name]?.image_height ?? 0,
      });
      setRows((current) => ({ ...current, [name]: row }));
    },
    [image, rows],
  );

  const clearRow = useCallback((name: string) => {
    setRows((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);

  const rowList = useMemo(() => Object.values(rows), [rows]);

  return {
    source,
    rows,
    index,
    current,
    image,
    loading,
    error,
    openFolder,
    openFiles,
    close,
    goTo,
    next,
    previous,
    shapesFor,
    record,
    markNoRoi,
    clearRow,
    rowList,
  };
}

export { DEFAULT_CLASS };
