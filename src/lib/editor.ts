import type {
  AspectRatioPreset,
  VideoSize,
  VideoTransform,
} from "@/types/editor";

export const DEFAULT_VIDEO_TRANSFORM: VideoTransform = {
  x: 0,
  y: 0,
  scale: 1,
};

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
