"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Grid3X3, Maximize2, Minus, Monitor, Plus, Smartphone, Tablet } from "lucide-react";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<Device, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

const DEVICE_HEIGHTS: Record<Device, number> = {
  desktop: 800,
  tablet: 1024,
  mobile: 740,
};

type CanvasViewportProps = {
  html: string;
  device: Device;
  onDeviceChange: (device: Device) => void;
  showGrid: boolean;
  onShowGridChange: (showGrid: boolean) => void;
};

export default function CanvasViewport({
  html,
  device,
  onDeviceChange,
  showGrid,
  onShowGridChange,
}: CanvasViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const pageWidth = DEVICE_WIDTHS[device];
  const pageHeight = DEVICE_HEIGHTS[device];

  const fit = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const padding = 48;
    const cw = el.clientWidth - padding * 2;
    const ch = el.clientHeight - padding * 2;
    const s = Math.min(cw / pageWidth, ch / pageHeight, 1);
    setScale(s);
    setOffset({ x: 0, y: 0 });
  }, [pageWidth, pageHeight]);

  useEffect(() => {
    fit();
  }, [fit, device]);

  useEffect(() => {
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fit]);

  const zoomAtViewportCenter = (nextScale: number) => {
    if (nextScale === scale) return;
    const ratio = nextScale / scale;
    setScale(nextScale);
    setOffset({ x: offset.x * ratio, y: offset.y * ratio });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    const nextScale = Math.min(3, Math.max(0.1, scale * factor));
    zoomAtViewportCenter(nextScale);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-canvas-control]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      x: offset.x,
      y: offset.y,
    };
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.x + (e.clientX - dragRef.current.startX),
      y: dragRef.current.y + (e.clientY - dragRef.current.startY),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  const zoomBy = (factor: number) => {
    const nextScale = Math.min(3, Math.max(0.1, scale * factor));
    zoomAtViewportCenter(nextScale);
  };

  return (
    <section
      ref={viewportRef}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`relative h-full w-full overflow-hidden bg-panel select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {showGrid ? <GridOverlay /> : null}
      <div
        className="absolute left-1/2 top-1/2 bg-background border border-border"
        style={{
          width: pageWidth,
          height: pageHeight,
          transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {html ? (
          <iframe
            title="Generated page"
            srcDoc={html}
            className="h-full w-full border-0 bg-background pointer-events-none"
            sandbox="allow-scripts"
          />
        ) : (
          <EmptyState device={device} />
        )}
      </div>

      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 border border-border bg-background px-1 py-1"
        data-canvas-control
      >
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => zoomBy(0.8)}
          aria-label="Zoom out"
          data-canvas-control
        >
          <Minus />
        </Button>
        <button
          onClick={fit}
          className="px-2 py-1 text-[11px] tabular-nums text-muted-foreground hover:text-foreground font-mono"
          data-canvas-control
        >
          {Math.round(scale * 100)}%
        </button>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => zoomBy(1.25)}
          aria-label="Zoom in"
          data-canvas-control
        >
          <Plus />
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={fit}
          aria-label="Fit"
          data-canvas-control
          className="px-2"
        >
          <Maximize2 />
          Fit
        </Button>
        <div className="mx-1 h-4 w-px bg-border" data-canvas-control />
        <DeviceButton
          label="Desktop"
          active={device === "desktop"}
          onClick={() => onDeviceChange("desktop")}
        >
          <Monitor />
        </DeviceButton>
        <DeviceButton
          label="Tablet"
          active={device === "tablet"}
          onClick={() => onDeviceChange("tablet")}
        >
          <Tablet />
        </DeviceButton>
        <DeviceButton
          label="Mobile"
          active={device === "mobile"}
          onClick={() => onDeviceChange("mobile")}
        >
          <Smartphone />
        </DeviceButton>
        <div className="mx-1 h-4 w-px bg-border" data-canvas-control />
        <Toggle
          size="sm"
          variant="outline"
          pressed={showGrid}
          onPressedChange={onShowGridChange}
          aria-label="Show grid"
          title="Show grid"
          data-canvas-control
          className="h-6 min-w-6 px-1.5"
        >
          <Grid3X3 />
        </Toggle>
      </div>

      <div
        className="absolute right-4 top-4 border border-border bg-background px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-mono"
        data-canvas-control
      >
        {device} · {pageWidth}×{pageHeight}
      </div>
    </section>
  );
}

function GridOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-60"
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        backgroundPosition: "center center",
      }}
    />
  );
}

function DeviceButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="icon-xs"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
      aria-label={label}
      title={label}
      data-canvas-control
    >
      {children}
    </Button>
  );
}

function EmptyState({ device }: { device: Device }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-8 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
        {device} preview
      </div>
      <div className="text-sm text-muted-foreground">
        Your generated page will render here.
      </div>
      <div className="text-xs text-muted-foreground">
        Describe what you want in the chat on the left.
      </div>
    </div>
  );
}
