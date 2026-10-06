import { create } from "zustand";
import {
  clampCropRect,
  clampVideoTransform,
  getCanvasSize,
  getCropSize,
  getSourceSize,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_CROP_RECT,
  DEFAULT_VIDEO_TRANSFORM,
} from "@/lib/editor";
import { getVideoMetadata } from "@/lib/media";
import { applyPresetToDocument, type EditorPreset } from "@/lib/presets";
import { SAMPLE_MEDIA, SAMPLE_VIDEO_METADATA } from "@/lib/sample-video";
import { clampTextLayerToCanvas, createTextLayer } from "@/lib/text-layer";
import type {
  AspectRatioPreset,
  CropRect,
  EditorDocument,
  MediaSource,
  TextLayer,
  VideoMetadata,
  VideoTransform,
} from "@/types/editor";

type EditorActions = {
  setMedia: (media: MediaSource, metadata: VideoMetadata) => void;
  loadSourceMetadata: () => Promise<void>;
  setSourceMetadata: (metadata: VideoMetadata) => void;
  setAspectRatio: (preset: AspectRatioPreset) => void;
  setCropRect: (rect: CropRect) => void;
  resetCropRect: () => void;
  setVideoTransform: (transform: VideoTransform) => void;
  setVideoScale: (scale: number) => void;
  resetVideoTransform: () => void;
  addTextLayer: () => void;
  updateTextLayer: (id: string, patch: Partial<TextLayer>) => void;
  deleteTextLayer: (id: string) => void;
  selectTextLayer: (id: string | null) => void;
  applyPreset: (preset: EditorPreset) => void;
  setIsCropping: (value: boolean) => void;
  resetEditor: () => void;
};

export type EditorState = EditorDocument & {
  selectedTextLayerId: string | null;
  isCropping: boolean;
} & EditorActions;

const INITIAL_DOCUMENT: EditorDocument = {
  media: SAMPLE_MEDIA,
  sourceMetadata: SAMPLE_VIDEO_METADATA,
  aspectRatio: DEFAULT_ASPECT_RATIO,
  cropRect: DEFAULT_CROP_RECT,
  videoTransform: DEFAULT_VIDEO_TRANSFORM,
  textLayers: [],
};

function getGeometry(document: EditorDocument) {
  const sourceSize = getSourceSize(document.sourceMetadata);

  return {
    sourceSize,
    canvasSize: getCanvasSize(document.aspectRatio, sourceSize),
    cropSize: getCropSize(sourceSize, document.cropRect),
  };
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  ...INITIAL_DOCUMENT,
  selectedTextLayerId: null,
  isCropping: false,

  setMedia: (media, metadata) =>
    set({
      ...INITIAL_DOCUMENT,
      media,
      sourceMetadata: metadata,
      selectedTextLayerId: null,
      isCropping: false,
    }),

  loadSourceMetadata: async () => {
    const { media } = get();

    try {
      const metadata = await getVideoMetadata(media.src);

      if (get().media.src !== media.src) {
        return;
      }

      get().setSourceMetadata(metadata);
    } catch {
      // Keep the known fallback metadata if it cannot be loaded.
    }
  },

  setSourceMetadata: (metadata) =>
    set((state) => {
      const sourceSize = getSourceSize(metadata);
      const canvasSize = getCanvasSize(state.aspectRatio, sourceSize);
      const cropSize = getCropSize(sourceSize, state.cropRect);

      return {
        sourceMetadata: metadata,
        videoTransform: clampVideoTransform(
          state.videoTransform,
          cropSize,
          canvasSize,
        ),
        textLayers: state.textLayers.map((layer) =>
          clampTextLayerToCanvas(layer, canvasSize),
        ),
      };
    }),

  setAspectRatio: (preset) =>
    set((state) => {
      const { sourceSize, cropSize } = getGeometry(state);
      const nextCanvasSize = getCanvasSize(preset, sourceSize);

      return {
        aspectRatio: preset,
        videoTransform: clampVideoTransform(
          state.videoTransform,
          cropSize,
          nextCanvasSize,
        ),
        textLayers: state.textLayers.map((layer) =>
          clampTextLayerToCanvas(layer, nextCanvasSize),
        ),
      };
    }),

  setCropRect: (rect) =>
    set((state) => {
      const cropRect = clampCropRect(rect);
      const sourceSize = getSourceSize(state.sourceMetadata);
      const canvasSize = getCanvasSize(state.aspectRatio, sourceSize);
      const cropSize = getCropSize(sourceSize, cropRect);

      return {
        cropRect,
        videoTransform: clampVideoTransform(
          state.videoTransform,
          cropSize,
          canvasSize,
        ),
      };
    }),

  resetCropRect: () =>
    set((state) => {
      const sourceSize = getSourceSize(state.sourceMetadata);
      const canvasSize = getCanvasSize(state.aspectRatio, sourceSize);
      const cropSize = getCropSize(sourceSize, DEFAULT_CROP_RECT);

      return {
        cropRect: DEFAULT_CROP_RECT,
        videoTransform: clampVideoTransform(
          state.videoTransform,
          cropSize,
          canvasSize,
        ),
      };
    }),

  setVideoTransform: (transform) =>
    set((state) => {
      const { canvasSize, cropSize } = getGeometry(state);

      return {
        videoTransform: clampVideoTransform(transform, cropSize, canvasSize),
      };
    }),

  setVideoScale: (scale) =>
    set((state) => {
      const { canvasSize, cropSize } = getGeometry(state);
      const current = clampVideoTransform(
        state.videoTransform,
        cropSize,
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
          cropSize,
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

  applyPreset: (preset) =>
    set((state) => {
      const applied = applyPresetToDocument(preset, state.sourceMetadata);

      return {
        ...applied,
        selectedTextLayerId: applied.textLayers[0]?.id ?? null,
      };
    }),

  setIsCropping: (value) => set({ isCropping: value }),

  resetEditor: () =>
    set({ ...INITIAL_DOCUMENT, selectedTextLayerId: null, isCropping: false }),
}));
