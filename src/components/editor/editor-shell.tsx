"use client";

import { useEffect, useRef } from "react";
import type { PlayerRef } from "@remotion/player";
import { InspectorPanel } from "./inspector-panel";
import { PlaybackBar } from "./playback-bar";
import { PreviewPanel } from "./preview-panel";
import { useVideoExport } from "./use-video-export";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editor-store";

export function EditorShell() {
  const playerRef = useRef<PlayerRef>(null);
  const mediaSrc = useEditorStore((state) => state.media.src);
  const loadSourceMetadata = useEditorStore(
    (state) => state.loadSourceMetadata,
  );
  const {
    status: exportStatus,
    progress: exportProgress,
    error: exportError,
    startExport,
  } = useVideoExport();

  const isExporting = exportStatus === "rendering";
  const exportLabel = isExporting
    ? exportProgress > 0
      ? `Exporting ${Math.round(exportProgress * 100)}%`
      : "Exporting…"
    : exportStatus === "success"
      ? "Export again"
      : "Export";

  useEffect(() => {
    void loadSourceMetadata();
  }, [mediaSrc, loadSourceMetadata]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6">
        <h1 className="text-sm font-medium text-zinc-300">Editor</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={startExport}
          disabled={isExporting}
        >
          {exportLabel}
        </Button>
      </header>
      {exportError ? (
        <p
          role="alert"
          className="border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-red-400 sm:px-6"
        >
          {exportError}
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <PreviewPanel playerRef={playerRef} />
        <InspectorPanel />
      </div>
      <PlaybackBar playerRef={playerRef} />
    </div>
  );
}
