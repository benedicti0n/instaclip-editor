import type { MediaSource, VideoMetadata } from "@/types/editor";

export const SAMPLE_VIDEO_SRC = "/sample-video.mp4";

export const SAMPLE_VIDEO_WIDTH = 1080;

export const SAMPLE_VIDEO_HEIGHT = 1920;

export const SAMPLE_VIDEO_DURATION_IN_SECONDS = 8;

export const SAMPLE_MEDIA: MediaSource = {
  kind: "sample",
  src: SAMPLE_VIDEO_SRC,
  caption: "",
};

export const SAMPLE_VIDEO_METADATA: VideoMetadata = {
  durationInSeconds: SAMPLE_VIDEO_DURATION_IN_SECONDS,
  width: SAMPLE_VIDEO_WIDTH,
  height: SAMPLE_VIDEO_HEIGHT,
};
