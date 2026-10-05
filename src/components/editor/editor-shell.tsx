"use client";

import { useEffect, useRef } from "react";
import type { PlayerRef } from "@remotion/player";
import { InspectorPanel } from "./inspector-panel";
import { PlaybackBar } from "./playback-bar";
import { PreviewPanel } from "./preview-panel";
import { Button } from "@/components/ui/button";
import { clampVideoTransform, getCanvasSize } from "@/lib/editor";
import { getVideoMetadata } from "@/lib/media";
import { SAMPLE_VIDEO_SRC } from "@/lib/sample-video";
import { clampTextLayerToCanvas } from "@/lib/text-layer";
import { CLIP_COMPOSITION_FPS } from "@/remotion/compositions/clip-composition";
import { useEditorStore } from "@/store/editor-store";
import type { VideoSize } from "@/types/editor";

export function EditorShell() {
  const playerRef = useRef<PlayerRef>(null);
  const aspectRatio = useEditorStore((state) => state.aspectRatio);
  const videoTransform = useEditorStore((state) => state.videoTransform);
  const sourceMetadata = useEditorStore((state) => state.sourceMetadata);
  const textLayers = useEditorStore((state) => state.textLayers);
  const selectedTextLayerId = useEditorStore(
    (state) => state.selectedTextLayerId,
  );
  const setAspectRatio = useEditorStore((state) => state.setAspectRatio);
  const setVideoTransform = useEditorStore((state) => state.setVideoTransform);
  const setVideoScale = useEditorStore((state) => state.setVideoScale);
  const resetVideoTransform = useEditorStore(
    (state) => state.resetVideoTransform,
  );
  const setSourceMetadata = useEditorStore((state) => state.setSourceMetadata);
  const addTextLayer = useEditorStore((state) => state.addTextLayer);
  const updateTextLayer = useEditorStore((state) => state.updateTextLayer);
  const deleteTextLayer = useEditorStore((state) => state.deleteTextLayer);
  const selectTextLayer = useEditorStore((state) => state.selectTextLayer);

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

  function handleDeleteTextLayer() {
    if (selectedTextLayerId) {
      deleteTextLayer(selectedTextLayerId);
    }
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
          onSelectTextLayer={selectTextLayer}
          onTextLayerChange={updateTextLayer}
        />
        <InspectorPanel
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          scale={clampedVideoTransform.scale}
          onScaleChange={setVideoScale}
          onResetFraming={resetVideoTransform}
          selectedTextLayer={selectedTextLayer}
          onAddTextLayer={addTextLayer}
          onTextLayerChange={updateTextLayer}
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
