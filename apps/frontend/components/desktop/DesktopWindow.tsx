
"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ArrowLeft, Minimize2, Minus, Square, X } from "lucide-react";

type Props = {
  title: string;
  windowKey?: string;
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

type ResizeDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

const MIN_WIDTH = 520;
const MIN_HEIGHT = 420;
const SNAP_EDGE_PX = 16;
const PULL_TO_RESTORE_PX = 84;

type ResizeState = {
  direction: ResizeDirection;
  x: number;
  y: number;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
};

export default function DesktopWindow({
  title,
  windowKey,
  children,
  onClose,
  onBack,
  onFocus,
  offset = { x: 0, y: 0 },
  active = true,
  onExpandedChange,
  initialState,
  onStateChange,
}: Props) {
  const [maximized, setMaximized] = useState(
    initialState?.maximized ?? false,
  );
  const [minimized, setMinimized] = useState(
    initialState?.minimized ?? false,
  );
  const [position, setPosition] = useState(
    initialState?.position ?? { x: 0, y: 0 },
  );
  const [size, setSize] = useState(
    initialState?.size ?? { width: 1000, height: 780 },
  );
  const [closing, setClosing] = useState(false);
  const [interacting, setInteracting] = useState(false);

  const dragRef = useRef({
    x: 0,
    y: 0,
    startY: 0,
    wasMaximized: false,
    started: false,
  });

  const resizeRef = useRef<ResizeState>({
    direction: "se",
    x: 0,
    y: 0,
    width: 1000,
    height: 780,
    positionX: 0,
    positionY: 0,
  });

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const setMaximizedState = (value: boolean) => {
    setMaximized(value);
    onExpandedChange?.(value);
  };

  const closeWithTransition = () => {
    if (closing) return;
    setClosing(true);
    (onBack ?? onClose)?.();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onStateChangeRef.current?.({
        position,
        size,
        maximized,
        minimized,
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [position, size, maximized, minimized]);

  useEffect(() => {
    if (!initialState) return;

    setMaximized(initialState.maximized);
    setMinimized(initialState.minimized);
    setPosition(initialState.position);
    setSize(initialState.size);
  }, [
    initialState?.maximized,
    initialState?.minimized,
    initialState?.position?.x,
    initialState?.position?.y,
    initialState?.size?.width,
    initialState?.size?.height,
  ]);

  useEffect(() => {
    const handleClosing = (event: Event) => {
      const key = (event as CustomEvent<{ key?: string }>).detail?.key;
      if (windowKey && key === windowKey) setClosing(true);
    };

    window.addEventListener("utoolity:tool-closing", handleClosing);

    return () =>
      window.removeEventListener("utoolity:tool-closing", handleClosing);
  }, [windowKey]);

  useEffect(() => {
    if (maximized) return;

    const constrainWindow = () => {
      setSize((current) => ({
        width: Math.min(
          Math.max(MIN_WIDTH, current.width),
          Math.max(MIN_WIDTH, window.innerWidth),
        ),
        height: Math.min(
          Math.max(MIN_HEIGHT, current.height),
          Math.max(MIN_HEIGHT, window.innerHeight),
        ),
      }));
    };

    window.addEventListener("resize", constrainWindow);
    return () => window.removeEventListener("resize", constrainWindow);
  }, [maximized]);

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    if (
      closing ||
      (event.target instanceof Element &&
        event.target.closest("button"))
    ) {
      return;
    }

    event.preventDefault();
    setInteracting(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
      startY: event.clientY,
      wasMaximized: maximized,
      started: true,
    };
  };

  const drag = (event: PointerEvent<HTMLElement>) => {
    const state = dragRef.current;

    if (
      !state.started ||
      !event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      return;
    }

    if (state.wasMaximized) {
      if (event.clientY - state.startY >= PULL_TO_RESTORE_PX) {
        setSize({ width: Math.min(1000, Math.max(MIN_WIDTH, window.innerWidth - 48)), height: Math.min(780, Math.max(MIN_HEIGHT, window.innerHeight - 96)) });
        setPosition({ x: event.clientX - window.innerWidth / 2, y: event.clientY - window.innerHeight / 2 + 390 });
        setMaximizedState(false);
        dragRef.current.started = false;
        setInteracting(false);
      }
      return;
    }

    if (event.clientY <= SNAP_EDGE_PX) {
      dragRef.current.started = false;
      setInteracting(false);
      setMaximizedState(true);
      return;
    }

    setPosition({
      x: event.clientX - state.x,
      y: event.clientY - state.y,
    });
  };

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    dragRef.current.started = false;
    setInteracting(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const startResize =
    (direction: ResizeDirection) =>
    (event: PointerEvent<HTMLButtonElement>) => {
      if (maximized || closing) return;

      event.preventDefault();
      event.stopPropagation();

      setInteracting(true);
      event.currentTarget.setPointerCapture(event.pointerId);

      resizeRef.current = {
        direction,
        x: event.clientX,
        y: event.clientY,
        width: size.width,
        height: size.height,
        positionX: position.x,
        positionY: position.y,
      };
    };

  const resize = (event: PointerEvent<HTMLButtonElement>) => {
    if (
      !event.currentTarget.hasPointerCapture(event.pointerId) ||
      maximized
    ) {
      return;
    }

    const state = resizeRef.current;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;

    const west = state.direction.includes("w");
    const east = state.direction.includes("e");
    const north = state.direction.includes("n");
    const south = state.direction.includes("s");

    const nextWidth = Math.max(
      MIN_WIDTH,
      state.width + (west ? -dx : east ? dx : 0),
    );

    const nextHeight = Math.max(
      MIN_HEIGHT,
      state.height + (north ? -dy : south ? dy : 0),
    );

    const widthChange = nextWidth - state.width;
    const heightChange = nextHeight - state.height;

    // Windows are centered using translate(-50%, -50%).
    // Moving the center by half the size delta keeps the opposite edge fixed.
    setPosition({
      x: state.positionX + (west ? -widthChange / 2 : east ? widthChange / 2 : 0),
      y: state.positionY + (north ? -heightChange / 2 : south ? heightChange / 2 : 0),
    });

    setSize({
      width: nextWidth,
      height: nextHeight,
    });
  };

  const endResize = (event: PointerEvent<HTMLButtonElement>) => {
    setInteracting(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        onDoubleClick={() => {
          setMinimized(false);
          setMaximizedState(true);
        }}
        className={`desktop-window-minimized fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-popover px-4 py-2 text-sm font-semibold text-popover-foreground shadow-xl ${
          closing ? "desktop-window-closing pointer-events-none" : ""
        }`}
      >
        {title}
      </button>
    );
  }

  const handle = (
    direction: ResizeDirection,
    className: string,
  ) => (
    <button
      type="button"
      aria-label={`Resize ${direction}`}
      onPointerDown={startResize(direction)}
      onPointerMove={resize}
      onPointerUp={endResize}
      onPointerCancel={endResize}
      className={`absolute z-10 touch-none ${className}`}
    />
  );

  return (
    <section
      aria-label={title}
      style={{
        width: maximized
          ? "100vw"
          : `min(${size.width}px, 100vw)`,
        height: maximized
          ? "100dvh"
          : `min(${size.height}px, 100dvh)`,
        transform: maximized
          ? "none"
          : `translate(calc(-50% + ${position.x + offset.x}px), calc(-50% + ${position.y + offset.y}px))`,
      }}
      onPointerDown={onFocus}
      onDoubleClick={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest(
            "button, input, textarea, a, [contenteditable='true']",
          )
        ) {
          return;
        }

        setMaximizedState(!maximized);
      }}
      className={`desktop-window fixed ${
        active ? "z-1000" : "z-1000"
      } flex min-h-0 min-w-0 flex-col overflow-hidden border border-border bg-background text-foreground shadow-2xl transition-[width,height,transform,top,left,opacity,border-radius] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        interacting ? "transition-none!" : ""
      } ${
        closing
          ? "desktop-window-closing pointer-events-none"
          : "desktop-window-opening"
      } ${
        maximized
          ? "left-0 top-0 rounded-none"
          : "left-1/2 top-1/2 rounded-3xl"
      }`}
    >
      <header
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="grid h-12 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-border/60 bg-card/65 px-3 shadow-sm backdrop-blur-2xl active:cursor-grabbing"
      >
        <button
          type="button"
          onClick={closeWithTransition}
          aria-label={`Back from ${title}`}
          className="flex size-8 items-center justify-center rounded-lg hover:bg-accent"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="col-start-3 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimize window"
            className="flex size-8 items-center justify-center rounded-lg hover:bg-accent"
          >
            <Minus size={16} />
          </button>

          <button
            type="button"
            onClick={() => setMaximizedState(!maximized)}
            aria-label={
              maximized ? "Restore window size" : "Maximize window size"
            }
            className="flex size-8 items-center justify-center rounded-lg hover:bg-accent"
          >
            {maximized ? <Minimize2 size={15} /> : <Square size={14} />}
          </button>

          <button
            type="button"
            onClick={closeWithTransition}
            aria-label="Close window"
            className="flex size-8 items-center justify-center rounded-lg hover:bg-destructive hover:text-destructive-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <h2 className="pointer-events-none col-start-2 row-start-1 justify-self-center text-center text-base font-semibold tracking-tight">
          {title}
        </h2>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        {children}
      </div>

      {!maximized && (
        <>
          {handle("n", "top-0 left-3 right-3 h-1 cursor-n-resize")}
          {handle("s", "bottom-0 left-3 right-3 h-1 cursor-s-resize")}
          {handle("e", "right-0 top-3 bottom-3 w-1 cursor-e-resize")}
          {handle("w", "left-0 top-3 bottom-3 w-1 cursor-w-resize")}
          {handle("ne", "right-0 top-0 size-4 cursor-ne-resize")}
          {handle("nw", "left-0 top-0 size-4 cursor-nw-resize")}
          {handle("se", "right-0 bottom-0 size-4 cursor-se-resize")}
          {handle("sw", "left-0 bottom-0 size-4 cursor-sw-resize")}
        </>
      )}
    </section>
  );
}
