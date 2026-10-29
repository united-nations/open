"use client";

import { SiteHeader as UiSiteHeader } from "@un-eosg/ui/components/site-header";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const navItems = [
  { href: "/system", label: "UN System Financials" },
  { href: "/secretariat", label: "UN Secretariat Financials" },
  { href: "/about", label: "About" },
];

function withBase(path: string) {
  if (!basePath) return path;
  return path === "/" ? `${basePath}/` : `${basePath}${path}`;
}

export function SiteHeader() {
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const header = wrapper.current?.querySelector("header");
    if (!header) return;
    const update = () =>
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, []);
  const pathname = usePathname();
  const activePath = pathname.replace(/\/$/, "") || "/";
  const activeItem = navItems.find(
    (item) =>
      activePath === item.href || activePath.startsWith(`${item.href}/`),
  );

  return (
    <div ref={wrapper} className="contents">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-un-blue focus:ring-2 focus:ring-un-blue focus:outline-none"
      >
        Skip to main content
      </a>
      <UiSiteHeader
        brand="United Nations"
        descriptor="Transparency Portal"
        href={withBase("/")}
        homeLabel="UN Transparency Portal — home"
        navItems={navItems.map((item) => ({
          ...item,
          href: withBase(item.href),
        }))}
        activeHref={activeItem ? withBase(activeItem.href) : undefined}
        mobileMenuLabel="Open navigation menu"
        emblemPlacement="outboard"
        transparency="low"
        containerClassName="max-w-6xl px-6 md:px-12 lg:px-16"
      />
    </div>
  );
}
