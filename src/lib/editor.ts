import type {
  AspectRatioPreset,
  CropRect,
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

export const DEFAULT_CROP_RECT: CropRect = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
};

/**
 * Smallest allowed crop dimension, as a fraction of the source dimension.
 * 5% keeps handles usable while still allowing tight crops of large sources.
 */
export const MIN_CROP_FRACTION = 0.05;

export type CropHandle =
  "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

export function isDefaultCropRect(rect: CropRect): boolean {
  return (
    rect.x === DEFAULT_CROP_RECT.x &&
    rect.y === DEFAULT_CROP_RECT.y &&
    rect.width === DEFAULT_CROP_RECT.width &&
    rect.height === DEFAULT_CROP_RECT.height
  );
}

/**
 * Forces a crop rect back into the valid domain: finite numbers only, values
 * within 0..1, at least `MIN_CROP_FRACTION` per dimension, and fully inside
 * the source bounds. Never inverts and never returns a zero-sized rect.
 */
export function clampCropRect(rect: CropRect): CropRect {
  const toFinite = (value: number, fallback: number) =>
    Number.isFinite(value) ? value : fallback;

  const width = Math.min(
    1,
    Math.max(MIN_CROP_FRACTION, toFinite(rect.width, DEFAULT_CROP_RECT.width)),
  );
  const height = Math.min(
    1,
    Math.max(
      MIN_CROP_FRACTION,
      toFinite(rect.height, DEFAULT_CROP_RECT.height),
    ),
  );
  const x = Math.min(
    Math.max(toFinite(rect.x, DEFAULT_CROP_RECT.x), 0),
    1 - width,
  );
  const y = Math.min(
    Math.max(toFinite(rect.y, DEFAULT_CROP_RECT.y), 0),
    1 - height,
  );

  return { x, y, width, height };
}

/**
 * Applies a drag delta (in normalized source units) to a crop rect. The
 * `handle` names which edges move; `"move"` translates the whole rect. The
 * result always satisfies the crop-rect invariants.
 *
 * When `constraint` is given, the crop keeps the output aspect ratio (in
 * source pixels), so the selected region maps exactly onto the output canvas.
 * Without it (free aspect), the rect resizes freely.
 */
export function resizeCropRect(
  rect: CropRect,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
  constraint?: CropResizeConstraint,
): CropRect {
  if (handle === "move") {
    const x = Math.min(Math.max(rect.x + deltaX, 0), 1 - rect.width);
    const y = Math.min(Math.max(rect.y + deltaY, 0), 1 - rect.height);

    return { x, y, width: rect.width, height: rect.height };
  }

  if (constraint) {
    return resizeCropRectConstrained(rect, handle, deltaX, deltaY, constraint);
  }

  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  if (handle.includes("w")) {
    left = Math.min(Math.max(left + deltaX, 0), right - MIN_CROP_FRACTION);
  }
  if (handle.includes("e")) {
    right = Math.max(Math.min(right + deltaX, 1), left + MIN_CROP_FRACTION);
  }
  if (handle.includes("n")) {
    top = Math.min(Math.max(top + deltaY, 0), bottom - MIN_CROP_FRACTION);
  }
  if (handle.includes("s")) {
    bottom = Math.max(Math.min(bottom + deltaY, 1), top + MIN_CROP_FRACTION);
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}

export type CropResizeConstraint = {
  sourceSize: VideoSize;
  /** Output aspect ratio (width / height) the crop region must keep. */
  aspectRatio: number;
};

function resizeCropRectConstrained(
  rect: CropRect,
  handle: Exclude<CropHandle, "move">,
  deltaX: number,
  deltaY: number,
  { sourceSize, aspectRatio }: CropResizeConstraint,
): CropRect {
  const ratio = (aspectRatio * sourceSize.height) / sourceSize.width;

  const fromRight = handle.includes("e");
  const fromBottom = handle.includes("s");
  const horizontal = handle.includes("e") || handle.includes("w");
  const vertical = handle.includes("n") || handle.includes("s");

  const anchorX = fromRight ? rect.x : rect.x + rect.width;
  const anchorY = fromBottom ? rect.y : rect.y + rect.height;

  let width: number;
  let height: number;

  if (horizontal && !vertical) {
    width = rect.width + (fromRight ? deltaX : -deltaX);
    height = width / ratio;
    const centerY = rect.y + rect.height / 2;
    const maxHeight = 2 * Math.min(centerY, 1 - centerY);
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
  } else if (vertical && !horizontal) {
    height = rect.height + (fromBottom ? deltaY : -deltaY);
    width = height * ratio;
    const centerX = rect.x + rect.width / 2;
    const maxWidth = 2 * Math.min(centerX, 1 - centerX);
    if (width > maxWidth) {
      width = maxWidth;
      height = width / ratio;
    }
  } else {
    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      width = rect.width + (fromRight ? deltaX : -deltaX);
      height = width / ratio;
    } else {
      height = rect.height + (fromBottom ? deltaY : -deltaY);
      width = height * ratio;
    }

    const maxWidth = fromRight ? 1 - anchorX : anchorX;
    const maxHeight = fromBottom ? 1 - anchorY : anchorY;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / ratio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
  }

  if (width < MIN_CROP_FRACTION) {
    width = MIN_CROP_FRACTION;
    height = width / ratio;
  }
  if (height < MIN_CROP_FRACTION) {
    height = MIN_CROP_FRACTION;
    width = height * ratio;
  }

  width = Math.min(width, 1);
  height = Math.min(height, 1);

  let x: number;
  let y: number;

  if (horizontal && !vertical) {
    const centerY = rect.y + rect.height / 2;
    x = fromRight ? anchorX : anchorX - width;
    y = centerY - height / 2;
  } else if (vertical && !horizontal) {
    const centerX = rect.x + rect.width / 2;
    y = fromBottom ? anchorY : anchorY - height;
    x = centerX - width / 2;
  } else {
    x = fromRight ? anchorX : anchorX - width;
    y = fromBottom ? anchorY : anchorY - height;
  }

  x = Math.min(Math.max(x, 0), Math.max(0, 1 - width));
  y = Math.min(Math.max(y, 0), Math.max(0, 1 - height));

  return { x, y, width, height };
}

/**
 * The output aspect ratio the crop must keep for a given preset, or `null`
 * when the preset is free and the crop defines the shape instead.
 */
export function getCropAspectConstraint(
  preset: AspectRatioPreset,
  canvasSize: VideoSize,
): number | null {
  return preset === "free" ? null : canvasSize.width / canvasSize.height;
}

/**
 * The largest rect of the given aspect contained in `rect`, centered on its
 * center. Used when the output aspect ratio changes so the existing selection
 * is preserved as much as possible. `null` aspect clamps the rect unchanged.
 */
export function fitCropRectToAspect(
  rect: CropRect,
  sourceSize: VideoSize,
  aspectRatio: number | null,
): CropRect {
  if (aspectRatio === null) {
    return clampCropRect(rect);
  }

  const ratio = (aspectRatio * sourceSize.height) / sourceSize.width;
  let width = rect.width;
  let height = width / ratio;

  if (height > rect.height) {
    height = rect.height;
    width = height * ratio;
  }
  if (width < MIN_CROP_FRACTION) {
    width = MIN_CROP_FRACTION;
    height = width / ratio;
  }
  if (height < MIN_CROP_FRACTION) {
    height = MIN_CROP_FRACTION;
    width = height * ratio;
  }

  width = Math.min(width, 1);
  height = Math.min(height, 1);

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return {
    x: Math.min(Math.max(centerX - width / 2, 0), 1 - width),
    y: Math.min(Math.max(centerY - height / 2, 0), 1 - height),
    width,
    height,
  };
}

/**
 * Forces a rect to satisfy the given aspect ratio while preserving its center
 * and (where possible) its width. Idempotent for rects already produced by
 * `resizeCropRect` with the same constraint; used as a store-level guarantee.
 * `null` aspect just clamps the rect.
 */
export function normalizeCropRectToAspect(
  rect: CropRect,
  sourceSize: VideoSize,
  aspectRatio: number | null,
): CropRect {
  if (aspectRatio === null) {
    return clampCropRect(rect);
  }

  const ratio = (aspectRatio * sourceSize.height) / sourceSize.width;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  let width = Math.max(MIN_CROP_FRACTION, Math.min(rect.width, 1));
  let height = width / ratio;

  if (height > 1) {
    height = 1;
    width = height * ratio;
  }
  if (height < MIN_CROP_FRACTION) {
    height = MIN_CROP_FRACTION;
    width = height * ratio;
  }

  width = Math.min(width, 1);
  height = Math.min(height, 1);

  return {
    x: Math.min(Math.max(centerX - width / 2, 0), 1 - width),
    y: Math.min(Math.max(centerY - height / 2, 0), 1 - height),
    width,
    height,
  };
}

export function getSourceSize(metadata: VideoMetadata): VideoSize {
  return { width: metadata.width, height: metadata.height };
}

/**
 * The cropped region of the source, in source pixels. This is the effective
 * source for all framing math: cover fit, pan bounds, and video layout.
 */
export function getCropSize(
  sourceSize: VideoSize,
  cropRect: CropRect,
): VideoSize {
  return {
    width: sourceSize.width * cropRect.width,
    height: sourceSize.height * cropRect.height,
  };
}

export function getDurationInFrames(
  metadata: VideoMetadata,
  fps: number,
): number {
  return Math.max(1, Math.round(metadata.durationInSeconds * fps));
}

/**
 * Whether the document contains edits worth protecting: a changed aspect
 * ratio, a cropped source, a moved/zoomed video, or any text layer. Importing
 * a different media source is a document lifecycle change, not an edit, and
 * selection/playback are runtime state, so neither counts here.
 */
export function isEditorDocumentDirty(document: EditorDocument): boolean {
  return (
    document.aspectRatio !== DEFAULT_ASPECT_RATIO ||
    !isDefaultCropRect(document.cropRect) ||
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
  { value: "free", label: "Free" },
];

/**
 * Encoders require even dimensions; rounds a computed canvas edge to the
 * nearest even number of at least 2 pixels.
 */
function toEvenDimension(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

export function getCanvasSize(
  preset: AspectRatioPreset,
  sourceSize: VideoSize,
  cropRect: CropRect,
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
    case "free": {
      const crop = clampCropRect(cropRect);

      return {
        width: toEvenDimension(sourceSize.width * crop.width),
        height: toEvenDimension(sourceSize.height * crop.height),
      };
    }
  }
}

function getCoverScale(sourceSize: VideoSize, canvasSize: VideoSize): number {
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

function getPanBounds(
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

/**
 * Position and size of the full video element inside the output canvas, for a
 * given crop rect and transform. The video is centered at the canvas center
 * plus (`offsetX`, `offsetY`).
 *
 * Semantics: the cropped region is cover-fitted into the canvas, then the
 * transform pans/zooms that fitted result. `transform.x`/`y` are the offset of
 * the cropped region's center from the canvas center, in canvas pixels, and
 * `transform.scale` multiplies the cover-fit baseline. At the default crop
 * rect the layout reduces exactly to the pre-crop behavior.
 */
export type ClipVideoLayout = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

export function getClipVideoLayout(
  sourceSize: VideoSize,
  canvasSize: VideoSize,
  cropRect: CropRect,
  transform: VideoTransform,
): ClipVideoLayout {
  const crop = clampCropRect(cropRect);
  const cropSize = getCropSize(sourceSize, crop);
  const renderedCropSize = getRenderedVideoSize(
    cropSize,
    canvasSize,
    transform.scale,
  );

  const renderedScale = renderedCropSize.width / cropSize.width;
  const cropCenterX = (crop.x + crop.width / 2) * sourceSize.width;
  const cropCenterY = (crop.y + crop.height / 2) * sourceSize.height;

  return {
    width: sourceSize.width * renderedScale,
    height: sourceSize.height * renderedScale,
    offsetX: transform.x - (cropCenterX - sourceSize.width / 2) * renderedScale,
    offsetY:
      transform.y - (cropCenterY - sourceSize.height / 2) * renderedScale,
  };
}

/**
 * Clamps a transform against the effective (cropped) source size so panning
 * can never expose an empty edge inside the crop region.
 */
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
