"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlayerRef } from "@remotion/player";
import { InspectorPanel } from "./inspector-panel";
import { PlaybackBar } from "./playback-bar";
import { PreviewPanel } from "./preview-panel";
import { useEditorKeyboard } from "./use-editor-keyboard";
import { useVideoExport } from "./use-video-export";
import { Button } from "@/components/ui/button";
import { downloadBlob, downloadUrl } from "@/lib/download";
import { getDownloadFilenames } from "@/lib/filenames";
import { useEditorStore } from "@/store/editor-store";
import { selectIsDocumentDirty } from "@/store/editor-selectors";

export function EditorShell() {
  const router = useRouter();
  const playerRef = useRef<PlayerRef>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  useEditorKeyboard();
  const media = useEditorStore((state) => state.media);
  const mediaSrc = media.src;
  const mediaKind = media.kind;
  const caption = media.caption;
  const { video: videoFileName, caption: captionFileName } =
    getDownloadFilenames(media);
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

  function handleDownloadSource() {
    downloadUrl(mediaSrc, videoFileName);
  }

  function handleDownloadCaption() {
    if (!hasCaption) {
      return;
    }

    downloadBlob(
      new Blob([caption], { type: "text/plain;charset=utf-8" }),
      captionFileName,
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

  if (process.env.NODE_ENV === "production" && mediaKind === "sample") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-zinc-50">
            No video imported
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Import an Instagram Reel to start editing it in ClipCrop.
          </p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            Import video
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-3.5rem)] lg:flex-none lg:overflow-hidden">
      <header className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950 px-4 py-2 sm:px-6 lg:h-12 lg:flex-nowrap lg:py-0">
        <h1 className="sr-only text-sm font-medium text-zinc-300 sm:not-sr-only">
          Editor
        </h1>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewVideo}
            disabled={isExporting}
          >
            New video
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadSource}>
            Download source
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
          >
            {hasCaption ? "Download caption" : "No caption"}
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
      ) : exportStatus === "success" ? (
        <p
          role="status"
          className="border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-400 sm:px-6"
        >
          Export complete — {videoFileName} saved.
        </p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <PreviewPanel
          playerRef={playerRef}
          onPlayerReady={() => setIsPlayerReady(true)}
        />
        <InspectorPanel />
      </div>
      <PlaybackBar playerRef={playerRef} isPlayerReady={isPlayerReady} />
    </div>
  );
}
