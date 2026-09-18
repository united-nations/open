"use client";

import { useEffect, useState } from "react";

/**
 * The UNDP maps apply D3 zoom to a parent SVG group but exposes no zoom callback.
 * Partially counter-scale origin-centered circles so their screen radius grows
 * with the square root of zoom, preserving relative sizes and map positions.
 */
export function useMapBubbleZoom() {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!root) return;

    const update = () => {
      root
        .querySelectorAll<SVGCircleElement>("svg circle")
        .forEach((circle) => {
          if (circle.cx.baseVal.value !== 0 || circle.cy.baseVal.value !== 0)
            return;
          let scale = 1;
          let parent = circle.parentElement;
          while (parent && parent !== root) {
            if (parent instanceof SVGGElement) {
              const transforms = parent.transform.baseVal;
              for (let i = 0; i < transforms.numberOfItems; i += 1) {
                const matrix = transforms.getItem(i).matrix;
                scale *= Math.hypot(matrix.a, matrix.b);
              }
            }
            parent = parent.parentElement;
          }
          if (!Number.isFinite(scale) || scale <= 0) return;
          const transform = `scale(${1 / Math.sqrt(scale)})`;
          if (circle.style.transform !== transform) {
            circle.style.transformOrigin = "0px 0px";
            circle.style.transform = transform;
          }
        });
    };

    const observer = new MutationObserver(update);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["transform"],
    });
    update();
    return () => observer.disconnect();
  }, [root]);

  return setRoot;
}
