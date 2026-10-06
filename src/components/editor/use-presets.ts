"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createPreset, type EditorPreset } from "@/lib/presets";
import {
  getPresetsSnapshot,
  getServerPresetsSnapshot,
  subscribeToPresets,
  updatePresets,
} from "@/lib/preset-storage";
import { selectEditorDocument } from "@/store/editor-selectors";
import { useEditorStore } from "@/store/editor-store";

/**
 * Preset list backed by localStorage through an external store, so the
 * server snapshot is always empty and corrupt or missing storage degrades to
 * an empty list instead of a crash.
 */
export function usePresets() {
  const presets = useSyncExternalStore(
    subscribeToPresets,
    getPresetsSnapshot,
    getServerPresetsSnapshot,
  );

  const saveCurrentAsPreset = useCallback((name: string): EditorPreset => {
    const document = selectEditorDocument(useEditorStore.getState());
    const preset = createPreset(name, document);

    updatePresets((current) => [preset, ...current]);

    return preset;
  }, []);

  const deletePreset = useCallback((id: string) => {
    updatePresets((current) => current.filter((preset) => preset.id !== id));
  }, []);

  return { presets, saveCurrentAsPreset, deletePreset };
}
