"use client";

import { useId } from "react";
import {
  FinancialDetailPanel,
  type FinancialDetailPanelProps,
} from "@un-eosg/ui/components/financial-detail-panel";
import { DetailDrawer, DrawerTitle } from "./DetailDrawer";
import { SidebarControls } from "./SidebarControls";

export type FinancialFlowSidebarContent = Pick<
  FinancialDetailPanelProps,
  "title" | "eyebrow" | "total" | "children" | "subtitle"
> & { year: number };

export function FinancialFlowSidebar({
  year,
  onClose,
  ...content
}: FinancialFlowSidebarContent & { onClose: () => void }) {
  const titleId = useId();
  return (
    <DetailDrawer titleId={titleId} onClose={onClose} className="sm:w-[32rem]">
      <FinancialDetailPanel
        {...content}
        title={<DrawerTitle>{content.title}</DrawerTitle>}
        titleId={titleId}
        year={{ kind: "static", label: "Year", value: year }}
        controls={
          <SidebarControls onClose={onClose} closeLabel="Close flow details" />
        }
        className="bg-white sm:w-full"
      />
    </DetailDrawer>
  );
}
