import type { MediaSource, VideoMetadata } from "@/types/editor";

export type ImportErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_URL"
  | "YTDLP_UNAVAILABLE"
  | "FFPROBE_UNAVAILABLE"
  | "UNSUPPORTED_MEDIA"
  | "EXTRACTION_FAILED"
  | "TIMEOUT"
  | "VIDEO_TOO_LONG"
  | "VIDEO_TOO_LARGE"
  | "INTERNAL_ERROR";

export type ImportSuccessResponse = {
  importId: string;
  media: MediaSource;
  metadata: VideoMetadata;
};

export type ImportErrorResponse = {
  error: {
    code: ImportErrorCode;
    message: string;
  };
};

export type ImportResponse = ImportSuccessResponse | ImportErrorResponse;
