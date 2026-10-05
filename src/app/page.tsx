export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/40 px-8 py-12 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Crop and caption Instagram videos
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Import an Instagram video, crop and reposition the frame, add text
          overlays, then export the edited video together with its caption.
        </p>
      </section>
    </main>
  );
}
