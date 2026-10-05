import type { ReactNode } from "react";

const ASPECT_RATIOS = ["Original", "9:16", "4:5", "1:1", "16:9"] as const;

const OPTION_CLASSES =
  "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:cursor-not-allowed disabled:opacity-50";

export function InspectorPanel() {
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
          {ASPECT_RATIOS.map((ratio) => {
            const isDefault = ratio === "Original";

            return (
              <button
                key={ratio}
                type="button"
                disabled
                aria-pressed={isDefault}
                className={`${OPTION_CLASSES} ${
                  isDefault
                    ? "border-zinc-600 bg-zinc-800/60 text-zinc-100"
                    : "border-zinc-800 text-zinc-400"
                }`}
              >
                {ratio}
              </button>
            );
          })}
        </div>
      </InspectorSection>
      <InspectorSection title="Text">
        <button
          type="button"
          disabled
          className="inline-flex h-8 w-full items-center justify-center rounded-md border border-zinc-700 px-3 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add text
        </button>
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
