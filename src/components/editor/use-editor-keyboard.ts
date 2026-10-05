"use client";

import { useEffect } from "react";
import { isEditableTarget } from "@/lib/keyboard";
import { useEditorStore } from "@/store/editor-store";

const NUDGE_STEP = 1;

const NUDGE_STEP_LARGE = 10;

const NUDGE_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

export function useEditorKeyboard() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target)) {
        return;
      }

      const state = useEditorStore.getState();
      const selectedId = state.selectedTextLayerId;

      if (!selectedId) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        state.selectTextLayer(null);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
          return;
        }

        event.preventDefault();
        state.deleteTextLayer(selectedId);
        return;
      }

      const direction = NUDGE_DIRECTIONS[event.key];
      if (!direction) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const layer = state.textLayers.find(
        (candidate) => candidate.id === selectedId,
      );
      if (!layer) {
        return;
      }

      event.preventDefault();

      const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;

      state.updateTextLayer(selectedId, {
        x: layer.x + direction.x * step,
        y: layer.y + direction.y * step,
      });
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
