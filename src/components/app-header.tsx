export function AppHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <span className="text-sm font-semibold tracking-tight text-zinc-50">
          ClipCrop
        </span>
        <span className="text-xs text-zinc-500">Instagram video editor</span>
      </div>
    </header>
  );
}
