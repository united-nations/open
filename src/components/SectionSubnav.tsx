"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  SecondaryHeader,
  type SecondaryHeaderLinkProps,
} from "@un-eosg/ui/components/secondary-header";
import type { SectionNavItem } from "@/lib/navigation";

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

function isActive(pathname: string, item: SectionNavItem) {
  if (pathname === item.href) return true;
  return item.aliases?.some((alias) => pathname === alias) ?? false;
}

export function SectionSubnav({
  items,
  label,
  nested = false,
}: {
  items: readonly SectionNavItem[];
  label: string;
  nested?: boolean;
}) {
  const pathname = normalizePath(usePathname());
  const activeItem = items.find((item) => isActive(pathname, item));
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const nav = wrapper.current?.querySelector("nav");
    const strip = nav?.parentElement;
    if (!nav || !strip) return;

    const updateEdges = () => {
      strip.toggleAttribute("data-more-before", nav.scrollLeft > 1);
      strip.toggleAttribute(
        "data-more-after",
        nav.scrollWidth - nav.clientWidth - nav.scrollLeft > 1,
      );
    };
    const update = () => {
      if (!nested) {
        document.documentElement.style.setProperty(
          "--section-nav-height",
          `${strip.getBoundingClientRect().height}px`,
        );
      }
      const active = nav.querySelector('[aria-current="page"]');
      if (active && nav.scrollWidth > nav.clientWidth) {
        const link = active.getBoundingClientRect();
        const box = nav.getBoundingClientRect();
        const inset = 18;
        if (link.left < box.left + inset) {
          nav.scrollLeft += link.left - box.left - inset;
        } else if (link.right > box.right - inset) {
          nav.scrollLeft += link.right - box.right + inset;
        }
      }
      updateEdges();
    };
    update();
    let mounted = true;
    void document.fonts.ready.then(() => {
      if (mounted) update();
    });
    const observer = new ResizeObserver(update);
    observer.observe(strip);
    nav.addEventListener("scroll", updateEdges, { passive: true });
    return () => {
      mounted = false;
      observer.disconnect();
      nav.removeEventListener("scroll", updateEdges);
      if (!nested)
        document.documentElement.style.removeProperty("--section-nav-height");
    };
  }, [activeItem?.href, nested]);

  const renderLink = ({ href, ...props }: SecondaryHeaderLinkProps) => (
    <Link href={href} {...props} />
  );

  return (
    <div ref={wrapper} className="contents">
      <SecondaryHeader
        items={items}
        label={label}
        activeHref={activeItem?.href}
        renderLink={renderLink}
        className={
          nested
            ? "section-subnav section-subnav-nested top-[calc(var(--site-header-height,65px)+var(--section-nav-height,47px))] min-[1408px]:top-[calc(var(--site-header-height,65px)+var(--section-nav-height,47px))]"
            : "section-subnav top-[var(--site-header-height,65px)] min-[1408px]:top-[var(--site-header-height,65px)]"
        }
      />
    </div>
  );
}
