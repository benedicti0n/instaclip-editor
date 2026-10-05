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
import { getVideoDurationInSeconds } from "@/lib/media";
import {
  SAMPLE_VIDEO_DURATION_IN_SECONDS,
  SAMPLE_VIDEO_HEIGHT,
  SAMPLE_VIDEO_SRC,
  SAMPLE_VIDEO_WIDTH,
} from "@/lib/sample-video";
import { CLIP_COMPOSITION_FPS } from "@/remotion/compositions/clip-composition";
import type {
  AspectRatioPreset,
  VideoSize,
  VideoTransform,
} from "@/types/editor";

const INITIAL_DURATION_IN_FRAMES =
  SAMPLE_VIDEO_DURATION_IN_SECONDS * CLIP_COMPOSITION_FPS;

const SOURCE_SIZE: VideoSize = {
  width: SAMPLE_VIDEO_WIDTH,
  height: SAMPLE_VIDEO_HEIGHT,
};

export function EditorShell() {
  const playerRef = useRef<PlayerRef>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>("original");
  const [videoTransform, setVideoTransform] = useState<VideoTransform>(
    DEFAULT_VIDEO_TRANSFORM,
  );
  const [durationInFrames, setDurationInFrames] = useState(
    INITIAL_DURATION_IN_FRAMES,
  );
  const canvasSize = getCanvasSize(aspectRatio, SOURCE_SIZE);

  function handleTransformChange(next: VideoTransform) {
    setVideoTransform(clampVideoTransform(next, SOURCE_SIZE, canvasSize));
  }

  function handleScaleChange(nextScale: number) {
    setVideoTransform((current) => {
      const ratio = current.scale > 0 ? nextScale / current.scale : 1;

      return clampVideoTransform(
        {
          x: current.x * ratio,
          y: current.y * ratio,
          scale: nextScale,
        },
        SOURCE_SIZE,
        canvasSize,
      );
    });
  }

  function handleResetFraming() {
    setVideoTransform(DEFAULT_VIDEO_TRANSFORM);
  }

  useEffect(() => {
    let cancelled = false;

    getVideoDurationInSeconds(SAMPLE_VIDEO_SRC)
      .then((seconds) => {
        if (!cancelled) {
          setDurationInFrames(
            Math.max(1, Math.round(seconds * CLIP_COMPOSITION_FPS)),
          );
        }
      })
      .catch(() => {
        // Keep the known fixture duration if metadata cannot be loaded.
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
          sourceSize={SOURCE_SIZE}
          transform={videoTransform}
          onTransformChange={handleTransformChange}
        />
        <InspectorPanel
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          scale={videoTransform.scale}
          onScaleChange={handleScaleChange}
          onResetFraming={handleResetFraming}
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
