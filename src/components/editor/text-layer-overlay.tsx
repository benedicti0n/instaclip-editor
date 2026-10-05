"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { getTextLayerPositionStyle, getTextLayerStyle } from "@/lib/text-layer";
import type { TextLayer, VideoSize } from "@/types/editor";

type TextLayerOverlayProps = {
  textLayers: TextLayer[];
  selectedTextLayerId: string | null;
  canvasSize: VideoSize;
  previewScale: number;
  onSelectTextLayer: (id: string) => void;
  onTextLayerChange: (id: string, patch: Partial<TextLayer>) => void;
};

type DragState = {
  pointerId: number;
  layerId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  previewScale: number;
};

export function TextLayerOverlay({
  textLayers,
  selectedTextLayerId,
  canvasSize,
  previewScale,
  onSelectTextLayer,
  onTextLayerChange,
}: TextLayerOverlayProps) {
  const dragStateRef = useRef<DragState | null>(null);

  function handlePointerDown(
    layer: TextLayer,
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectTextLayer(layer.id);
    event.currentTarget.setPointerCapture(event.pointerId);

    dragStateRef.current = {
      pointerId: event.pointerId,
      layerId: layer.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layer.x,
      startY: layer.y,
      previewScale: previewScale > 0 ? previewScale : 1,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    onTextLayerChange(drag.layerId, {
      x: drag.startX + (event.clientX - drag.startClientX) / drag.previewScale,
      y: drag.startY + (event.clientY - drag.startClientY) / drag.previewScale,
    });
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
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

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          transform: `scale(${previewScale})`,
        }}
      >
        {textLayers.map((layer) => {
          const isSelected = layer.id === selectedTextLayerId;
          const isEmpty = layer.text.length === 0;

          return (
            <div
              key={layer.id}
              className="pointer-events-auto cursor-move touch-none select-none"
              style={{
                ...getTextLayerPositionStyle(layer, canvasSize),
                ...(isEmpty
                  ? { minWidth: layer.fontSize, minHeight: layer.fontSize }
                  : {}),
                outline: isSelected
                  ? "1px solid rgba(228, 228, 231, 0.9)"
                  : undefined,
              }}
              onPointerDown={(event) => handlePointerDown(layer, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
              <div
                aria-hidden="true"
                style={{ ...getTextLayerStyle(layer), opacity: 0 }}
              >
                {layer.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
