import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { resolveImportedVideoPath } from "@/lib/server/import-storage";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

type RangeParseResult =
  | { kind: "none" }
  | { kind: "range"; start: number; end: number }
  | { kind: "unsatisfiable" };

function parseRangeHeader(
  rangeHeader: string | null,
  size: number,
): RangeParseResult {
  if (!rangeHeader) {
    return { kind: "none" };
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    return { kind: "none" };
  }

  const [, startText, endText] = match;
  if (startText === "" && endText === "") {
    return { kind: "none" };
  }

  let start: number;
  let end: number;

  if (startText === "") {
    const suffixLength = Number(endText);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return { kind: "unsatisfiable" };
    }

    start = size - suffixLength;
    end = size - 1;
  } else {
    start = Number(startText);
    end = endText === "" ? size - 1 : Number(endText);
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start > end ||
    start >= size
  ) {
    return { kind: "unsatisfiable" };
  }

  return {
    kind: "range",
    start: Math.max(0, start),
    end: Math.min(end, size - 1),
  };
}

function toWebStream(filePath: string, start?: number, end?: number) {
  const stream =
    start === undefined
      ? createReadStream(filePath)
      : createReadStream(filePath, { start, end });

  return Readable.toWeb(stream) as ReadableStream;
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/imports/[id]/video">,
) {
  const { id } = await context.params;
  const resolved = await resolveImportedVideoPath(id);

  if (!resolved) {
    return new Response("Not found", { status: 404 });
  }

  const fileStat = await stat(resolved.filePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return new Response("Not found", { status: 404 });
  }

  const size = fileStat.size;
  const extension = path.extname(resolved.filePath).slice(1).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
  const range = parseRangeHeader(request.headers.get("range"), size);

  if (range.kind === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  if (range.kind === "range") {
    return new Response(
      toWebStream(resolved.filePath, range.start, range.end),
      {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(range.end - range.start + 1),
          "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return new Response(toWebStream(resolved.filePath), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}
