import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { probeVideoFile } from "./media-probe";
import { runProcess } from "./process";

type ExtractedMedia = {
  title: string | null;
  description: string;
  durationInSeconds: number;
  width: number;
  height: number;
  videoFilename: string;
  fileSizeBytes: number;
};

export type YtDlpErrorCode =
  "YTDLP_UNAVAILABLE" | "EXTRACTION_FAILED" | "UNSUPPORTED_MEDIA" | "TIMEOUT";

export class YtDlpError extends Error {
  readonly code: YtDlpErrorCode;
  readonly diagnostics: string | null;

  constructor(
    code: YtDlpErrorCode,
    message: string,
    diagnostics: string | null = null,
  ) {
    super(message);
    this.name = "YtDlpError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

const VERSION_TIMEOUT_MS = 5_000;

const EXTRACTION_TIMEOUT_MS = 120_000;

const FORMAT_SELECTOR =
  "bv*[vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]/bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b";

const ALLOWED_MEDIA_EXTENSIONS = new Set(["mp4", "m4v", "mov", "webm"]);

const UNSUPPORTED_HINTS = [
  "login required",
  "private",
  "not available",
  "no video",
  "unsupported url",
  "requested format",
  "empty media response",
];

type ExtractorEntry = Record<string, unknown>;

export async function getYtDlpVersion(): Promise<string | null> {
  try {
    const result = await runProcess(
      "yt-dlp",
      ["--version"],
      VERSION_TIMEOUT_MS,
    );

    if (result.exitCode !== 0) {
      return null;
    }

    const version = result.stdout.trim();
    return version.length > 0 ? version : null;
  } catch {
    return null;
  }
}

export async function extractInstagramMedia(
  url: string,
  workspaceDirectory: string,
): Promise<ExtractedMedia> {
  const outputTemplate = path.join(workspaceDirectory, "video.%(ext)s");
  const args = [
    "--no-playlist",
    "--no-progress",
    "--no-warnings",
    "--restrict-filenames",
    "--write-info-json",
    "--merge-output-format",
    "mp4",
    "--format",
    FORMAT_SELECTOR,
    "--socket-timeout",
    "30",
    "--output",
    outputTemplate,
    url,
  ];

  let result;
  try {
    result = await runProcess("yt-dlp", args, EXTRACTION_TIMEOUT_MS);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new YtDlpError(
        "YTDLP_UNAVAILABLE",
        "yt-dlp is not installed on the server.",
      );
    }

    throw new YtDlpError(
      "EXTRACTION_FAILED",
      "yt-dlp could not be started on the server.",
    );
  }

  if (result.timedOut) {
    throw new YtDlpError(
      "TIMEOUT",
      "The import timed out while downloading this video.",
      tail(result.stderr),
    );
  }

  if (result.exitCode !== 0) {
    throw classifyFailure(result.stderr);
  }

  const info = await readExtractorInfo(workspaceDirectory);
  const entry = getPrimaryEntry(info);

  if (!entry) {
    throw new YtDlpError(
      "UNSUPPORTED_MEDIA",
      "This post does not contain a downloadable video.",
    );
  }

  const videoFilename = await findDownloadedVideo(workspaceDirectory);
  const videoPath = path.join(workspaceDirectory, videoFilename);
  const probe = await probeVideoFile(videoPath);
  const fileStats = await stat(videoPath);

  const durationInSeconds =
    probe?.durationInSeconds ?? toPositiveNumber(entry.duration);
  const width = probe?.width ?? toPositiveNumber(entry.width);
  const height = probe?.height ?? toPositiveNumber(entry.height);

  if (durationInSeconds === null || width === null || height === null) {
    throw new YtDlpError(
      "UNSUPPORTED_MEDIA",
      "Could not determine the video dimensions for this post.",
    );
  }

  return {
    title:
      typeof entry.title === "string" && entry.title.length > 0
        ? entry.title
        : null,
    description: typeof entry.description === "string" ? entry.description : "",
    durationInSeconds,
    width,
    height,
    videoFilename,
    fileSizeBytes: fileStats.size,
  };
}

async function readExtractorInfo(
  workspaceDirectory: string,
): Promise<ExtractorEntry> {
  try {
    const raw = await readFile(
      path.join(workspaceDirectory, "video.info.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as unknown;

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid info JSON");
    }

    return parsed as ExtractorEntry;
  } catch {
    throw new YtDlpError(
      "EXTRACTION_FAILED",
      "The extractor did not return usable metadata.",
    );
  }
}

function getPrimaryEntry(info: ExtractorEntry): ExtractorEntry | null {
  if (info._type === "playlist" && Array.isArray(info.entries)) {
    const first = info.entries[0];
    return typeof first === "object" && first !== null
      ? (first as ExtractorEntry)
      : null;
  }

  return info;
}

async function findDownloadedVideo(
  workspaceDirectory: string,
): Promise<string> {
  const files = await readdir(workspaceDirectory);
  const mediaFile = files.find((file) => {
    if (!file.startsWith("video.")) {
      return false;
    }

    return !(
      file.endsWith(".info.json") ||
      file.endsWith(".part") ||
      file.endsWith(".ytdl") ||
      file.endsWith(".temp")
    );
  });

  if (!mediaFile) {
    throw new YtDlpError(
      "EXTRACTION_FAILED",
      "The download did not produce a media file.",
    );
  }

  const extension = path.extname(mediaFile).slice(1).toLowerCase();
  if (!ALLOWED_MEDIA_EXTENSIONS.has(extension)) {
    throw new YtDlpError(
      "UNSUPPORTED_MEDIA",
      "This post does not contain a supported video.",
    );
  }

  return mediaFile;
}

function classifyFailure(stderr: string): YtDlpError {
  const normalized = stderr.toLowerCase();

  if (UNSUPPORTED_HINTS.some((hint) => normalized.includes(hint))) {
    return new YtDlpError(
      "UNSUPPORTED_MEDIA",
      "This post is private, unavailable, or does not contain a supported video.",
      tail(stderr),
    );
  }

  return new YtDlpError(
    "EXTRACTION_FAILED",
    "The video could not be extracted from this URL.",
    tail(stderr),
  );
}

function tail(value: string, maxLength = 500): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(-maxLength) : null;
}

function toPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}
