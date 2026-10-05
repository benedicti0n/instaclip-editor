"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { PlayerRef } from "@remotion/player";
import { InspectorPanel } from "./inspector-panel";
import { PlaybackBar } from "./playback-bar";
import { PreviewPanel } from "./preview-panel";
import { useEditorKeyboard } from "./use-editor-keyboard";
import { useVideoExport } from "./use-video-export";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/download";
import { useEditorStore } from "@/store/editor-store";
import { selectIsDocumentDirty } from "@/store/editor-selectors";

const CAPTION_FILE_NAME = "caption.txt";

export function EditorShell() {
  const router = useRouter();
  const playerRef = useRef<PlayerRef>(null);
  useEditorKeyboard();
  const mediaSrc = useEditorStore((state) => state.media.src);
  const caption = useEditorStore((state) => state.media.caption);
  const isDirty = useEditorStore(selectIsDocumentDirty);
  const loadSourceMetadata = useEditorStore(
    (state) => state.loadSourceMetadata,
  );
  const resetEditor = useEditorStore((state) => state.resetEditor);
  const {
    status: exportStatus,
    progress: exportProgress,
    error: exportError,
    startExport,
    cancelExport,
  } = useVideoExport();

  const isExporting = exportStatus === "rendering";
  const exportLabel = isExporting
    ? exportProgress > 0
      ? `Exporting ${Math.round(exportProgress * 100)}%`
      : "Exporting…"
    : exportStatus === "success"
      ? "Export again"
      : "Export";
  const hasCaption = caption.length > 0;

  function handleDownloadCaption() {
    if (!hasCaption) {
      return;
    }

    downloadBlob(
      new Blob([caption], { type: "text/plain;charset=utf-8" }),
      CAPTION_FILE_NAME,
    );
  }

  function handleNewVideo() {
    if (isExporting) {
      return;
    }

    if (
      isDirty &&
      !window.confirm("Discard your edits and import a new video?")
    ) {
      return;
    }

    resetEditor();
    router.push("/");
  }

  useEffect(() => {
    void loadSourceMetadata();
  }, [mediaSrc, loadSourceMetadata]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-3.5rem)] lg:flex-none lg:overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6">
        <h1 className="text-sm font-medium text-zinc-300">Editor</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewVideo}
            disabled={isExporting}
          >
            New video
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCaption}
            disabled={!hasCaption}
            aria-label={
              hasCaption
                ? "Download caption"
                : "Download caption (no caption available)"
            }
            title={hasCaption ? undefined : "No caption available"}
          >
            Download caption
          </Button>
          {isExporting ? (
            <Button variant="outline" size="sm" onClick={cancelExport}>
              Cancel
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={startExport}
            disabled={isExporting}
          >
            {exportLabel}
          </Button>
        </div>
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
