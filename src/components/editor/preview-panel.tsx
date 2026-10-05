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
import { useShallow } from "zustand/react/shallow";
import { ClipComposition } from "@/remotion/compositions/clip-composition";
import { CLIP_COMPOSITION_FPS } from "@/remotion/constants";
import { createClipRenderInput } from "@/remotion/clip-render-input";
import { getCanvasSize, getSourceSize } from "@/lib/editor";
import { useEditorStore } from "@/store/editor-store";
import {
  selectDurationInFrames,
  selectEditorDocument,
} from "@/store/editor-selectors";
import { TextLayerOverlay } from "./text-layer-overlay";
import type { VideoTransform } from "@/types/editor";

type PreviewPanelProps = {
  playerRef: RefObject<PlayerRef | null>;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startTransform: VideoTransform;
  previewWidth: number;
  previewHeight: number;
  moved: boolean;
};

const CLICK_MOVE_THRESHOLD_PX = 4;

export function PreviewPanel({ playerRef }: PreviewPanelProps) {
  const document = useEditorStore(useShallow(selectEditorDocument));
  const durationInFrames = useEditorStore(selectDurationInFrames);
  const selectedTextLayerId = useEditorStore(
    (state) => state.selectedTextLayerId,
  );
  const selectTextLayer = useEditorStore((state) => state.selectTextLayer);
  const updateTextLayer = useEditorStore((state) => state.updateTextLayer);
  const setVideoTransform = useEditorStore((state) => state.setVideoTransform);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(0);

  const sourceSize = getSourceSize(document.sourceMetadata);
  const canvasSize = getCanvasSize(document.aspectRatio, sourceSize);
  const renderInput = createClipRenderInput(document);
  const { transform, textLayers } = renderInput;
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
      moved: false,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const clientDeltaX = event.clientX - drag.startClientX;
    const clientDeltaY = event.clientY - drag.startClientY;

    if (
      Math.abs(clientDeltaX) > CLICK_MOVE_THRESHOLD_PX ||
      Math.abs(clientDeltaY) > CLICK_MOVE_THRESHOLD_PX
    ) {
      drag.moved = true;
    }

    const compositionDeltaX =
      clientDeltaX * (canvasSize.width / drag.previewWidth);
    const compositionDeltaY =
      clientDeltaY * (canvasSize.height / drag.previewHeight);

    setVideoTransform({
      ...drag.startTransform,
      x: drag.startTransform.x + compositionDeltaX,
      y: drag.startTransform.y + compositionDeltaY,
    });
  }

  function finishPointerInteraction(
    event: ReactPointerEvent<HTMLDivElement>,
    deselectOnClick: boolean,
  ) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const wasClick = !drag.moved;
    dragStateRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (deselectOnClick && wasClick) {
      selectTextLayer(null);
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
        onPointerUp={(event) => finishPointerInteraction(event, true)}
        onPointerCancel={(event) => finishPointerInteraction(event, false)}
      >
        <Player
          ref={playerRef}
          component={ClipComposition}
          inputProps={renderInput}
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
          onSelectTextLayer={selectTextLayer}
          onTextLayerChange={updateTextLayer}
        />
      </div>
    </section>
  );
}
