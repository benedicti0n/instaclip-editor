import type {
  AspectRatioPreset,
  EditorDocument,
  VideoMetadata,
  VideoSize,
  VideoTransform,
} from "@/types/editor";

export const DEFAULT_VIDEO_TRANSFORM: VideoTransform = {
  x: 0,
  y: 0,
  scale: 1,
};

export const DEFAULT_ASPECT_RATIO: AspectRatioPreset = "original";

export const MIN_VIDEO_SCALE = 1;

export const MAX_VIDEO_SCALE = 3;

export function getSourceSize(metadata: VideoMetadata): VideoSize {
  return { width: metadata.width, height: metadata.height };
}

export function getDurationInFrames(
  metadata: VideoMetadata,
  fps: number,
): number {
  return Math.max(1, Math.round(metadata.durationInSeconds * fps));
}

/**
 * Whether the document contains edits worth protecting: a changed aspect
 * ratio, a moved/zoomed video, or any text layer. Importing a different media
 * source is a document lifecycle change, not an edit, and selection/playback
 * are runtime state, so neither counts here.
 */
export function isEditorDocumentDirty(document: EditorDocument): boolean {
  return (
    document.aspectRatio !== DEFAULT_ASPECT_RATIO ||
    document.videoTransform.x !== DEFAULT_VIDEO_TRANSFORM.x ||
    document.videoTransform.y !== DEFAULT_VIDEO_TRANSFORM.y ||
    document.videoTransform.scale !== DEFAULT_VIDEO_TRANSFORM.scale ||
    document.textLayers.length > 0
  );
}

export const ASPECT_RATIO_PRESETS: ReadonlyArray<{
  value: AspectRatioPreset;
  label: string;
}> = [
  { value: "original", label: "Original" },
  { value: "9:16", label: "9:16" },
  { value: "4:5", label: "4:5" },
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
];

export function getCanvasSize(
  preset: AspectRatioPreset,
  sourceSize: VideoSize,
): VideoSize {
  switch (preset) {
    case "original":
      return { width: sourceSize.width, height: sourceSize.height };
    case "9:16":
      return { width: 1080, height: 1920 };
    case "4:5":
      return { width: 1080, height: 1350 };
    case "1:1":
      return { width: 1080, height: 1080 };
    case "16:9":
      return { width: 1920, height: 1080 };
  }
}

export function getCoverScale(
  sourceSize: VideoSize,
  canvasSize: VideoSize,
): number {
  return Math.max(
    canvasSize.width / sourceSize.width,
    canvasSize.height / sourceSize.height,
  );
}

export function getRenderedVideoSize(
  sourceSize: VideoSize,
  canvasSize: VideoSize,
  scale: number,
): VideoSize {
  const coverScale = getCoverScale(sourceSize, canvasSize);

  return {
    width: sourceSize.width * coverScale * scale,
    height: sourceSize.height * coverScale * scale,
  };
}

export function getPanBounds(
  sourceSize: VideoSize,
  canvasSize: VideoSize,
  scale: number,
): { maxX: number; maxY: number } {
  const renderedSize = getRenderedVideoSize(sourceSize, canvasSize, scale);

  return {
    maxX: Math.max(0, (renderedSize.width - canvasSize.width) / 2),
    maxY: Math.max(0, (renderedSize.height - canvasSize.height) / 2),
  };
}

export function clampVideoTransform(
  transform: VideoTransform,
  sourceSize: VideoSize,
  canvasSize: VideoSize,
): VideoTransform {
  const safeScale = Math.min(
    MAX_VIDEO_SCALE,
    Math.max(MIN_VIDEO_SCALE, transform.scale),
  );
  const { maxX, maxY } = getPanBounds(sourceSize, canvasSize, safeScale);

  return {
    x: Math.min(Math.max(transform.x, -maxX), maxX),
    y: Math.min(Math.max(transform.y, -maxY), maxY),
    scale: safeScale,
  };
}
