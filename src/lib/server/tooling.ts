import { runProcess } from "./process";
import { getYtDlpVersion } from "./yt-dlp";

type ToolAvailability = {
  ytDlp: boolean;
  ffprobe: boolean;
};

const TOOL_CHECK_TIMEOUT_MS = 5_000;

let cachedAvailability: ToolAvailability | null = null;

async function checkFfprobe(): Promise<boolean> {
  try {
    const result = await runProcess(
      "ffprobe",
      ["-version"],
      TOOL_CHECK_TIMEOUT_MS,
    );
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Checks the media tools once per server process. Installing a missing tool
 * requires a server restart before it is detected.
 */
export async function getToolAvailability(): Promise<ToolAvailability> {
  if (cachedAvailability) {
    return cachedAvailability;
  }

  const [ytDlpVersion, ffprobe] = await Promise.all([
    getYtDlpVersion(),
    checkFfprobe(),
  ]);

  cachedAvailability = { ytDlp: ytDlpVersion !== null, ffprobe };

  return cachedAvailability;
}
