"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Renders a Mermaid diagram client-side. Diagram source is app-authored, never user input. */
export function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, "-");

  useEffect(() => {
    let cancelled = false;

    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
        flowchart: { htmlLabels: true, curve: "basis" },
      });
      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render diagram");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
        Diagram failed to render: {error}
      </p>
    );
  }

  return <div ref={containerRef} className="overflow-x-auto [&_svg]:mx-auto" />;
}
