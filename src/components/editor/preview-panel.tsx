"use client";

import type { RefObject } from "react";
import { Player } from "@remotion/player";
import type { PlayerRef } from "@remotion/player";
import {
  CLIP_COMPOSITION_FPS,
  CLIP_COMPOSITION_HEIGHT,
  CLIP_COMPOSITION_WIDTH,
  ClipComposition,
} from "@/remotion/compositions/clip-composition";
import { SAMPLE_VIDEO_SRC } from "@/lib/sample-video";

const INPUT_PROPS = { src: SAMPLE_VIDEO_SRC };

type PreviewPanelProps = {
  playerRef: RefObject<PlayerRef | null>;
  durationInFrames: number;
};

export function PreviewPanel({
  playerRef,
  durationInFrames,
}: PreviewPanelProps) {
  return (
    <section
      aria-label="Video preview"
      className="flex min-h-0 flex-1 items-center justify-center bg-zinc-950 p-4 sm:p-6"
    >
      <div className="aspect-[9/16] w-full max-w-sm overflow-hidden rounded-xl border border-zinc-800 bg-black lg:aspect-auto lg:h-full lg:min-h-0">
        <Player
          ref={playerRef}
          component={ClipComposition}
          inputProps={INPUT_PROPS}
          durationInFrames={durationInFrames}
          compositionWidth={CLIP_COMPOSITION_WIDTH}
          compositionHeight={CLIP_COMPOSITION_HEIGHT}
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
