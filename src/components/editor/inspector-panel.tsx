import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  ASPECT_RATIO_PRESETS,
  MAX_VIDEO_SCALE,
  MIN_VIDEO_SCALE,
} from "@/lib/editor";
import type { AspectRatioPreset, TextLayer } from "@/types/editor";

type InspectorPanelProps = {
  aspectRatio: AspectRatioPreset;
  onAspectRatioChange: (preset: AspectRatioPreset) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  onResetFraming: () => void;
  selectedTextLayer: TextLayer | null;
  onAddTextLayer: () => void;
};

export function InspectorPanel({
  aspectRatio,
  onAspectRatioChange,
  scale,
  onScaleChange,
  onResetFraming,
  selectedTextLayer,
  onAddTextLayer,
}: InspectorPanelProps) {
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
                onClick={() => onAspectRatioChange(value)}
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
            onChange={(event) => onScaleChange(Number(event.target.value))}
            aria-valuetext={`${Math.round(scale * 100)}%`}
            className="mt-2 w-full cursor-pointer accent-zinc-300"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={onResetFraming}
        >
          Reset framing
        </Button>
      </InspectorSection>
      <InspectorSection title="Text">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAddTextLayer}
        >
          Add text
        </Button>
        {selectedTextLayer ? (
          <p className="mt-3 truncate text-xs text-zinc-500">
            Selected: {selectedTextLayer.text || "Empty text"}
          </p>
        ) : (
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Add text to place it over the video.
          </p>
        )}
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
