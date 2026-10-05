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
