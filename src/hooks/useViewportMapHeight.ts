"use client";

import { useEffect, useState } from "react";

export function useViewportMapHeight(desktopHeight: number) {
  const [height, setHeight] = useState(desktopHeight);
  useEffect(() => {
    const resize = () => {
      const { innerWidth, innerHeight } = window;
      setHeight(
        innerWidth >= 768 && innerHeight >= 550
          ? desktopHeight
          : Math.min(
              desktopHeight,
              Math.max(230, Math.round(innerHeight * 0.56)),
            ),
      );
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [desktopHeight]);
  return height;
}
