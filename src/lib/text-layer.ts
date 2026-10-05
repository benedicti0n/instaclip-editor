import type { TextLayer, VideoSize } from "@/types/editor";

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
