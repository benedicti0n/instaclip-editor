import { parsePreset, type EditorPreset } from "@/lib/presets";

export const PRESET_STORAGE_KEY = "clipcrop.editor-presets.v1";

const PRESET_STORE_VERSION = 1;

const EMPTY_PRESETS: EditorPreset[] = [];

type PresetStore = {
  version: number;
  presets: EditorPreset[];
};

let cachedPresets: EditorPreset[] | null = null;

const listeners = new Set<() => void>();

/**
 * Reads saved presets. Any malformed, missing, or wrong-version data is
 * treated as an empty list; individual invalid entries are dropped. Never
 * throws, so corrupt localStorage cannot crash the editor.
 */
export function loadPresets(): EditorPreset[] {
  if (typeof window === "undefined") {
    return EMPTY_PRESETS;
  }

  try {
    const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) {
      return EMPTY_PRESETS;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return EMPTY_PRESETS;
    }

    const store = parsed as Partial<PresetStore>;
    if (
      store.version !== PRESET_STORE_VERSION ||
      !Array.isArray(store.presets)
    ) {
      return EMPTY_PRESETS;
    }

    const valid = store.presets
      .map(parsePreset)
      .filter((preset): preset is EditorPreset => preset !== null);

    return valid.length > 0 ? valid : EMPTY_PRESETS;
  } catch {
    return EMPTY_PRESETS;
  }
}

/**
 * Writes the versioned preset store. Returns false when storage is
 * unavailable or full; the editor keeps working with in-memory presets.
 */
export function savePresets(presets: EditorPreset[]): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const store: PresetStore = { version: PRESET_STORE_VERSION, presets };
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

/**
 * External-store interface for `useSyncExternalStore`: the preset list is
 * read lazily from localStorage, cached, and updated through `updatePresets`.
 */
export function getPresetsSnapshot(): EditorPreset[] {
  if (cachedPresets === null) {
    cachedPresets = loadPresets();
  }

  return cachedPresets;
}

export function getServerPresetsSnapshot(): EditorPreset[] {
  return EMPTY_PRESETS;
}

export function subscribeToPresets(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function updatePresets(
  updater: (current: EditorPreset[]) => EditorPreset[],
): EditorPreset[] {
  const next = updater(getPresetsSnapshot());
  cachedPresets = next;
  savePresets(next);

  for (const listener of listeners) {
    listener();
  }

  return next;
}
