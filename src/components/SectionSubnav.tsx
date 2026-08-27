"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
}: {
  items: readonly SectionNavItem[];
  label: string;
}) {
  const pathname = normalizePath(usePathname());

  return (
    <div className="sticky top-[65px] z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm min-[1408px]:top-14">
      <nav
        aria-label={label}
        className="mx-auto flex max-w-6xl overflow-x-auto px-6 md:px-12 lg:px-16"
      >
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm whitespace-nowrap transition-colors first:pl-0",
                active
                  ? "border-un-blue font-semibold text-un-blue"
                  : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
