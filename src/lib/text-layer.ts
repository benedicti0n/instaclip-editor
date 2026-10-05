import type { CSSProperties } from "react";
import type { TextFontFamily, TextLayer, VideoSize } from "@/types/editor";

export const DEFAULT_TEXT_LAYER: Omit<TextLayer, "id"> = {
  text: "Add your text",
  x: 0,
  y: 0,
  fontSize: 72,
  fontFamily: "geist",
  fontWeight: 700,
  color: "#FFFFFF",
  textAlign: "center",
  hasShadow: true,
};

export const MIN_TEXT_FONT_SIZE = 24;

export const MAX_TEXT_FONT_SIZE = 200;

export const TEXT_FONT_STACKS: Record<TextFontFamily, string> = {
  geist: "var(--font-geist-sans), system-ui, sans-serif",
  arial: "Arial, Helvetica, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  courier: "'Courier New', Courier, monospace",
};

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
    textAlign: layer.textAlign,
    textShadow: layer.hasShadow ? "0 2px 12px rgba(0, 0, 0, 0.65)" : undefined,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  };
}
