"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/secretariat", label: "Overview" },
  { href: "/secretariat/regular-budget", label: "Regular Budget" },
  { href: "/secretariat/peacekeeping-budget", label: "Peacekeeping Budget" },
  { href: "/secretariat/trust-funds", label: "Trust Funds" },
] as const;

export function SecretariatSubnav() {
  const pathname = usePathname().replace(/\/$/, "") || "/";

  return (
    <div className="sticky top-[65px] z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <nav
        aria-label="UN Secretariat financials"
        className="mx-auto flex max-w-6xl overflow-x-auto px-6 md:px-12 lg:px-16"
      >
        {items.map((item) => {
          const active = pathname === item.href;
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
