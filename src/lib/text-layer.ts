import type { CSSProperties } from "react";
import type {
  TextAlignment,
  TextFontFamily,
  TextFontWeight,
  TextLayer,
  VideoSize,
} from "@/types/editor";

const DEFAULT_TEXT_LAYER: Omit<TextLayer, "id"> = {
  text: "Add your text",
  x: 0,
  y: 0,
  fontSize: 72,
  fontFamily: "geist",
  fontWeight: 700,
  color: "#FFFFFF",
  textAlign: "center",
  hasShadow: true,
  opacity: 1,
};

export const MIN_TEXT_FONT_SIZE = 24;

export const MAX_TEXT_FONT_SIZE = 200;

const TEXT_FONT_STACKS: Record<TextFontFamily, string> = {
  geist: "var(--font-geist-sans), system-ui, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  courier: "'Courier New', Courier, monospace",
};

export const TEXT_FONT_OPTIONS: ReadonlyArray<{
  value: TextFontFamily;
  label: string;
}> = [
  { value: "geist", label: "Geist" },
  { value: "arial", label: "Arial" },
  { value: "georgia", label: "Georgia" },
  { value: "courier", label: "Courier New" },
];

export const TEXT_WEIGHT_OPTIONS: ReadonlyArray<{
  value: TextFontWeight;
  label: string;
}> = [
  { value: 400, label: "Regular" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
];

export const TEXT_ALIGNMENT_OPTIONS: ReadonlyArray<{
  value: TextAlignment;
  label: string;
}> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export function createTextLayer(id: string): TextLayer {
  return { id, ...DEFAULT_TEXT_LAYER };
}

export function clampTextLayerToCanvas(
  layer: TextLayer,
  canvasSize: VideoSize,
): TextLayer {
  const maxX = canvasSize.width / 2;
  const maxY = canvasSize.height / 2;

  return {
    ...layer,
    x: Math.min(Math.max(layer.x, -maxX), maxX),
    y: Math.min(Math.max(layer.y, -maxY), maxY),
  };
}

export function getTextLayerPositionStyle(
  layer: TextLayer,
  canvasSize: VideoSize,
): CSSProperties {
  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "max-content",
    maxWidth: canvasSize.width * 0.9,
    transform: `translate(-50%, -50%) translate(${layer.x}px, ${layer.y}px)`,
  };
}

export function getTextLayerStyle(layer: TextLayer): CSSProperties {
  return {
    color: layer.color,
    fontFamily: TEXT_FONT_STACKS[layer.fontFamily],
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    lineHeight: 1.2,
    opacity: layer.opacity,
    textAlign: layer.textAlign,
    textShadow: layer.hasShadow ? "0 2px 12px rgba(0, 0, 0, 0.65)" : undefined,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };
}
