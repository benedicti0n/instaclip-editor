"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  ASPECT_RATIO_PRESETS,
  MAX_VIDEO_SCALE,
  MIN_VIDEO_SCALE,
} from "@/lib/editor";
import {
  MAX_TEXT_FONT_SIZE,
  MIN_TEXT_FONT_SIZE,
  TEXT_ALIGNMENT_OPTIONS,
  TEXT_FONT_OPTIONS,
  TEXT_WEIGHT_OPTIONS,
} from "@/lib/text-layer";
import { useEditorStore } from "@/store/editor-store";
import {
  selectClampedVideoScale,
  selectHasTextLayers,
  selectSelectedTextLayer,
} from "@/store/editor-selectors";
import type { TextFontFamily, TextFontWeight } from "@/types/editor";

const SELECT_CLASSES =
  "mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500";

export function InspectorPanel() {
  const aspectRatio = useEditorStore((state) => state.aspectRatio);
  const setAspectRatio = useEditorStore((state) => state.setAspectRatio);
  const scale = useEditorStore(selectClampedVideoScale);
  const setVideoScale = useEditorStore((state) => state.setVideoScale);
  const resetVideoTransform = useEditorStore(
    (state) => state.resetVideoTransform,
  );
  const selectedTextLayer = useEditorStore(selectSelectedTextLayer);
  const hasTextLayers = useEditorStore(selectHasTextLayers);
  const sourceMetadata = useEditorStore((state) => state.sourceMetadata);
  const addTextLayer = useEditorStore((state) => state.addTextLayer);
  const updateTextLayer = useEditorStore((state) => state.updateTextLayer);
  const deleteTextLayer = useEditorStore((state) => state.deleteTextLayer);

  return (
    <aside
      aria-label="Inspector"
      className="w-full shrink-0 border-t border-zinc-800 bg-zinc-950 lg:w-72 lg:overflow-y-auto lg:border-t-0 lg:border-l xl:w-80"
    >
      <InspectorSection title="Canvas">
        <p className="text-xs font-medium text-zinc-500">Aspect ratio</p>
        <div
          role="group"
          aria-label="Aspect ratio"
          className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2"
        >
          {ASPECT_RATIO_PRESETS.map(({ value, label }) => {
            const isSelected = value === aspectRatio;

            return (
              <Button
                key={value}
                variant="outline"
                size="sm"
                aria-pressed={isSelected}
                onClick={() => setAspectRatio(value)}
                className={isSelected ? "bg-zinc-800" : undefined}
              >
                {label}
              </Button>
            );
          })}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label
              htmlFor="video-zoom"
              className="text-xs font-medium text-zinc-500"
            >
              Zoom
            </label>
            <span className="text-xs tabular-nums text-zinc-400">
              {Math.round(scale * 100)}%
            </span>
          </div>
          <input
            id="video-zoom"
            type="range"
            min={MIN_VIDEO_SCALE}
            max={MAX_VIDEO_SCALE}
            step={0.01}
            value={scale}
            onChange={(event) => setVideoScale(Number(event.target.value))}
            aria-valuetext={`${Math.round(scale * 100)}%`}
            className="mt-2 w-full cursor-pointer accent-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={resetVideoTransform}
        >
          Reset framing
        </Button>
      </InspectorSection>
      <InspectorSection title="Text">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addTextLayer}
        >
          Add text
        </Button>
        {selectedTextLayer ? (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="text-content"
                className="text-xs font-medium text-zinc-500"
              >
                Content
              </label>
              <textarea
                id="text-content"
                rows={3}
                value={selectedTextLayer.text}
                onChange={(event) =>
                  updateTextLayer(selectedTextLayer.id, {
                    text: event.target.value,
                  })
                }
                placeholder="Add your text"
                className="mt-2 w-full resize-y rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
              />
            </div>
            <div>
              <label
                htmlFor="text-font"
                className="text-xs font-medium text-zinc-500"
              >
                Font
              </label>
              <select
                id="text-font"
                value={selectedTextLayer.fontFamily}
                onChange={(event) =>
                  updateTextLayer(selectedTextLayer.id, {
                    fontFamily: event.target.value as TextFontFamily,
                  })
                }
                className={SELECT_CLASSES}
              >
                {TEXT_FONT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="text-weight"
                className="text-xs font-medium text-zinc-500"
              >
                Weight
              </label>
              <select
                id="text-weight"
                value={selectedTextLayer.fontWeight}
                onChange={(event) =>
                  updateTextLayer(selectedTextLayer.id, {
                    fontWeight: Number(event.target.value) as TextFontWeight,
                  })
                }
                className={SELECT_CLASSES}
              >
                {TEXT_WEIGHT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="text-size"
                  className="text-xs font-medium text-zinc-500"
                >
                  Size
                </label>
                <span className="text-xs tabular-nums text-zinc-400">
                  {selectedTextLayer.fontSize}px
                </span>
              </div>
              <input
                id="text-size"
                type="range"
                min={MIN_TEXT_FONT_SIZE}
                max={MAX_TEXT_FONT_SIZE}
                step={1}
                value={selectedTextLayer.fontSize}
                onChange={(event) =>
                  updateTextLayer(selectedTextLayer.id, {
                    fontSize: Number(event.target.value),
                  })
                }
                aria-valuetext={`${selectedTextLayer.fontSize} pixels`}
                className="mt-2 w-full cursor-pointer accent-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
              />
            </div>
            <div>
              <label
                htmlFor="text-color"
                className="text-xs font-medium text-zinc-500"
              >
                Color
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="text-color"
                  type="color"
                  value={selectedTextLayer.color}
                  onChange={(event) =>
                    updateTextLayer(selectedTextLayer.id, {
                      color: event.target.value,
                    })
                  }
                  className="h-8 w-10 cursor-pointer rounded-md border border-zinc-800 bg-zinc-900 p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
                />
                <span className="text-xs tabular-nums text-zinc-400">
                  {selectedTextLayer.color.toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Alignment</p>
              <div
                role="group"
                aria-label="Text alignment"
                className="mt-2 grid grid-cols-3 gap-2"
              >
                {TEXT_ALIGNMENT_OPTIONS.map(({ value, label }) => {
                  const isSelected = selectedTextLayer.textAlign === value;

                  return (
                    <Button
                      key={value}
                      variant="outline"
                      size="sm"
                      aria-pressed={isSelected}
                      onClick={() =>
                        updateTextLayer(selectedTextLayer.id, {
                          textAlign: value,
                        })
                      }
                      className={isSelected ? "bg-zinc-800" : undefined}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="text-shadow"
                type="checkbox"
                checked={selectedTextLayer.hasShadow}
                onChange={(event) =>
                  updateTextLayer(selectedTextLayer.id, {
                    hasShadow: event.target.checked,
                  })
                }
                className="h-3.5 w-3.5 cursor-pointer accent-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
              />
              <label
                htmlFor="text-shadow"
                className="text-xs font-medium text-zinc-500"
              >
                Shadow
              </label>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => deleteTextLayer(selectedTextLayer.id)}
            >
              Delete text
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            {hasTextLayers
              ? "Select a text layer on the canvas to edit it."
              : "Add text to place it over the video."}
          </p>
        )}
      </InspectorSection>
      <InspectorSection title="Source">
        <dl className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-zinc-500">Resolution</dt>
            <dd className="tabular-nums text-zinc-400">
              {sourceMetadata.width} × {sourceMetadata.height}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-zinc-500">Duration</dt>
            <dd className="tabular-nums text-zinc-400">
              {sourceMetadata.durationInSeconds.toFixed(1)} sec
            </dd>
          </div>
        </dl>
      </InspectorSection>
    </aside>
  );
}

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-zinc-800 p-4">
      <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
