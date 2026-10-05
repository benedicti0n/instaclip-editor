import { create } from "zustand";
import {
  clampVideoTransform,
  getCanvasSize,
  getSourceSize,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_VIDEO_TRANSFORM,
} from "@/lib/editor";
import { SAMPLE_MEDIA, SAMPLE_VIDEO_METADATA } from "@/lib/sample-video";
import { clampTextLayerToCanvas, createTextLayer } from "@/lib/text-layer";
import type {
  AspectRatioPreset,
  EditorDocument,
  TextLayer,
  VideoMetadata,
  VideoTransform,
} from "@/types/editor";

export type EditorActions = {
  setSourceMetadata: (metadata: VideoMetadata) => void;
  setAspectRatio: (preset: AspectRatioPreset) => void;
  setVideoTransform: (transform: VideoTransform) => void;
  setVideoScale: (scale: number) => void;
  resetVideoTransform: () => void;
  addTextLayer: () => void;
  updateTextLayer: (id: string, patch: Partial<TextLayer>) => void;
  deleteTextLayer: (id: string) => void;
  selectTextLayer: (id: string | null) => void;
  resetEditor: () => void;
};

export type EditorState = EditorDocument & {
  selectedTextLayerId: string | null;
} & EditorActions;

const INITIAL_DOCUMENT: EditorDocument = {
  media: SAMPLE_MEDIA,
  sourceMetadata: SAMPLE_VIDEO_METADATA,
  aspectRatio: DEFAULT_ASPECT_RATIO,
  videoTransform: DEFAULT_VIDEO_TRANSFORM,
  textLayers: [],
};

function getGeometry(document: EditorDocument) {
  const sourceSize = getSourceSize(document.sourceMetadata);

  return {
    sourceSize,
    canvasSize: getCanvasSize(document.aspectRatio, sourceSize),
  };
}

export const useEditorStore = create<EditorState>()((set) => ({
  ...INITIAL_DOCUMENT,
  selectedTextLayerId: null,

  setSourceMetadata: (metadata) =>
    set((state) => {
      const sourceSize = getSourceSize(metadata);
      const canvasSize = getCanvasSize(state.aspectRatio, sourceSize);

      return {
        sourceMetadata: metadata,
        videoTransform: clampVideoTransform(
          state.videoTransform,
          sourceSize,
          canvasSize,
        ),
        textLayers: state.textLayers.map((layer) =>
          clampTextLayerToCanvas(layer, canvasSize),
        ),
      };
    }),

  setAspectRatio: (preset) =>
    set((state) => {
      const { sourceSize } = getGeometry(state);
      const nextCanvasSize = getCanvasSize(preset, sourceSize);

      return {
        aspectRatio: preset,
        videoTransform: clampVideoTransform(
          state.videoTransform,
          sourceSize,
          nextCanvasSize,
        ),
        textLayers: state.textLayers.map((layer) =>
          clampTextLayerToCanvas(layer, nextCanvasSize),
        ),
      };
    }),

  setVideoTransform: (transform) =>
    set((state) => {
      const { sourceSize, canvasSize } = getGeometry(state);

      return {
        videoTransform: clampVideoTransform(transform, sourceSize, canvasSize),
      };
    }),

  setVideoScale: (scale) =>
    set((state) => {
      const { sourceSize, canvasSize } = getGeometry(state);
      const current = clampVideoTransform(
        state.videoTransform,
        sourceSize,
        canvasSize,
      );
      const ratio = current.scale > 0 ? scale / current.scale : 1;

      return {
        videoTransform: clampVideoTransform(
          {
            x: current.x * ratio,
            y: current.y * ratio,
            scale,
          },
          sourceSize,
          canvasSize,
        ),
      };
    }),

  resetVideoTransform: () => set({ videoTransform: DEFAULT_VIDEO_TRANSFORM }),

  addTextLayer: () =>
    set((state) => {
      const layer = createTextLayer(crypto.randomUUID());

      return {
        textLayers: [...state.textLayers, layer],
        selectedTextLayerId: layer.id,
      };
    }),

  updateTextLayer: (id, patch) =>
    set((state) => {
      const { canvasSize } = getGeometry(state);

      return {
        textLayers: state.textLayers.map((layer) =>
          layer.id === id
            ? clampTextLayerToCanvas({ ...layer, ...patch }, canvasSize)
            : layer,
        ),
      };
    }),

  deleteTextLayer: (id) =>
    set((state) => {
      const index = state.textLayers.findIndex((layer) => layer.id === id);
      if (index === -1) {
        return {};
      }

      const remainingLayers = state.textLayers.filter(
        (layer) => layer.id !== id,
      );
      const nextSelectedId =
        state.selectedTextLayerId === id
          ? (remainingLayers[Math.min(index, remainingLayers.length - 1)]?.id ??
            null)
          : state.selectedTextLayerId;

      return {
        textLayers: remainingLayers,
        selectedTextLayerId: nextSelectedId,
      };
    }),

  selectTextLayer: (id) => set({ selectedTextLayerId: id }),

  resetEditor: () => set({ ...INITIAL_DOCUMENT, selectedTextLayerId: null }),
}));
