export function PreviewPanel() {
  return (
    <section
      aria-label="Video preview"
      className="flex min-h-0 flex-1 items-center justify-center bg-zinc-950 p-4 sm:p-6"
    >
      <div className="flex h-full min-h-[18rem] w-full max-w-sm items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 lg:min-h-0">
        <p className="text-xs font-medium tracking-[0.2em] text-zinc-600 uppercase">
          Video preview
        </p>
      </div>
    </section>
  );
}
