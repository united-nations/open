"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

/** Keep labels measurable while hiding ones that cannot fit their parent tile. */
export function TreemapLabel({
  fit = true,
  minWidth = 0,
  minHeight = 0,
  style,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  fit?: boolean;
  minWidth?: number;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!fit);
  useLayoutEffect(() => {
    const label = ref.current;
    const tile = label?.parentElement;
    if (!label || !tile) return;
    const update = () => {
      const box = label.getBoundingClientRect();
      const bounds = tile.getBoundingClientRect();
      setVisible(
        !fit ||
          (bounds.width >= minWidth &&
            bounds.height >= minHeight &&
            box.left >= bounds.left - 0.5 &&
            box.top >= bounds.top - 0.5 &&
            box.right <= bounds.right + 0.5 &&
            box.bottom <= bounds.bottom + 0.5 &&
            label.scrollWidth <= label.clientWidth &&
            label.scrollHeight <= label.clientHeight),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(tile);
    observer.observe(label);
    return () => observer.disconnect();
  }, [fit, minWidth, minHeight, children]);
  return (
    <div
      {...props}
      ref={ref}
      style={{ ...style, visibility: visible ? "visible" : "hidden" }}
    >
      {children}
    </div>
  );
}
