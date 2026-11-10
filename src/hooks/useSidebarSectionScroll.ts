"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Set the panel's initial position without scrolling the page or reordering sections. */
export function useSidebarSectionScroll(
  dialogRef: RefObject<HTMLDivElement | null>,
  section: "assessments" | "outstanding" | undefined,
  ready: boolean,
) {
  const positioned = useRef(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!section || !ready || !dialog || positioned.current) return;
    const content = dialog.querySelector<HTMLElement>(
      ".sidebar-scroll-content",
    );
    if (!content) return;
    const label =
      section === "outstanding"
        ? "Outstanding assessments"
        : "Assessments and payments";
    let frame = 0;
    const position = () => {
      if (positioned.current) return;
      const target = content.querySelector<HTMLElement>(
        `[aria-label="${label}"]`,
      );
      if (!target) return;
      positioned.current = true;
      content.scrollTop +=
        target.getBoundingClientRect().top -
        content.getBoundingClientRect().top -
        16;
      observer.disconnect();
    };
    // Outstanding balances load independently, so wait for their section if needed.
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(position);
    });
    observer.observe(content, { childList: true, subtree: true });
    frame = requestAnimationFrame(position);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [dialogRef, section, ready]);
}
