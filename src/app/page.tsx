import { InstagramImportForm } from "@/components/import/instagram-import-form";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Import an Instagram video
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Paste a link to an Instagram Reel to crop it and add text overlays,
          then export the edited video together with its original caption.
        </p>
        <InstagramImportForm />
      </div>
    </main>
  );
}
