import type {
  ImportErrorCode,
  ImportResponse,
  ImportSuccessResponse,
} from "@/types/import";

export class ImportRequestError extends Error {
  readonly code: ImportErrorCode;

  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = "ImportRequestError";
    this.code = code;
  }
}

export async function importInstagramVideo(
  url: string,
): Promise<ImportSuccessResponse> {
  let response: Response;

  try {
    response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new ImportRequestError(
      "INTERNAL_ERROR",
      "Could not reach the server. Check your connection and try again.",
    );
  }

  let data: ImportResponse;
  try {
    data = (await response.json()) as ImportResponse;
  } catch {
    throw new ImportRequestError(
      "INTERNAL_ERROR",
      "The server returned an unexpected response.",
    );
  }

  if ("error" in data) {
    throw new ImportRequestError(data.error.code, data.error.message);
  }

  return data;
}
