import { runProcess } from "./process";

type ProbedVideoMetadata = {
  durationInSeconds: number;
  width: number;
  height: number;
};

const PROBE_TIMEOUT_MS = 10_000;

export async function probeVideoFile(
  filePath: string,
): Promise<ProbedVideoMetadata | null> {
  const args = [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    filePath,
  ];

  let result;
  try {
    result = await runProcess("ffprobe", args, PROBE_TIMEOUT_MS);
  } catch {
    return null;
  }

  if (result.exitCode !== 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(result.stdout) as {
      streams?: Array<{ width?: unknown; height?: unknown }>;
      format?: { duration?: unknown };
    };
    const stream = parsed.streams?.[0];
    const width = toPositiveNumber(stream?.width);
    const height = toPositiveNumber(stream?.height);
    const durationInSeconds = toPositiveNumber(parsed.format?.duration);

    if (width === null || height === null || durationInSeconds === null) {
      return null;
    }

    return { durationInSeconds, width, height };
  } catch {
    return null;
  }
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}
