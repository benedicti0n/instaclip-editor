import type { VideoMetadata } from "@/types/editor";

export function getVideoMetadata(src: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.addEventListener(
      "loadedmetadata",
      () => {
        const metadata: VideoMetadata = {
          durationInSeconds: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        };
        cleanup();

        if (
          Number.isFinite(metadata.durationInSeconds) &&
          metadata.durationInSeconds > 0 &&
          metadata.width > 0 &&
          metadata.height > 0
        ) {
          resolve(metadata);
        } else {
          reject(new Error(`Invalid metadata reported for ${src}`));
        }
      },
      { once: true },
    );

    video.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error(`Could not load metadata for ${src}`));
      },
      { once: true },
    );

    video.src = src;
  });
}
