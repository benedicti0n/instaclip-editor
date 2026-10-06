import {
  clampCropRect,
  clampVideoTransform,
  getCanvasSize,
  getCropAspectConstraint,
  getCropSize,
  getSourceSize,
  normalizeCropRectToAspect,
} from "@/lib/editor";
import {
  clampTextLayerToCanvas,
  MAX_TEXT_FONT_SIZE,
  MIN_TEXT_FONT_SIZE,
} from "@/lib/text-layer";
import type {
  AspectRatioPreset,
  CropRect,
  EditorDocument,
  TextAlignment,
  TextFontFamily,
  TextFontWeight,
  TextLayer,
  VideoMetadata,
  VideoTransform,
} from "@/types/editor";

/**
 * A text layer as stored in a preset. Geometry is normalized against the
 * output canvas (center-relative ratios) so a preset reproduces the same
 * relative placement and typography on sources of any size:
 *
 * - `xRatio = x / canvasWidth` (0 = horizontally centered)
 * - `yRatio = y / canvasHeight` (0 = vertically centered)
 * - `fontSizeRatio = fontSize / canvasHeight`
 */
export type PresetTextLayer = {
  text: string;
  xRatio: number;
  yRatio: number;
  fontSizeRatio: number;
  fontFamily: TextFontFamily;
  fontWeight: TextFontWeight;
  color: string;
  textAlign: TextAlignment;
  hasShadow: boolean;
  opacity: number;
};

/**
 * A reusable editing configuration. Presets intentionally exclude everything
 * source-specific: media, caption, URL, playback, selection, and export state.
 */
export type EditorPreset = {
  id: string;
  name: string;
  createdAt: string;
  aspectRatio: AspectRatioPreset;
  cropRect: CropRect;
  videoTransform: {
    xRatio: number;
    yRatio: number;
    scale: number;
  };
  textLayers: PresetTextLayer[];
};

export type AppliedPreset = {
  aspectRatio: AspectRatioPreset;
  cropRect: CropRect;
  videoTransform: VideoTransform;
  textLayers: TextLayer[];
};

const ASPECT_RATIOS: ReadonlySet<string> = new Set([
  "original",
  "9:16",
  "4:5",
  "1:1",
  "16:9",
  "free",
]);

const FONT_FAMILIES: ReadonlySet<string> = new Set([
  "geist",
  "arial",
  "georgia",
  "courier",
]);

const FONT_WEIGHTS: ReadonlySet<number> = new Set([400, 600, 700]);

const TEXT_ALIGNMENTS: ReadonlySet<string> = new Set([
  "left",
  "center",
  "right",
]);

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function createPreset(
  name: string,
  document: EditorDocument,
): EditorPreset {
  const sourceSize = getSourceSize(document.sourceMetadata);
  const cropRect = clampCropRect(document.cropRect);
  const canvasSize = getCanvasSize(document.aspectRatio, sourceSize, cropRect);
  const cropSize = getCropSize(sourceSize, cropRect);
  const transform = clampVideoTransform(
    document.videoTransform,
    cropSize,
    canvasSize,
  );

  return {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled preset",
    createdAt: new Date().toISOString(),
    aspectRatio: document.aspectRatio,
    cropRect,
    videoTransform: {
      xRatio: canvasSize.width > 0 ? transform.x / canvasSize.width : 0,
      yRatio: canvasSize.height > 0 ? transform.y / canvasSize.height : 0,
      scale: transform.scale,
    },
    textLayers: document.textLayers.map((layer) => {
      const clamped = clampTextLayerToCanvas(layer, canvasSize);

      return {
        text: layer.text,
        xRatio: canvasSize.width > 0 ? clamped.x / canvasSize.width : 0,
        yRatio: canvasSize.height > 0 ? clamped.y / canvasSize.height : 0,
        fontSizeRatio:
          canvasSize.height > 0 ? layer.fontSize / canvasSize.height : 0,
        fontFamily: layer.fontFamily,
        fontWeight: layer.fontWeight,
        color: layer.color,
        textAlign: layer.textAlign,
        hasShadow: layer.hasShadow,
        opacity: layer.opacity,
      };
    }),
  };
}

/**
 * Maps a preset onto a specific source video: normalized geometry becomes
 * canvas pixels, then everything is clamped with the same rules the editor
 * uses, so a preset can never produce an invalid document.
 */
export function applyPresetToDocument(
  preset: EditorPreset,
  sourceMetadata: VideoMetadata,
): AppliedPreset {
  const sourceSize = getSourceSize(sourceMetadata);
  const baseCanvasSize = getCanvasSize(
    preset.aspectRatio,
    sourceSize,
    preset.cropRect,
  );
  const cropRect = normalizeCropRectToAspect(
    clampCropRect(preset.cropRect),
    sourceSize,
    getCropAspectConstraint(preset.aspectRatio, baseCanvasSize),
  );
  const canvasSize = getCanvasSize(preset.aspectRatio, sourceSize, cropRect);
  const cropSize = getCropSize(sourceSize, cropRect);

  const videoTransform = clampVideoTransform(
    {
      x: preset.videoTransform.xRatio * canvasSize.width,
      y: preset.videoTransform.yRatio * canvasSize.height,
      scale: preset.videoTransform.scale,
    },
    cropSize,
    canvasSize,
  );

  const textLayers = preset.textLayers.map((layer) =>
    clampTextLayerToCanvas(
      {
        id: crypto.randomUUID(),
        text: layer.text,
        x: layer.xRatio * canvasSize.width,
        y: layer.yRatio * canvasSize.height,
        fontSize: Math.min(
          MAX_TEXT_FONT_SIZE,
          Math.max(
            MIN_TEXT_FONT_SIZE,
            Math.round(layer.fontSizeRatio * canvasSize.height),
          ),
        ),
        fontFamily: layer.fontFamily,
        fontWeight: layer.fontWeight,
        color: layer.color,
        textAlign: layer.textAlign,
        hasShadow: layer.hasShadow,
        opacity: clamp01(layer.opacity),
      },
      canvasSize,
    ),
  );

  return {
    aspectRatio: preset.aspectRatio,
    cropRect,
    videoTransform,
    textLayers,
  };
}

function parsePresetTextLayer(value: unknown): PresetTextLayer | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const layer = value as Record<string, unknown>;

  if (
    !isFiniteNumber(layer.xRatio) ||
    !isFiniteNumber(layer.yRatio) ||
    !isFiniteNumber(layer.fontSizeRatio)
  ) {
    return null;
  }

  return {
    text: typeof layer.text === "string" ? layer.text : "",
    xRatio: layer.xRatio,
    yRatio: layer.yRatio,
    fontSizeRatio: layer.fontSizeRatio,
    fontFamily:
      typeof layer.fontFamily === "string" &&
      FONT_FAMILIES.has(layer.fontFamily)
        ? (layer.fontFamily as TextFontFamily)
        : "geist",
    fontWeight:
      typeof layer.fontWeight === "number" && FONT_WEIGHTS.has(layer.fontWeight)
        ? (layer.fontWeight as TextFontWeight)
        : 700,
    color:
      typeof layer.color === "string" && HEX_COLOR_PATTERN.test(layer.color)
        ? layer.color
        : "#FFFFFF",
    textAlign:
      typeof layer.textAlign === "string" &&
      TEXT_ALIGNMENTS.has(layer.textAlign)
        ? (layer.textAlign as TextAlignment)
        : "center",
    hasShadow: typeof layer.hasShadow === "boolean" ? layer.hasShadow : true,
    opacity: isFiniteNumber(layer.opacity) ? clamp01(layer.opacity) : 1,
  };
}

/**
 * Validates one stored preset. Unknown or invalid entries return null so the
 * caller can drop them; missing newer fields fall back to safe defaults.
 */
export function parsePreset(value: unknown): EditorPreset | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const preset = value as Record<string, unknown>;

  if (typeof preset.id !== "string" || preset.id.length === 0) {
    return null;
  }

  if (typeof preset.name !== "string" || preset.name.trim().length === 0) {
    return null;
  }

  if (
    typeof preset.aspectRatio !== "string" ||
    !ASPECT_RATIOS.has(preset.aspectRatio)
  ) {
    return null;
  }

  const cropRect =
    typeof preset.cropRect === "object" && preset.cropRect !== null
      ? (preset.cropRect as Record<string, unknown>)
      : {};

  const transform =
    typeof preset.videoTransform === "object" && preset.videoTransform !== null
      ? (preset.videoTransform as Record<string, unknown>)
      : {};

  const rawLayers = Array.isArray(preset.textLayers) ? preset.textLayers : [];

  return {
    id: preset.id,
    name: preset.name.trim(),
    createdAt:
      typeof preset.createdAt === "string"
        ? preset.createdAt
        : new Date().toISOString(),
    aspectRatio: preset.aspectRatio as AspectRatioPreset,
    cropRect: clampCropRect({
      x: isFiniteNumber(cropRect.x) ? cropRect.x : 0,
      y: isFiniteNumber(cropRect.y) ? cropRect.y : 0,
      width: isFiniteNumber(cropRect.width) ? cropRect.width : 1,
      height: isFiniteNumber(cropRect.height) ? cropRect.height : 1,
    }),
    videoTransform: {
      xRatio: isFiniteNumber(transform.xRatio) ? transform.xRatio : 0,
      yRatio: isFiniteNumber(transform.yRatio) ? transform.yRatio : 0,
      scale: isFiniteNumber(transform.scale)
        ? Math.min(3, Math.max(1, transform.scale))
        : 1,
    },
    textLayers: rawLayers
      .map(parsePresetTextLayer)
      .filter((layer): layer is PresetTextLayer => layer !== null),
  };
}
