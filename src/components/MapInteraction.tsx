"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMapTouchScroll } from "@/hooks/useMapTouchScroll";

export function MapInteraction({ children }: { children: ReactNode }) {
  const [interactive, setInteractive] = useState(false);
  const map = useMapTouchScroll(interactive);
  useEffect(() => {
    const container = map.current;
    if (!container) return;
    // The map package renders its own symbol-only zoom buttons.
    const labelControls = () => {
      for (const button of container.querySelectorAll(".zoom-buttons button")) {
        const symbol = button.textContent?.trim();
        if (symbol === "+") button.setAttribute("aria-label", "Zoom in");
        if (symbol === "–" || symbol === "−" || symbol === "-")
          button.setAttribute("aria-label", "Zoom out");
      }
    };
    labelControls();
    const observer = new MutationObserver(labelControls);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [map]);
  return (
    <>
      <button
        type="button"
        aria-pressed={interactive}
        onClick={() => setInteractive(!interactive)}
        className="mb-2 hidden min-h-11 rounded-sm border border-gray-300 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-un-blue any-pointer-coarse:block"
      >
        {interactive ? "Stop panning map" : "Enable map panning"}
      </button>
      <div ref={map} data-financial-map="">
        {children}
      </div>
    </>
  );
}
