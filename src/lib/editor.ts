import type {
  AspectRatioPreset,
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
