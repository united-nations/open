import type { ReactNode } from "react";
import { SectionSubnav } from "@/components/SectionSubnav";
import { SYSTEM_CONTRIBUTOR_NAV } from "@/lib/navigation";

export default function SystemContributorsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <SectionSubnav
        nested
        items={SYSTEM_CONTRIBUTOR_NAV}
        label="UN System contributor views"
      />
      {children}
    </>
  );
}
