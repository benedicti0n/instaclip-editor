"use client";

import type { CSSProperties, RefObject } from "react";
import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import {
  CLIP_COMPOSITION_FPS,
  ClipComposition,
} from "@/remotion/compositions/clip-composition";
import { SAMPLE_VIDEO_SRC } from "@/lib/sample-video";
import type { VideoSize, VideoTransform } from "@/types/editor";

type PreviewPanelProps = {
  playerRef: RefObject<PlayerRef | null>;
  durationInFrames: number;
  canvasSize: VideoSize;
  sourceSize: VideoSize;
  transform: VideoTransform;
};

export function PreviewPanel({
  playerRef,
  durationInFrames,
  canvasSize,
  sourceSize,
  transform,
}: PreviewPanelProps) {
  const inputProps = {
    src: SAMPLE_VIDEO_SRC,
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
    transform,
  };

  return (
    <section
      aria-label="Video preview"
      className="flex min-h-0 flex-1 items-center justify-center bg-zinc-950 p-4 sm:p-6 lg:[container-type:size]"
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-zinc-800 bg-black lg:w-[min(100cqw,calc(100cqh*var(--clip-ratio)))] lg:max-w-none"
        style={
          {
            aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
            "--clip-ratio": canvasSize.width / canvasSize.height,
          } as CSSProperties
        }
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
      </div>
    </section>
  );
}
