import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { IMPORT_RUNTIME_LIMITS } from "./import-config";

const IMPORT_ROOT = path.join(process.cwd(), ".tmp", "imports");

const IMPORT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const SAFE_FILENAME_PATTERN = /^[A-Za-z0-9._-]+$/;

type ImportRecord = {
  sourceUrl: string;
  caption: string;
  title: string | null;
  durationInSeconds: number;
  width: number;
  height: number;
  videoFilename: string;
  createdAt: string;
};

export function createImportId(): string {
  return randomUUID();
}

function isValidImportId(id: string): boolean {
  return IMPORT_ID_PATTERN.test(id);
}

function getImportDirectory(id: string): string | null {
  if (!isValidImportId(id)) {
    return null;
  }

  return path.join(IMPORT_ROOT, id);
}

export async function createImportWorkspace(id: string): Promise<string> {
  const directory = getImportDirectory(id);
  if (!directory) {
    throw new Error("Invalid import id");
  }

  await mkdir(directory, { recursive: true });
  return directory;
}

export async function writeImportRecord(
  id: string,
  record: ImportRecord,
): Promise<void> {
  const directory = getImportDirectory(id);
  if (!directory) {
    throw new Error("Invalid import id");
  }

  await writeFile(
    path.join(directory, "metadata.json"),
    JSON.stringify(record, null, 2),
    "utf8",
  );
}

async function readImportRecord(id: string): Promise<ImportRecord | null> {
  const directory = getImportDirectory(id);
  if (!directory) {
    return null;
  }

  try {
    const raw = await readFile(path.join(directory, "metadata.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<ImportRecord>;

    if (
      typeof parsed.videoFilename !== "string" ||
      !SAFE_FILENAME_PATTERN.test(parsed.videoFilename) ||
      parsed.videoFilename.includes("..")
    ) {
      return null;
    }

    return parsed as ImportRecord;
  } catch {
    return null;
  }
}

export async function resolveImportedVideoPath(
  id: string,
): Promise<{ filePath: string; record: ImportRecord } | null> {
  const directory = getImportDirectory(id);
  if (!directory) {
    return null;
  }

  const record = await readImportRecord(id);
  if (!record) {
    return null;
  }

  const resolvedDirectory = path.resolve(directory);
  const filePath = path.resolve(resolvedDirectory, record.videoFilename);

  if (!filePath.startsWith(`${resolvedDirectory}${path.sep}`)) {
    return null;
  }

  return { filePath, record };
}

export async function removeImport(id: string): Promise<void> {
  const directory = getImportDirectory(id);
  if (!directory) {
    return;
  }

  await rm(directory, { recursive: true, force: true });
}

export async function cleanupStaleImports(
  maxAgeMs: number = IMPORT_RUNTIME_LIMITS.importTtlMs,
): Promise<number> {
  let entries;
  try {
    entries = await readdir(IMPORT_ROOT, { withFileTypes: true });
  } catch {
    return 0;
  }

  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() || !isValidImportId(entry.name)) {
      continue;
    }

    const directory = path.join(IMPORT_ROOT, entry.name);

    try {
      const info = await stat(directory);
      if (info.mtimeMs < cutoff) {
        await rm(directory, { recursive: true, force: true });
        removed += 1;
      }
    } catch {
      // Ignore individual failures so cleanup never blocks new imports.
    }
  }

  return removed;
}
