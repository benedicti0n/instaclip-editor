"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import {
  CLIP_COMPOSITION_FPS,
  ClipComposition,
} from "@/remotion/compositions/clip-composition";
import { SAMPLE_VIDEO_SRC } from "@/lib/sample-video";
import { TextLayerOverlay } from "./text-layer-overlay";
import type { TextLayer, VideoSize, VideoTransform } from "@/types/editor";

type PreviewPanelProps = {
  playerRef: RefObject<PlayerRef | null>;
  durationInFrames: number;
  canvasSize: VideoSize;
  sourceSize: VideoSize;
  transform: VideoTransform;
  onTransformChange: (transform: VideoTransform) => void;
  textLayers: TextLayer[];
  selectedTextLayerId: string | null;
  onSelectTextLayer: (id: string) => void;
  onTextLayerChange: (id: string, patch: Partial<TextLayer>) => void;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startTransform: VideoTransform;
  previewWidth: number;
  previewHeight: number;
};

export function PreviewPanel({
  playerRef,
  durationInFrames,
  canvasSize,
  sourceSize,
  transform,
  onTransformChange,
  textLayers,
  selectedTextLayerId,
  onSelectTextLayer,
  onTextLayerChange,
}: PreviewPanelProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(0);
  const inputProps = {
    src: SAMPLE_VIDEO_SRC,
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
    transform,
    textLayers,
  };
  const previewScale = previewWidth > 0 ? previewWidth / canvasSize.width : 0;

  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setPreviewWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const rect = event.currentTarget.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startTransform: transform,
      previewWidth: rect.width,
      previewHeight: rect.height,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const compositionDeltaX =
      (event.clientX - drag.startClientX) *
      (canvasSize.width / drag.previewWidth);
    const compositionDeltaY =
      (event.clientY - drag.startClientY) *
      (canvasSize.height / drag.previewHeight);

    onTransformChange({
      ...drag.startTransform,
      x: drag.startTransform.x + compositionDeltaX,
      y: drag.startTransform.y + compositionDeltaY,
    });
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section
      aria-label="Video preview"
      className="flex min-h-0 flex-1 items-center justify-center bg-zinc-950 p-4 sm:p-6 lg:[container-type:size]"
    >
      <div
        ref={surfaceRef}
        className={`relative w-full max-w-sm touch-none overflow-hidden rounded-xl border border-zinc-800 bg-black select-none lg:w-[min(100cqw,calc(100cqh*var(--clip-ratio)))] lg:max-w-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={
          {
            aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
            "--clip-ratio": canvasSize.width / canvasSize.height,
          } as CSSProperties
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <Player
          ref={playerRef}
          component={ClipComposition}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          compositionWidth={canvasSize.width}
          compositionHeight={canvasSize.height}
          fps={CLIP_COMPOSITION_FPS}
          controls={false}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          loop={false}
          acknowledgeRemotionLicense
          style={{ width: "100%", height: "100%" }}
        />
        <TextLayerOverlay
          textLayers={textLayers}
          selectedTextLayerId={selectedTextLayerId}
          canvasSize={canvasSize}
          previewScale={previewScale}
          onSelectTextLayer={onSelectTextLayer}
          onTextLayerChange={onTextLayerChange}
        />
      </div>
    </section>
  );
}
