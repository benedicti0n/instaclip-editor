import {
  clampCropRect,
  clampVideoTransform,
  getCanvasSize,
  getCropSize,
  getSourceSize,
} from "@/lib/editor";
import { clampTextLayerToCanvas } from "@/lib/text-layer";
import type {
  CropRect,
  EditorDocument,
  TextLayer,
  VideoTransform,
} from "@/types/editor";

export type ClipRenderInput = {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  cropRect: CropRect;
  transform: VideoTransform;
  textLayers: TextLayer[];
};

export function createClipRenderInput(
  document: EditorDocument,
): ClipRenderInput {
  const sourceSize = getSourceSize(document.sourceMetadata);
  const cropRect = clampCropRect(document.cropRect);
  const canvasSize = getCanvasSize(document.aspectRatio, sourceSize, cropRect);
  const cropSize = getCropSize(sourceSize, cropRect);

  return {
    src: document.media.src,
    sourceWidth: sourceSize.width,
    sourceHeight: sourceSize.height,
    cropRect,
    transform: clampVideoTransform(
      document.videoTransform,
      cropSize,
      canvasSize,
    ),
    textLayers: document.textLayers.map((layer) =>
      clampTextLayerToCanvas(layer, canvasSize),
    ),
  };
}
