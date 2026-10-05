"use client";

import { useEffect, useState, type ChangeEvent, type RefObject } from "react";
import type { PlayerRef } from "@remotion/player";
import { Button } from "@/components/ui/button";
import { formatTimecode } from "@/lib/time";
import { CLIP_COMPOSITION_FPS } from "@/remotion/constants";
import { useEditorStore } from "@/store/editor-store";
import { selectDurationInFrames } from "@/store/editor-selectors";

type PlaybackBarProps = {
  playerRef: RefObject<PlayerRef | null>;
};

export function PlaybackBar({ playerRef }: PlaybackBarProps) {
  const durationInFrames = useEditorStore(selectDurationInFrames);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    const handleFrameUpdate = (event: { detail: { frame: number } }) => {
      setCurrentFrame(event.detail.frame);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentFrame(player.getCurrentFrame());
    };

    setCurrentFrame(player.getCurrentFrame());
    setIsPlaying(player.isPlaying());

    player.addEventListener("frameupdate", handleFrameUpdate);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("ended", handleEnded);

    return () => {
      player.removeEventListener("frameupdate", handleFrameUpdate);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("ended", handleEnded);
    };
  }, [playerRef, durationInFrames]);

  function handleSeek(event: ChangeEvent<HTMLInputElement>) {
    const frame = Number(event.target.value);

    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  }

  return (
    <div className="sticky bottom-0 flex shrink-0 items-center gap-3 border-t border-zinc-800 bg-zinc-950 px-4 py-3 sm:gap-4 sm:px-6 lg:static">
      <Button
        variant="outline"
        size="icon"
        aria-label={isPlaying ? "Pause" : "Play"}
        className="shrink-0"
        onClick={() => playerRef.current?.toggle()}
      >
        {isPlaying ? (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-3.5 w-3.5 fill-current"
          >
            <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-3.5 w-3.5 fill-current"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </Button>
      <input
        type="range"
        min={0}
        max={Math.max(durationInFrames - 1, 0)}
        step={1}
        value={currentFrame}
        onChange={handleSeek}
        aria-label="Seek"
        className="min-w-0 flex-1 cursor-pointer accent-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
      />
      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
        {formatTimecode(currentFrame / CLIP_COMPOSITION_FPS)} /{" "}
        {formatTimecode(durationInFrames / CLIP_COMPOSITION_FPS)}
      </span>
    </div>
  );
}
