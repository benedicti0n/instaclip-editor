export type AspectRatioPreset = "original" | "9:16" | "4:5" | "1:1" | "16:9";

/**
 * Video framing relative to the output canvas.
 *
 * `x` and `y` are offsets of the video's center from the canvas center, in
 * composition pixels (the same units as the canvas, e.g. a 1080x1920 canvas
 * uses 1080-pixel units). They are independent of the preview's rendered size,
 * so the same state can be used for the on-screen Player and a future export.
 *
 * `scale` is a multiplier on top of the cover-fit baseline: `1` renders the
 * source large enough to exactly cover the canvas, larger values zoom in.
 */
export type VideoTransform = {
  x: number;
  y: number;
  scale: number;
};

export type VideoSize = {
  width: number;
  height: number;
};

/**
 * A rectangular region of the source video, in normalized source coordinates.
 *
 * All values are fractions of the source dimensions: `x`/`y` are the top-left
 * corner and `width`/`height` the size, each in the range 0..1. The crop rect
 * is independent of the output canvas and of the preview size, so it survives
 * aspect-ratio changes and can be stored in presets.
 *
 * Invariants (enforced by `clampCropRect`): 0 <= x, 0 <= y, x + width <= 1,
 * y + height <= 1, and width/height are at least `MIN_CROP_FRACTION`.
 */
export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VideoMetadata = {
  durationInSeconds: number;
  width: number;
  height: number;
};

/**
 * The media currently loaded into the editor. `kind` distinguishes the
 * development fixture from media a user actually imported, so production can
 * refuse to edit the synthetic sample.
 */
type MediaSourceKind = "sample" | "imported";

export type MediaSource = {
  kind: MediaSourceKind;
  src: string;
  caption: string;
  originalUrl?: string;
  /**
   * Canonical source identifier: the Instagram shortcode for imported media
   * (e.g. `DbhOdVpKygF`), or a fixed identifier for the development sample.
   * Used for user-facing download filenames; never trusted as a path.
   */
  sourceId?: string;
};

/**
 * The renderable editor document: everything needed to reproduce the visual
 * composition. Editor UI state such as selection is intentionally not part of
 * this model.
 */
export type EditorDocument = {
  media: MediaSource;
  sourceMetadata: VideoMetadata;
  aspectRatio: AspectRatioPreset;
  cropRect: CropRect;
  videoTransform: VideoTransform;
  textLayers: TextLayer[];
};

export type TextAlignment = "left" | "center" | "right";

export type TextFontFamily = "geist" | "arial" | "georgia" | "courier";

export type TextFontWeight = 400 | 600 | 700;

/**
 * A text overlay layer.
 *
 * `x` and `y` are offsets of the layer's center from the canvas center, in
 * composition pixels (the same coordinate system as `VideoTransform`), so
 * layers survive responsive preview scaling and aspect-ratio changes.
 * `fontSize` is also expressed in composition pixels. `opacity` is 0..1 and
 * applies to the whole layer, including its shadow.
 */
export type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: TextFontFamily;
  fontWeight: TextFontWeight;
  color: string;
  textAlign: TextAlignment;
  hasShadow: boolean;
  opacity: number;
};
