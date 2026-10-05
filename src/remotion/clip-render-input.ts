import {
  clampVideoTransform,
  getCanvasSize,
  getSourceSize,
} from "@/lib/editor";
import { clampTextLayerToCanvas } from "@/lib/text-layer";
import type { EditorDocument, TextLayer, VideoTransform } from "@/types/editor";

export type ClipRenderInput = {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  transform: VideoTransform;
  textLayers: TextLayer[];
};

export function createClipRenderInput(
  document: EditorDocument,
): ClipRenderInput {
  const sourceSize = getSourceSize(document.sourceMetadata);
  const canvasSize = getCanvasSize(document.aspectRatio, sourceSize);

  return {
    src: document.media.src,
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
    transform: clampVideoTransform(
      document.videoTransform,
      sourceSize,
      canvasSize,
    ),
    textLayers: document.textLayers.map((layer) =>
      clampTextLayerToCanvas(layer, canvasSize),
    ),
  };
}
