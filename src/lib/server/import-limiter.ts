import { IMPORT_RUNTIME_LIMITS } from "./import-config";

let activeImports = 0;

/**
 * Process-level guard: limits how many yt-dlp extractions run at once in this
 * server instance. It is not shared across instances or replicas.
 */
export function tryAcquireImportSlot(): boolean {
  if (activeImports >= IMPORT_RUNTIME_LIMITS.maxConcurrentImports) {
    return false;
  }

  activeImports += 1;
  return true;
}

export function releaseImportSlot(): void {
  activeImports = Math.max(0, activeImports - 1);
}
