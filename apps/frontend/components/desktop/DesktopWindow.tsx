"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowLeft, Minimize2, Minus, Square, X } from "lucide-react";

type Props = {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  onBack?: () => void;
  onFocus?: () => void;
  offset?: { x: number; y: number };
  active?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  initialState?: WindowState;
  onStateChange?: (state: WindowState) => void;
};
export type WindowState = {
  position: { x: number; y: number };
  size: { width: number; height: number };
  maximized: boolean;
  minimized: boolean;
};
type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN_WIDTH = 520;
const MIN_HEIGHT = 420;

export default function DesktopWindow({ title, children, onClose, onBack, onFocus, offset = { x: 0, y: 0 }, active = true, onExpandedChange, initialState, onStateChange }: Props) {
  const [maximized, setMaximized] = useState(initialState?.maximized ?? false);
  const [minimized, setMinimized] = useState(initialState?.minimized ?? false);
  const [position, setPosition] = useState(initialState?.position ?? { x: 0, y: 0 });
  const [size, setSize] = useState(initialState?.size ?? { width: 1000, height: 780 });
  const dragRef = useRef({ x: 0, y: 0 });
  const resizeRef = useRef({ direction: "se" as ResizeDirection, x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 });
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const setMaximizedState = (value: boolean) => {
    setMaximized(value);
    onExpandedChange?.(value);
  };

  useEffect(() => {
    onStateChangeRef.current?.({ position, size, maximized, minimized });
  }, [position, size, maximized, minimized]);

  useEffect(() => {
    if (!initialState) return;
    setMaximized(initialState.maximized);
    setMinimized(initialState.minimized);
  }, [
    initialState?.maximized,
    initialState?.minimized,
  ]);

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (maximized || event.target !== event.currentTarget) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX - position.x, y: event.clientY - position.y };
  };

  const drag = (event: PointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || maximized) return;
    setPosition({ x: event.clientX - dragRef.current.x, y: event.clientY - dragRef.current.y });
  };

  const startResize = (direction: ResizeDirection) => (event: PointerEvent<HTMLButtonElement>) => {
    if (maximized) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      direction,
      x: event.clientX,
      y: event.clientY,
      width: size.width,
      height: size.height,
      left: position.x,
      top: position.y,
    };
  };

  const resize = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) || maximized) return;
    const state = resizeRef.current;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    const west = state.direction.includes("w");
    const north = state.direction.includes("n");
    const width = Math.max(MIN_WIDTH, state.width + (west ? -dx : state.direction.includes("e") ? dx : 0));
    const height = Math.max(MIN_HEIGHT, state.height + (north ? -dy : state.direction.includes("s") ? dy : 0));
    setSize({ width, height });
    setPosition({
      x: state.left + (west ? state.width - width : 0),
      y: state.top + (north ? state.height - height : 0),
    });
  };

  if (minimized) {
    return <button type="button" onClick={() => setMinimized(false)} className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-popover px-4 py-2 text-sm font-semibold text-popover-foreground shadow-xl">{title}</button>;
  }

  const handle = (direction: ResizeDirection, className: string) => (
    <button type="button" aria-label={`Resize ${direction}`} onPointerDown={startResize(direction)} onPointerMove={resize} className={`absolute z-10 ${className}`} />
  );

  return (
    <section
      aria-label={title}
      style={maximized ? undefined : {
        width: `min(${size.width}px, 92vw)`,
        height: `min(${size.height}px, 85dvh)`,
        transform: `translate(calc(-50% + ${position.x + offset.x}px), calc(-50% + ${position.y + offset.y}px))`,
      }}
      onPointerDown={onFocus}
      className={`desktop-window fixed ${active ? "z-50" : "z-40"} flex min-h-0 flex-col overflow-hidden border border-border bg-background text-foreground shadow-2xl ${maximized ? "inset-0 rounded-none" : "left-1/2 top-1/2 rounded-3xl"}`}
    >
      <header onPointerDown={startDrag} onPointerMove={drag} className="grid h-12 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-border/60 bg-card/65 px-3 shadow-sm backdrop-blur-2xl active:cursor-grabbing">
        <button type="button" onClick={onBack ?? onClose} aria-label={`Back from ${title}`} className="flex size-8 items-center justify-center rounded-lg hover:bg-accent">
          <ArrowLeft size={16} />
        </button>
        <div className="col-start-3 flex items-center justify-end gap-1">
          <button type="button" onClick={() => setMinimized(true)} aria-label="Minimize window" className="flex size-8 items-center justify-center rounded-lg hover:bg-accent"><Minus size={16} /></button>
          <button type="button" onClick={() => setMaximizedState(!maximized)} aria-label={maximized ? "Restore window size" : "Maximize window size"} className="flex size-8 items-center justify-center rounded-lg hover:bg-accent">{maximized ? <Minimize2 size={15} /> : <Square size={14} />}</button>
          <button type="button" onClick={onClose} aria-label="Close window" className="flex size-8 items-center justify-center rounded-lg hover:bg-destructive hover:text-destructive-foreground"><X size={16} /></button>
        </div>
        <h2 className="pointer-events-none col-start-2 row-start-1 justify-self-center text-center text-base font-semibold tracking-tight">{title}</h2>
      </header>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
      {!maximized && <>
        {handle("n", "top-0 left-3 right-3 h-1 cursor-n-resize")}
        {handle("s", "bottom-0 left-3 right-3 h-1 cursor-s-resize")}
        {handle("e", "right-0 top-3 bottom-3 w-1 cursor-e-resize")}
        {handle("w", "left-0 top-3 bottom-3 w-1 cursor-w-resize")}
        {handle("ne", "right-0 top-0 size-4 cursor-ne-resize")}
        {handle("nw", "left-0 top-0 size-4 cursor-nw-resize")}
        {handle("se", "right-0 bottom-0 size-4 cursor-se-resize")}
        {handle("sw", "left-0 bottom-0 size-4 cursor-sw-resize")}
      </>}
    </section>
  );
}
