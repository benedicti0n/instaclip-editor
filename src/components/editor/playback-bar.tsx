import { Button } from "@/components/ui/button";

export function PlaybackBar() {
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-zinc-800 bg-zinc-950 px-4 py-3 sm:gap-4 sm:px-6">
      <Button
        variant="outline"
        size="icon"
        disabled
        aria-label="Play"
        className="shrink-0"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-3.5 w-3.5 fill-current"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </Button>
      <div
        aria-hidden="true"
        className="h-1.5 min-w-0 flex-1 rounded-full bg-zinc-800"
      />
      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
        00:00 / 00:00
      </span>
    </div>
  );
}
