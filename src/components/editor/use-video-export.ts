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
import { selectEditorDocument } from "@/store/editor-selectors";
import { useEditorStore } from "@/store/editor-store";

type VideoExportStatus = "idle" | "rendering" | "success" | "error";

const EXPORT_FILE_NAME = "edited-video.mp4";

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
  const isRenderingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const startExport = useCallback(async () => {
    if (isRenderingRef.current) {
      return;
    }

    isRenderingRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    const document = selectEditorDocument(useEditorStore.getState());
    const config = createExportConfiguration(document);

    setStatus("rendering");
    setProgress(0);
    setError(null);

    try {
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
        signal: controller.signal,
        licenseKey: "free-license",
        onProgress: ({ progress: nextProgress }) => {
          setProgress(nextProgress);
        },
      });

      const blob = await result.getBlob();
      if (controller.signal.aborted) {
        return;
      }

      downloadBlob(blob, EXPORT_FILE_NAME);
      setStatus("success");
    } catch (caught) {
      if (controller.signal.aborted) {
        setStatus("idle");
        setProgress(0);
        setError(null);
        return;
      }

      console.error("[export] render failed", caught);
      setError(getExportErrorMessage(caught));
      setStatus("error");
    } finally {
      isRenderingRef.current = false;
      abortRef.current = null;
    }
  }, []);

  const cancelExport = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { status, progress, error, startExport, cancelExport };
}
