import { APP_NAME } from "@/lib/constants";

export function AppHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <span className="text-sm font-semibold tracking-tight text-zinc-50">
          {APP_NAME}
        </span>
        <span className="text-xs text-zinc-500">Instagram video editor</span>
      </div>
    </header>
  );
}
