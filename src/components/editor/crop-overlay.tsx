"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { PlayerRef } from "@remotion/player";
import { resizeCropRect, type CropHandle } from "@/lib/editor";
import { CLIP_COMPOSITION_FPS } from "@/remotion/constants";
import type { CropRect, VideoSize } from "@/types/editor";

type CropOverlayProps = {
  mediaSrc: string;
  sourceSize: VideoSize;
  canvasSize: VideoSize;
  cropRect: CropRect;
  previewWidth: number;
  playerRef: RefObject<PlayerRef | null>;
  onCropRectChange: (rect: CropRect) => void;
  onExitCropMode: () => void;
};

type DragState = {
  pointerId: number;
  handle: CropHandle;
  startClientX: number;
  startClientY: number;
  startRect: CropRect;
  boxWidth: number;
  boxHeight: number;
};

const HANDLES: ReadonlyArray<{
  handle: Exclude<CropHandle, "move">;
  label: string;
  cursor: string;
  style: CSSProperties;
}> = [
  {
    handle: "nw",
    label: "Resize crop top left",
    cursor: "nwse-resize",
    style: { left: -6, top: -6 },
  },
  {
    handle: "n",
    label: "Resize crop top",
    cursor: "ns-resize",
    style: { left: "50%", top: -6, transform: "translateX(-50%)" },
  },
  {
    handle: "ne",
    label: "Resize crop top right",
    cursor: "nesw-resize",
    style: { right: -6, top: -6 },
  },
  {
    handle: "w",
    label: "Resize crop left",
    cursor: "ew-resize",
    style: { left: -6, top: "50%", transform: "translateY(-50%)" },
  },
  {
    handle: "e",
    label: "Resize crop right",
    cursor: "ew-resize",
    style: { right: -6, top: "50%", transform: "translateY(-50%)" },
  },
  {
    handle: "sw",
    label: "Resize crop bottom left",
    cursor: "nesw-resize",
    style: { left: -6, bottom: -6 },
  },
  {
    handle: "s",
    label: "Resize crop bottom",
    cursor: "ns-resize",
    style: { left: "50%", bottom: -6, transform: "translateX(-50%)" },
  },
  {
    handle: "se",
    label: "Resize crop bottom right",
    cursor: "nwse-resize",
    style: { right: -6, bottom: -6 },
  },
];

const KEYBOARD_STEP = 0.01;

const KEYBOARD_STEP_LARGE = 0.05;

export function CropOverlay({
  mediaSrc,
  sourceSize,
  canvasSize,
  cropRect,
  previewWidth,
  playerRef,
  onCropRectChange,
  onExitCropMode,
}: CropOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const previewHeight =
    previewWidth > 0
      ? previewWidth * (canvasSize.height / canvasSize.width)
      : 0;
  const boxScale =
    previewWidth > 0 && previewHeight > 0
      ? Math.min(
          previewWidth / sourceSize.width,
          previewHeight / sourceSize.height,
        )
      : 0;
  const boxWidth = sourceSize.width * boxScale;
  const boxHeight = sourceSize.height * boxScale;
  const boxLeft = (previewWidth - boxWidth) / 2;
  const boxTop = (previewHeight - boxHeight) / 2;

  useEffect(() => {
    const player = playerRef.current;
    const video = videoRef.current;

    if (!player || !video) {
      return;
    }

    const syncToPlayerFrame = () => {
      if (video.readyState < 1) {
        return;
      }

      const target = player.getCurrentFrame() / CLIP_COMPOSITION_FPS;

      if (
        Number.isFinite(target) &&
        Math.abs(video.currentTime - target) > 0.05
      ) {
        video.currentTime = target;
      }
    };

    const handleFrameUpdate = () => {
      if (!player.isPlaying()) {
        syncToPlayerFrame();
      }
    };
    const handlePlay = () => {
      void video.play().catch(() => undefined);
    };
    const handlePause = () => {
      video.pause();
      syncToPlayerFrame();
    };
    const handleSeeked = () => syncToPlayerFrame();

    syncToPlayerFrame();
    if (player.isPlaying()) {
      void video.play().catch(() => undefined);
    }

    player.addEventListener("frameupdate", handleFrameUpdate);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("seeked", handleSeeked);

    return () => {
      player.removeEventListener("frameupdate", handleFrameUpdate);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("seeked", handleSeeked);
      video.pause();
    };
  }, [playerRef]);

  function beginDrag(
    handle: CropHandle,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragStateRef.current = {
      pointerId: event.pointerId,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: cropRect,
      boxWidth: boxWidth > 0 ? boxWidth : 1,
      boxHeight: boxHeight > 0 ? boxHeight : 1,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();

    const deltaX = (event.clientX - drag.startClientX) / drag.boxWidth;
    const deltaY = (event.clientY - drag.startClientY) / drag.boxHeight;

    onCropRectChange(
      resizeCropRect(drag.startRect, drag.handle, deltaX, deltaY),
    );
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    dragStateRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(
    handle: CropHandle,
    event: ReactKeyboardEvent<HTMLElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onExitCropMode();
      return;
    }

    const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
    let deltaX = 0;
    let deltaY = 0;

    if (event.key === "ArrowLeft") {
      deltaX = -step;
    } else if (event.key === "ArrowRight") {
      deltaX = step;
    } else if (event.key === "ArrowUp") {
      deltaY = -step;
    } else if (event.key === "ArrowDown") {
      deltaY = step;
    } else {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onCropRectChange(resizeCropRect(cropRect, handle, deltaX, deltaY));
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-black"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <video
        ref={videoRef}
        src={mediaSrc}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-contain"
      />
      <div className="absolute inset-0">
        <div
          className="absolute cursor-move touch-none border border-zinc-50"
          style={{
            left: boxLeft + cropRect.x * boxWidth,
            top: boxTop + cropRect.y * boxHeight,
            width: cropRect.width * boxWidth,
            height: cropRect.height * boxHeight,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.62)",
          }}
          onPointerDown={(event) => beginDrag("move", event)}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {HANDLES.map(({ handle, label, cursor, style }) => (
            <button
              key={handle}
              type="button"
              aria-label={label}
              className="absolute h-3 w-3 touch-none rounded-[2px] border border-zinc-900 bg-zinc-50 p-0"
              style={{ ...style, cursor }}
              onPointerDown={(event) => beginDrag(handle, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(event) => handleKeyDown(handle, event)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
