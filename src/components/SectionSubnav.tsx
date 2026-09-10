"use client";

import Link from "next/link";
import { useEffect } from "react";
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
  useEffect(() => {
    if (nested) return;
    const nav = Array.from(document.querySelectorAll("nav"))
      .find((element) => element.getAttribute("aria-label") === label);
    const strip = nav?.parentElement;
    if (!strip) return;
    const update = () => document.documentElement.style.setProperty(
      "--section-nav-height", `${strip.getBoundingClientRect().height}px`,
    );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [label, nested]);

  const renderLink = ({ href, ...props }: SecondaryHeaderLinkProps) => (
    <Link href={href} {...props} />
  );

  return (
    <SecondaryHeader
      items={items}
      label={label}
      activeHref={activeItem?.href}
      renderLink={renderLink}
      className={nested ? "top-[calc(65px+var(--section-nav-height,47px))] min-[1408px]:top-[calc(56px+var(--section-nav-height,47px))]" : undefined}
    />
  );
}
