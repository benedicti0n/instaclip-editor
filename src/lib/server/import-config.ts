export type ImportRuntimeLimits = {
  maxVideoDurationSeconds: number;
  maxVideoBytes: number;
  maxConcurrentImports: number;
  importTtlMs: number;
};

const DEFAULT_MAX_VIDEO_DURATION_SECONDS = 300;

const DEFAULT_MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const DEFAULT_MAX_CONCURRENT_IMPORTS = 2;

const DEFAULT_IMPORT_TTL_HOURS = 6;

function readPositiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `[config] Ignoring invalid ${name}="${raw}"; using default ${fallback}.`,
    );
    return fallback;
  }

  return parsed;
}

export const IMPORT_RUNTIME_LIMITS: ImportRuntimeLimits = {
  maxVideoDurationSeconds: readPositiveNumber(
    "CLIPCROP_MAX_VIDEO_DURATION_SECONDS",
    DEFAULT_MAX_VIDEO_DURATION_SECONDS,
  ),
  maxVideoBytes: readPositiveNumber(
    "CLIPCROP_MAX_VIDEO_BYTES",
    DEFAULT_MAX_VIDEO_BYTES,
  ),
  maxConcurrentImports: Math.max(
    1,
    Math.floor(
      readPositiveNumber(
        "CLIPCROP_MAX_CONCURRENT_IMPORTS",
        DEFAULT_MAX_CONCURRENT_IMPORTS,
      ),
    ),
  ),
  importTtlMs:
    readPositiveNumber("CLIPCROP_IMPORT_TTL_HOURS", DEFAULT_IMPORT_TTL_HOURS) *
    60 *
    60 *
    1000,
};

export function formatDurationLimit(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return `${seconds} seconds`;
}

export function formatBytesLimit(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);

  if (megabytes >= 10) {
    return `${Math.round(megabytes)} MB`;
  }

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
