"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  canRenderMediaOnWeb,
  renderMediaOnWeb,
  type WebRendererAudioCodec,
  type WebRendererContainer,
  type WebRendererVideoCodec,
} from "@remotion/web-renderer";
import { ClipComposition } from "@/remotion/compositions/clip-composition";
import { createExportConfiguration } from "@/remotion/export-config";
import { downloadBlob } from "@/lib/download";
import { createExportZipBlob } from "@/lib/export-zip";
import { getDownloadFilenames } from "@/lib/filenames";
import { selectEditorDocument } from "@/store/editor-selectors";
import { useEditorStore } from "@/store/editor-store";

export type VideoExportMode = "video" | "zip";

export type VideoExportStatus =
  "idle" | "rendering" | "packaging" | "success" | "error";

type CompletedExport = {
  mode: VideoExportMode;
  filename: string;
};

const EXPORT_CONTAINER: WebRendererContainer = "mp4";

const EXPORT_VIDEO_CODEC: WebRendererVideoCodec = "h264";

const EXPORT_AUDIO_CODEC: WebRendererAudioCodec = "aac";

function getExportErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return `Video export failed: ${error.message}`;
  }

  return "Video export failed. Your browser may not support the required video codec.";
}

export function useVideoExport() {
  const [status, setStatus] = useState<VideoExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<VideoExportMode | null>(null);
  const [lastExport, setLastExport] = useState<CompletedExport | null>(null);
  const isRenderingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const renderVideoBlob = useCallback(
    async (signal: AbortSignal): Promise<Blob> => {
      const document = selectEditorDocument(useEditorStore.getState());
      const config = createExportConfiguration(document);

      const capability = await canRenderMediaOnWeb({
        container: EXPORT_CONTAINER,
        videoCodec: EXPORT_VIDEO_CODEC,
        audioCodec: EXPORT_AUDIO_CODEC,
        width: config.width,
        height: config.height,
      });

      if (!capability.canRender) {
        const issue = capability.issues.find(
          (candidate) => candidate.severity === "error",
        );
        throw new Error(issue?.message ?? "This browser cannot render video.");
      }

      const result = await renderMediaOnWeb({
        composition: {
          id: "clipcrop-export",
          component: ClipComposition,
          width: config.width,
          height: config.height,
          fps: config.fps,
          durationInFrames: config.durationInFrames,
          defaultProps: config.inputProps,
        },
        inputProps: config.inputProps,
        container: EXPORT_CONTAINER,
        videoCodec: EXPORT_VIDEO_CODEC,
        audioCodec: EXPORT_AUDIO_CODEC,
        signal,
        licenseKey: "free-license",
        onProgress: ({ progress: nextProgress }) => {
          setProgress(nextProgress);
        },
      });

      return await result.getBlob();
    },
    [],
  );

  const startExport = useCallback(
    async (mode: VideoExportMode) => {
      if (isRenderingRef.current) {
        return;
      }

      isRenderingRef.current = true;

      const controller = new AbortController();
      abortRef.current = controller;

      const document = selectEditorDocument(useEditorStore.getState());
      const filenames = getDownloadFilenames(document.media);

      setStatus("rendering");
      setProgress(0);
      setError(null);
      setActiveMode(mode);

      try {
        const videoBlob = await renderVideoBlob(controller.signal);
        if (controller.signal.aborted) {
          return;
        }

        if (mode === "zip") {
          setStatus("packaging");

          const zipBlob = await createExportZipBlob(
            videoBlob,
            document.media.caption,
            { video: filenames.video, caption: filenames.caption },
          );

          if (controller.signal.aborted) {
            return;
          }

          downloadBlob(zipBlob, filenames.zip);
          setLastExport({ mode, filename: filenames.zip });
        } else {
          downloadBlob(videoBlob, filenames.video);
          setLastExport({ mode, filename: filenames.video });
        }

        setStatus("success");
      } catch (caught) {
        if (controller.signal.aborted) {
          setStatus("idle");
          setProgress(0);
          setError(null);
          setActiveMode(null);
          return;
        }

        console.error("[export] render failed", caught);
        setError(getExportErrorMessage(caught));
        setStatus("error");
      } finally {
        isRenderingRef.current = false;
        abortRef.current = null;
      }
    },
    [renderVideoBlob],
  );

  const cancelExport = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    status,
    progress,
    error,
    activeMode,
    lastExport,
    startExport,
    cancelExport,
  };
}
