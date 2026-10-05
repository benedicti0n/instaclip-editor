import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const ASPECT_RATIOS = ["Original", "9:16", "4:5", "1:1", "16:9"] as const;

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
              <Button
                key={ratio}
                variant="outline"
                size="sm"
                disabled
                aria-pressed={isDefault}
                className={
                  isDefault
                    ? "border-zinc-600 bg-zinc-800/60 text-zinc-100"
                    : "border-zinc-800 text-zinc-400"
                }
              >
                {ratio}
              </Button>
            );
          })}
        </div>
      </InspectorSection>
      <InspectorSection title="Text">
        <Button variant="outline" size="sm" disabled className="w-full">
          Add text
        </Button>
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
