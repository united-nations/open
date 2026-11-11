"use client";

import { useEffect, useRef } from "react";

/** Prevent D3 touch panning while allowing native page scroll and marker taps. */
export function useMapTouchScroll(interactive: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = ref.current;
    if (!map || interactive) return;
    const skipMapPan = (event: TouchEvent) => {
      if (event.target instanceof SVGElement && event.target.closest("svg")) {
        event.stopPropagation();
      }
    };
    // D3 listens on the SVG. A passive capture listener leaves browser gestures intact.
    map.addEventListener("touchstart", skipMapPan, {
      capture: true,
      passive: true,
    });
    return () => map.removeEventListener("touchstart", skipMapPan, true);
  }, [interactive]);

  return ref;
}
