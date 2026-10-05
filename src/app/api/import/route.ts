import { validateInstagramUrl } from "@/lib/instagram-url";
import {
  IMPORT_RUNTIME_LIMITS,
  formatBytesLimit,
  formatDurationLimit,
} from "@/lib/server/import-config";
import {
  cleanupStaleImports,
  createImportId,
  createImportWorkspace,
  removeImport,
  writeImportRecord,
} from "@/lib/server/import-storage";
import {
  releaseImportSlot,
  tryAcquireImportSlot,
} from "@/lib/server/import-limiter";
import {
  extractInstagramMedia,
  YtDlpError,
  type YtDlpErrorCode,
} from "@/lib/server/yt-dlp";
import { getToolAvailability } from "@/lib/server/tooling";
import type {
  ImportErrorCode,
  ImportErrorResponse,
  ImportSuccessResponse,
} from "@/types/import";

export const runtime = "nodejs";

class ImportPolicyError extends Error {
  readonly code: ImportErrorCode;
  readonly status: number;

  constructor(code: ImportErrorCode, status: number, message: string) {
    super(message);
    this.name = "ImportPolicyError";
    this.code = code;
    this.status = status;
  }
}

function errorResponse(
  status: number,
  code: ImportErrorCode,
  message: string,
): Response {
  const body: ImportErrorResponse = { error: { code, message } };

  return Response.json(body, { status });
}

function statusForYtDlpError(code: YtDlpErrorCode): number {
  switch (code) {
    case "YTDLP_UNAVAILABLE":
      return 503;
    case "UNSUPPORTED_MEDIA":
      return 422;
    case "TIMEOUT":
      return 504;
    case "EXTRACTION_FAILED":
      return 502;
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      "Send a JSON body with a url field.",
    );
  }

  const url =
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { url?: unknown }).url === "string"
      ? (payload as { url: string }).url
      : "";

  const validation = validateInstagramUrl(url);
  if (!validation.valid) {
    return errorResponse(400, "INVALID_URL", validation.reason);
  }

  const tools = await getToolAvailability();
  if (!tools.ytDlp) {
    return errorResponse(
      503,
      "YTDLP_UNAVAILABLE",
      "yt-dlp is not installed on the server. See the README for setup instructions.",
    );
  }
  if (!tools.ffprobe) {
    return errorResponse(
      503,
      "FFPROBE_UNAVAILABLE",
      "ffprobe is not available on the server. See the README for setup instructions.",
    );
  }

  if (!tryAcquireImportSlot()) {
    return errorResponse(
      429,
      "IMPORT_BUSY",
      "Too many videos are being imported right now. Try again shortly.",
    );
  }

  let importId: string | null = null;

  try {
    const activeImportId = createImportId();
    importId = activeImportId;

    await cleanupStaleImports().catch(() => undefined);

    const workspaceDirectory = await createImportWorkspace(activeImportId);

    const extracted = await extractInstagramMedia(
      validation.normalizedUrl,
      workspaceDirectory,
    );

    if (
      extracted.durationInSeconds >
      IMPORT_RUNTIME_LIMITS.maxVideoDurationSeconds
    ) {
      throw new ImportPolicyError(
        "VIDEO_TOO_LONG",
        422,
        `ClipCrop supports videos up to ${formatDurationLimit(
          IMPORT_RUNTIME_LIMITS.maxVideoDurationSeconds,
        )}.`,
      );
    }

    if (extracted.fileSizeBytes > IMPORT_RUNTIME_LIMITS.maxVideoBytes) {
      throw new ImportPolicyError(
        "VIDEO_TOO_LARGE",
        422,
        `ClipCrop supports videos up to ${formatBytesLimit(
          IMPORT_RUNTIME_LIMITS.maxVideoBytes,
        )}.`,
      );
    }

    await writeImportRecord(activeImportId, {
      sourceUrl: validation.normalizedUrl,
      caption: extracted.description,
      title: extracted.title,
      durationInSeconds: extracted.durationInSeconds,
      width: extracted.width,
      height: extracted.height,
      videoFilename: extracted.videoFilename,
      createdAt: new Date().toISOString(),
    });

    const response: ImportSuccessResponse = {
      importId: activeImportId,
      media: {
        kind: "imported",
        src: `/api/imports/${activeImportId}/video`,
        caption: extracted.description,
        originalUrl: validation.normalizedUrl,
      },
      metadata: {
        durationInSeconds: extracted.durationInSeconds,
        width: extracted.width,
        height: extracted.height,
      },
    };

    return Response.json(response);
  } catch (error) {
    if (importId) {
      await removeImport(importId).catch(() => undefined);
    }

    if (error instanceof ImportPolicyError) {
      return errorResponse(error.status, error.code, error.message);
    }

    if (error instanceof YtDlpError) {
      if (error.diagnostics) {
        console.error(`[import] yt-dlp ${error.code}: ${error.diagnostics}`);
      }

      return errorResponse(
        statusForYtDlpError(error.code),
        error.code,
        error.message,
      );
    }

    console.error("[import] unexpected failure", error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "The import failed unexpectedly. Try again.",
    );
  } finally {
    releaseImportSlot();
  }
}
