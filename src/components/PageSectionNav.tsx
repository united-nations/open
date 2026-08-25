"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface PageSectionNavItem {
  id: string;
  label: string;
}

function scrollToSection(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PageSectionNav({
  sections,
  underSecretariatNav = false,
}: {
  sections: readonly PageSectionNavItem[];
  underSecretariatNav?: boolean;
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? null);

  useEffect(() => {
    const anchors = sections
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (anchors.length === 0) return;

    // Match the scroll margins on SectionBanner: scroll-mt-28 (112px) for
    // System pages and scroll-mt-40 (160px) under the two Secretariat navs.
    // The extra pixel makes the newly aligned anchor count as active despite
    // sub-pixel layout rounding.
    const activeLine = underSecretariatNav ? 161 : 113;
    let animationFrame: number | null = null;

    const recompute = () => {
      let current = anchors[0].id;
      for (const anchor of anchors) {
        if (anchor.getBoundingClientRect().top <= activeLine) {
          current = anchor.id;
        }
      }
      setActiveId(current);
      animationFrame = null;
    };
    const scheduleRecompute = () => {
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(recompute);
      }
    };

    const observer = new IntersectionObserver(scheduleRecompute, {
      rootMargin: `-${activeLine}px 0px 0px 0px`,
      threshold: 0,
    });
    anchors.forEach((anchor) => observer.observe(anchor));
    window.addEventListener("scroll", scheduleRecompute, { passive: true });
    window.addEventListener("resize", scheduleRecompute);
    recompute();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleRecompute);
      window.removeEventListener("resize", scheduleRecompute);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [sections, underSecretariatNav]);

  return (
    <div
      className={cn(
        "sticky z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm supports-backdrop-filter:bg-white/95",
        underSecretariatNav
          ? "top-[110px] min-[1408px]:top-[101px]"
          : "top-16 min-[1408px]:top-14",
      )}
    >
      <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
        <nav
          aria-label="Page sections"
          className="-mx-2.5 flex items-center gap-1 overflow-x-auto py-1.5 [scrollbar-width:none]"
        >
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={activeId === id ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                setActiveId(id);
                scrollToSection(id);
                window.history.replaceState(null, "", `#${id}`);
              }}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                activeId === id
                  ? "text-un-blue"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
