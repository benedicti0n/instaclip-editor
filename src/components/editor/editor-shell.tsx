"use client";

import { useEffect, useRef } from "react";
import type { PlayerRef } from "@remotion/player";
import { InspectorPanel } from "./inspector-panel";
import { PlaybackBar } from "./playback-bar";
import { PreviewPanel } from "./preview-panel";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editor-store";

export function EditorShell() {
  const playerRef = useRef<PlayerRef>(null);
  const mediaSrc = useEditorStore((state) => state.media.src);
  const loadSourceMetadata = useEditorStore(
    (state) => state.loadSourceMetadata,
  );

  useEffect(() => {
    void loadSourceMetadata();
  }, [mediaSrc, loadSourceMetadata]);

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
      <PlaybackBar playerRef={playerRef} />
    </div>
  );
}
