export function getVideoDurationInSeconds(src: string): Promise<number> {
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
        const duration = video.duration;
        cleanup();

        if (Number.isFinite(duration) && duration > 0) {
          resolve(duration);
        } else {
          reject(new Error(`Invalid duration reported for ${src}`));
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
