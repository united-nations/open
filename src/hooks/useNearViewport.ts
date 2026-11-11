"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useNearViewport<T extends HTMLElement = HTMLDivElement>(
  rootMargin = "240px",
) {
  const ref = useRef<T>(null);
  const [ready, setReady] = useState(false);
  const activate = useCallback(() => {
    const element = ref.current;
    const focused = document.activeElement;
    if (
      focused?.hasAttribute("data-deferred-chart-trigger") &&
      element?.contains(focused)
    ) {
      element.focus({ preventScroll: true });
    }
    setReady(true);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element || ready) return;
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(activate);
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) activate();
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [activate, ready, rootMargin]);

  return { ref, ready, activate };
}
