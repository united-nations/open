"use client";

import { SiteHeader as UiSiteHeader } from "@un-eosg/ui/components/site-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const navItems = [
  { href: "/system", label: "UN System Financials" },
  { href: "/secretariat", label: "UN Secretariat Financials" },
];

function withBase(path: string) {
  if (!basePath) return path;
  return path === "/" ? `${basePath}/` : `${basePath}${path}`;
}

export function SiteHeader() {
  const pathname = usePathname();
  const activePath = pathname.replace(/\/$/, "") || "/";
  const activeItem = navItems.find(
    (item) =>
      activePath === item.href || activePath.startsWith(`${item.href}/`),
  );

  return (
    <>
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
        emblemPlacement="outboard"
        emblemSrc={`${basePath}/images/un-emblem-colour.svg`}
        containerClassName="max-w-6xl px-6 md:px-12 lg:px-16"
      >
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation menu"
              className="size-9 shrink-0 text-foreground/80 hover:bg-transparent hover:text-foreground lg:hidden"
            >
              <Menu className="size-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {navItems.map(({ href, label }) => {
              const active =
                activePath === href || activePath.startsWith(`${href}/`);
              return (
                <DropdownMenuItem
                  key={href}
                  asChild={!active}
                  className={
                    active
                      ? "cursor-default bg-un-blue/10 font-medium text-un-blue"
                      : ""
                  }
                >
                  {active ? (
                    <span>{label}</span>
                  ) : (
                    <Link href={href}>{label}</Link>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </UiSiteHeader>
    </>
  );
}
