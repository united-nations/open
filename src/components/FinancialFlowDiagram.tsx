"use client";

import type { ReactNode } from "react";
import {
  SankeyDiagram,
  type SankeyDiagramProps,
} from "@un-eosg/ui/components/sankey-diagram";
import type { SankeySelection } from "@un-eosg/ui/sankey";
import {
  FinancialFlowSidebar,
  type FinancialFlowSidebarContent,
} from "./FinancialFlowSidebar";

/** Shared interaction and sidebar presentation for both financial datasets. */
export function FinancialFlowDiagram({
  sidebarDetails,
  footer,
  ...props
}: Omit<SankeyDiagramProps, "renderSelection"> & {
  footer?: ReactNode;
  sidebarDetails: (
    selection: SankeySelection,
    onClose: () => void,
  ) => FinancialFlowSidebarContent;
}) {
  return (
    <>
      <SankeyDiagram
        wrapLabels
        responsiveControls
        {...props}
        renderSelection={(selection, onClose) => (
          <FinancialFlowSidebar
            {...sidebarDetails(selection, onClose)}
            onClose={onClose}
          />
        )}
      />
      {footer}
    </>
  );
}
