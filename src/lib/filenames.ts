import type { MediaSource } from "@/types/editor";

const SOURCE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const FALLBACK_FILENAMES: DownloadFilenames = {
  video: "clipcrop-video.mp4",
  caption: "clipcrop-caption.txt",
  zip: "clipcrop-export.zip",
};

export type DownloadFilenames = {
  video: string;
  caption: string;
  zip: string;
};

function getSafeSourceId(media: MediaSource): string | null {
  const sourceId = media.sourceId?.trim();

  if (!sourceId || !SOURCE_ID_PATTERN.test(sourceId)) {
    return null;
  }

  return sourceId;
}

/**
 * Download filenames derived from the media's canonical source identifier.
 * The identifier is sanitized to the Instagram shortcode character set, so it
 * can never contain path separators or traversal sequences; when it is missing
 * or invalid, stable `clipcrop-*` fallbacks are used instead.
 */
export function getDownloadFilenames(media: MediaSource): DownloadFilenames {
  const sourceId = getSafeSourceId(media);

  if (!sourceId) {
    return FALLBACK_FILENAMES;
  }

  return {
    video: `${sourceId}.mp4`,
    caption: `${sourceId}.txt`,
    zip: `${sourceId}.zip`,
  };
}
