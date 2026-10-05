"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { InspectorPanel } from "./inspector-panel";
import { PlaybackBar } from "./playback-bar";
import { PreviewPanel } from "./preview-panel";
import { Button } from "@/components/ui/button";
import { clampVideoTransform, getCanvasSize } from "@/lib/editor";
import { getVideoMetadata } from "@/lib/media";
import { SAMPLE_VIDEO_SRC } from "@/lib/sample-video";
import { clampTextLayerToCanvas, createTextLayer } from "@/lib/text-layer";
import { CLIP_COMPOSITION_FPS } from "@/remotion/compositions/clip-composition";
import { useEditorStore } from "@/store/editor-store";
import type {
  AspectRatioPreset,
  TextLayer,
  VideoSize,
} from "@/types/editor";

export function EditorShell() {
  const playerRef = useRef<PlayerRef>(null);
  const aspectRatio = useEditorStore((state) => state.aspectRatio);
  const videoTransform = useEditorStore((state) => state.videoTransform);
  const sourceMetadata = useEditorStore((state) => state.sourceMetadata);
  const setAspectRatio = useEditorStore((state) => state.setAspectRatio);
  const setVideoTransform = useEditorStore((state) => state.setVideoTransform);
  const setVideoScale = useEditorStore((state) => state.setVideoScale);
  const resetVideoTransform = useEditorStore(
    (state) => state.resetVideoTransform,
  );
  const setSourceMetadata = useEditorStore((state) => state.setSourceMetadata);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextLayerId, setSelectedTextLayerId] = useState<string | null>(
    null,
  );

  const selectedTextLayer =
    textLayers.find((layer) => layer.id === selectedTextLayerId) ?? null;

  const sourceSize: VideoSize = {
    width: sourceMetadata.width,
    height: sourceMetadata.height,
  };
  const canvasSize = getCanvasSize(aspectRatio, sourceSize);
  const clampedVideoTransform = clampVideoTransform(
    videoTransform,
    sourceSize,
    canvasSize,
  );
  const clampedTextLayers = textLayers.map((layer) =>
    clampTextLayerToCanvas(layer, canvasSize),
  );
  const durationInFrames = Math.max(
    1,
    Math.round(sourceMetadata.durationInSeconds * CLIP_COMPOSITION_FPS),
  );

  function handleAspectRatioChange(next: AspectRatioPreset) {
    const nextCanvasSize = getCanvasSize(next, sourceSize);

    setAspectRatio(next);
    setTextLayers((layers) =>
      layers.map((layer) => clampTextLayerToCanvas(layer, nextCanvasSize)),
    );
  }

  function handleAddTextLayer() {
    const layer = createTextLayer(crypto.randomUUID());

    setTextLayers((layers) => [...layers, layer]);
    setSelectedTextLayerId(layer.id);
  }

  function handleSelectTextLayer(id: string) {
    setSelectedTextLayerId(id);
  }

  function handleDeleteTextLayer() {
    if (!selectedTextLayerId) {
      return;
    }

    const selectedIndex = textLayers.findIndex(
      (layer) => layer.id === selectedTextLayerId,
    );
    const remainingLayers = textLayers.filter(
      (layer) => layer.id !== selectedTextLayerId,
    );
    const nextSelected =
      remainingLayers[Math.min(selectedIndex, remainingLayers.length - 1)] ??
      null;

    setTextLayers(remainingLayers);
    setSelectedTextLayerId(nextSelected?.id ?? null);
  }

  function handleTextLayerChange(id: string, patch: Partial<TextLayer>) {
    setTextLayers((layers) =>
      layers.map((layer) =>
        layer.id === id
          ? clampTextLayerToCanvas({ ...layer, ...patch }, canvasSize)
          : layer,
      ),
    );
  }

  useEffect(() => {
    let cancelled = false;

    getVideoMetadata(SAMPLE_VIDEO_SRC)
      .then((metadata) => {
        if (!cancelled) {
          setSourceMetadata(metadata);
        }
      })
      .catch(() => {
        // Keep the known fixture metadata if it cannot be loaded.
      });

    return () => {
      cancelled = true;
    };
  }, [setSourceMetadata]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6">
        <h1 className="text-sm font-medium text-zinc-300">Editor</h1>
        <Button variant="outline" size="sm" disabled>
          Export
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <PreviewPanel
          playerRef={playerRef}
          durationInFrames={durationInFrames}
          canvasSize={canvasSize}
          sourceSize={sourceSize}
          transform={clampedVideoTransform}
          onTransformChange={setVideoTransform}
          textLayers={clampedTextLayers}
          selectedTextLayerId={selectedTextLayerId}
          onSelectTextLayer={handleSelectTextLayer}
          onTextLayerChange={handleTextLayerChange}
        />
        <InspectorPanel
          aspectRatio={aspectRatio}
          onAspectRatioChange={handleAspectRatioChange}
          scale={clampedVideoTransform.scale}
          onScaleChange={setVideoScale}
          onResetFraming={resetVideoTransform}
          selectedTextLayer={selectedTextLayer}
          onAddTextLayer={handleAddTextLayer}
          onTextLayerChange={handleTextLayerChange}
          onDeleteTextLayer={handleDeleteTextLayer}
        />
      </div>
      <PlaybackBar
        playerRef={playerRef}
        durationInFrames={durationInFrames}
        fps={CLIP_COMPOSITION_FPS}
      />
    </div>
  );
}
