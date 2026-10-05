"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { InspectorPanel } from "./inspector-panel";
import { PlaybackBar } from "./playback-bar";
import { PreviewPanel } from "./preview-panel";
import { Button } from "@/components/ui/button";
import {
  clampVideoTransform,
  getCanvasSize,
  DEFAULT_VIDEO_TRANSFORM,
} from "@/lib/editor";
import { getVideoMetadata, type VideoMetadata } from "@/lib/media";
import {
  SAMPLE_VIDEO_DURATION_IN_SECONDS,
  SAMPLE_VIDEO_HEIGHT,
  SAMPLE_VIDEO_SRC,
  SAMPLE_VIDEO_WIDTH,
} from "@/lib/sample-video";
import { clampTextLayerToCanvas, createTextLayer } from "@/lib/text-layer";
import { CLIP_COMPOSITION_FPS } from "@/remotion/compositions/clip-composition";
import type {
  AspectRatioPreset,
  TextLayer,
  VideoSize,
  VideoTransform,
} from "@/types/editor";

const INITIAL_SOURCE_METADATA: VideoMetadata = {
  durationInSeconds: SAMPLE_VIDEO_DURATION_IN_SECONDS,
  width: SAMPLE_VIDEO_WIDTH,
  height: SAMPLE_VIDEO_HEIGHT,
};

export function EditorShell() {
  const playerRef = useRef<PlayerRef>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>("original");
  const [videoTransform, setVideoTransform] = useState<VideoTransform>(
    DEFAULT_VIDEO_TRANSFORM,
  );
  const [sourceMetadata, setSourceMetadata] = useState<VideoMetadata>(
    INITIAL_SOURCE_METADATA,
  );
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

  function handleTransformChange(next: VideoTransform) {
    setVideoTransform(clampVideoTransform(next, sourceSize, canvasSize));
  }

  function handleAspectRatioChange(next: AspectRatioPreset) {
    const nextCanvasSize = getCanvasSize(next, sourceSize);

    setAspectRatio(next);
    setVideoTransform((current) =>
      clampVideoTransform(current, sourceSize, nextCanvasSize),
    );
    setTextLayers((layers) =>
      layers.map((layer) => clampTextLayerToCanvas(layer, nextCanvasSize)),
    );
  }

  function handleAddTextLayer() {
    const layer = createTextLayer(crypto.randomUUID());

    setTextLayers((layers) => [...layers, layer]);
    setSelectedTextLayerId(layer.id);
  }

  function handleScaleChange(nextScale: number) {
    const ratio =
      clampedVideoTransform.scale > 0
        ? nextScale / clampedVideoTransform.scale
        : 1;

    setVideoTransform(
      clampVideoTransform(
        {
          x: clampedVideoTransform.x * ratio,
          y: clampedVideoTransform.y * ratio,
          scale: nextScale,
        },
        sourceSize,
        canvasSize,
      ),
    );
  }

  function handleResetFraming() {
    setVideoTransform(DEFAULT_VIDEO_TRANSFORM);
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
  }, []);

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
          onTransformChange={handleTransformChange}
          textLayers={clampedTextLayers}
        />
        <InspectorPanel
          aspectRatio={aspectRatio}
          onAspectRatioChange={handleAspectRatioChange}
          scale={clampedVideoTransform.scale}
          onScaleChange={handleScaleChange}
          onResetFraming={handleResetFraming}
          selectedTextLayer={selectedTextLayer}
          onAddTextLayer={handleAddTextLayer}
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
