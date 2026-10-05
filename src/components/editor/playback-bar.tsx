export function PlaybackBar() {
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-zinc-800 bg-zinc-950 px-4 py-3 sm:gap-4 sm:px-6">
      <button
        type="button"
        disabled
        aria-label="Play"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-3.5 w-3.5 fill-current"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
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
