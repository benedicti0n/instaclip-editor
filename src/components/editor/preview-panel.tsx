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
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { ClipComposition } from "@/remotion/compositions/clip-composition";
import { CLIP_COMPOSITION_FPS } from "@/remotion/constants";
import { createClipRenderInput } from "@/remotion/clip-render-input";
import { getCanvasSize, getSourceSize } from "@/lib/editor";
import { blurActiveElement } from "@/lib/keyboard";
import { useEditorStore } from "@/store/editor-store";
import {
  selectDurationInFrames,
  selectEditorDocument,
} from "@/store/editor-selectors";
import { CropOverlay } from "./crop-overlay";
import { TextLayerOverlay } from "./text-layer-overlay";
import type { VideoTransform } from "@/types/editor";

type PreviewPanelProps = {
  playerRef: RefObject<PlayerRef | null>;
  onPlayerReady: () => void;
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

export function PreviewPanel({ playerRef, onPlayerReady }: PreviewPanelProps) {
  const router = useRouter();
  const document = useEditorStore(useShallow(selectEditorDocument));
  const durationInFrames = useEditorStore(selectDurationInFrames);
  const selectedTextLayerId = useEditorStore(
    (state) => state.selectedTextLayerId,
  );
  const isCropping = useEditorStore((state) => state.isCropping);
  const setIsCropping = useEditorStore((state) => state.setIsCropping);
  const selectTextLayer = useEditorStore((state) => state.selectTextLayer);
  const updateTextLayer = useEditorStore((state) => state.updateTextLayer);
  const setVideoTransform = useEditorStore((state) => state.setVideoTransform);
  const setCropRect = useEditorStore((state) => state.setCropRect);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [checkedSrc, setCheckedSrc] = useState<string | null>(null);
  const [unavailableSrc, setUnavailableSrc] = useState<string | null>(null);
  const mediaSrc = document.media.src;

  const sourceSize = getSourceSize(document.sourceMetadata);
  const canvasSize = getCanvasSize(document.aspectRatio, sourceSize);
  const renderInput = createClipRenderInput(document);
  const { transform, textLayers } = renderInput;
  const previewScale = previewWidth > 0 ? previewWidth / canvasSize.width : 0;
  const isSourceChecked = checkedSrc === mediaSrc;
  const isSourceUnavailable = unavailableSrc === mediaSrc;

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

  useEffect(() => {
    let cancelled = false;

    fetch(mediaSrc, { method: "HEAD", cache: "no-store" })
      .then((response) => {
        if (cancelled) {
          return;
        }

        setCheckedSrc(mediaSrc);
        if (!response.ok) {
          setUnavailableSrc(mediaSrc);
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setCheckedSrc(mediaSrc);
        setUnavailableSrc(mediaSrc);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaSrc]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (isCropping) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    blurActiveElement();
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
          isCropping
            ? "cursor-default"
            : isDragging
              ? "cursor-grabbing"
              : "cursor-grab"
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
        {isSourceChecked && !isSourceUnavailable ? (
          <>
            <Player
              ref={(instance) => {
                playerRef.current = instance;
                if (instance) {
                  onPlayerReady();
                }
              }}
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
            {isCropping ? (
              <CropOverlay
                mediaSrc={mediaSrc}
                sourceSize={sourceSize}
                canvasSize={canvasSize}
                cropRect={document.cropRect}
                previewWidth={previewWidth}
                playerRef={playerRef}
                onCropRectChange={setCropRect}
                onExitCropMode={() => setIsCropping(false)}
              />
            ) : (
              <TextLayerOverlay
                textLayers={textLayers}
                selectedTextLayerId={selectedTextLayerId}
                canvasSize={canvasSize}
                previewScale={previewScale}
                onSelectTextLayer={selectTextLayer}
                onTextLayerChange={updateTextLayer}
              />
            )}
          </>
        ) : null}
        {isSourceUnavailable ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-4 text-center"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <p className="text-xs leading-5 text-zinc-300">
              Source video is no longer available. Import it again.
            </p>
            <Button size="sm" onClick={() => router.push("/")}>
              Import video
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
