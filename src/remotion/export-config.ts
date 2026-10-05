import {
  getCanvasSize,
  getDurationInFrames,
  getSourceSize,
} from "@/lib/editor";
import { createClipRenderInput } from "@/remotion/clip-render-input";
import { CLIP_COMPOSITION_FPS } from "@/remotion/constants";
import type { ClipRenderInput } from "@/remotion/clip-render-input";
import type { EditorDocument } from "@/types/editor";

type ExportConfiguration = {
  inputProps: ClipRenderInput;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
};

export function createExportConfiguration(
  document: EditorDocument,
): ExportConfiguration {
  const sourceSize = getSourceSize(document.sourceMetadata);
  const canvasSize = getCanvasSize(document.aspectRatio, sourceSize);

  return {
    inputProps: createClipRenderInput(document),
    width: canvasSize.width,
    height: canvasSize.height,
    fps: CLIP_COMPOSITION_FPS,
    durationInFrames: getDurationInFrames(
      document.sourceMetadata,
      CLIP_COMPOSITION_FPS,
    ),
  };
}
