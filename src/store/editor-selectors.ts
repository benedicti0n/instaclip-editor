import {
  clampVideoTransform,
  getCanvasSize,
  getDurationInFrames,
  getSourceSize,
} from "@/lib/editor";
import { CLIP_COMPOSITION_FPS } from "@/remotion/constants";
import type { EditorState } from "./editor-store";
import type { EditorDocument, TextLayer } from "@/types/editor";

export function selectEditorDocument(state: EditorState): EditorDocument {
  return {
    media: state.media,
    sourceMetadata: state.sourceMetadata,
    aspectRatio: state.aspectRatio,
    videoTransform: state.videoTransform,
    textLayers: state.textLayers,
  };
}

export function selectSelectedTextLayer(state: EditorState): TextLayer | null {
  return (
    state.textLayers.find((layer) => layer.id === state.selectedTextLayerId) ??
    null
  );
}

export function selectClampedVideoScale(state: EditorState): number {
  const sourceSize = getSourceSize(state.sourceMetadata);
  const canvasSize = getCanvasSize(state.aspectRatio, sourceSize);

  return clampVideoTransform(state.videoTransform, sourceSize, canvasSize)
    .scale;
}

export function selectDurationInFrames(state: EditorState): number {
  return getDurationInFrames(state.sourceMetadata, CLIP_COMPOSITION_FPS);
}
