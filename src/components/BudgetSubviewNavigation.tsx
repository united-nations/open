"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SectionSubnav } from "@/components/SectionSubnav";

export function BudgetSubviewNavigation({
  basePath,
  label,
  contributorHash,
  mainLabel = "Budget",
}: {
  basePath: string;
  label: string;
  contributorHash: string;
  mainLabel?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const followLegacyLink = () => {
      const hash = window.location.hash.slice(1);
      if (
        pathname.replace(/\/$/, "") === basePath &&
        (hash === `${contributorHash}s` ||
          hash.startsWith(`${contributorHash}=`))
      ) {
        router.replace(`${basePath}/contributors/${window.location.hash}`);
      }
    };
    followLegacyLink();
    window.addEventListener("hashchange", followLegacyLink);
    return () => window.removeEventListener("hashchange", followLegacyLink);
  }, [basePath, contributorHash, pathname, router]);
  return (
    <SectionSubnav
      nested
      label={label}
      items={[
        { href: basePath, label: mainLabel },
        { href: `${basePath}/contributors`, label: "Contributors" },
      ]}
    />
  );
}
