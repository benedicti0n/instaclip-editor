"use client";

import { useEffect, useRef } from "react";
import type { PlayerRef } from "@remotion/player";
import { InspectorPanel } from "./inspector-panel";
import { PlaybackBar } from "./playback-bar";
import { PreviewPanel } from "./preview-panel";
import { Button } from "@/components/ui/button";
import { getVideoMetadata } from "@/lib/media";
import { SAMPLE_VIDEO_SRC } from "@/lib/sample-video";
import { CLIP_COMPOSITION_FPS } from "@/remotion/compositions/clip-composition";
import { useEditorStore } from "@/store/editor-store";
import { selectDurationInFrames } from "@/store/editor-selectors";

export function EditorShell() {
  const playerRef = useRef<PlayerRef>(null);
  const durationInFrames = useEditorStore(selectDurationInFrames);
  const setSourceMetadata = useEditorStore((state) => state.setSourceMetadata);

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
        <PreviewPanel playerRef={playerRef} />
        <InspectorPanel />
      </div>
      <PlaybackBar
        playerRef={playerRef}
        durationInFrames={durationInFrames}
        fps={CLIP_COMPOSITION_FPS}
      />
    </div>
  );
}
