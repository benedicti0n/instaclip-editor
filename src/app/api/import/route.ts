import { validateInstagramUrl } from "@/lib/instagram-url";
import {
  cleanupStaleImports,
  createImportId,
  createImportWorkspace,
  removeImport,
  writeImportRecord,
} from "@/lib/server/import-storage";
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

  const importId = createImportId();

  await cleanupStaleImports().catch(() => undefined);

  const workspaceDirectory = await createImportWorkspace(importId);

  try {
    const extracted = await extractInstagramMedia(
      validation.normalizedUrl,
      workspaceDirectory,
    );

    await writeImportRecord(importId, {
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
      importId,
      media: {
        kind: "imported",
        src: `/api/imports/${importId}/video`,
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
    await removeImport(importId).catch(() => undefined);

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
  }
}
