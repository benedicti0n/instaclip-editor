"use client";

import { useRef } from "react";
import type { PlayerRef } from "@remotion/player";
import { InspectorPanel } from "./inspector-panel";
import { PlaybackBar } from "./playback-bar";
import { PreviewPanel } from "./preview-panel";
import { Button } from "@/components/ui/button";
import { SAMPLE_VIDEO_DURATION_IN_SECONDS } from "@/lib/sample-video";
import { CLIP_COMPOSITION_FPS } from "@/remotion/compositions/clip-composition";

const DURATION_IN_FRAMES =
  SAMPLE_VIDEO_DURATION_IN_SECONDS * CLIP_COMPOSITION_FPS;

export function EditorShell() {
  const playerRef = useRef<PlayerRef>(null);

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
          durationInFrames={DURATION_IN_FRAMES}
        />
        <InspectorPanel />
      </div>
      <PlaybackBar
        playerRef={playerRef}
        durationInFrames={DURATION_IN_FRAMES}
        fps={CLIP_COMPOSITION_FPS}
      />
    </div>
  );
}
