"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  SankeyDiagram,
  type SankeyDiagramProps,
} from "@un-eosg/ui/components/sankey-diagram";
import type { SankeySelection } from "@un-eosg/ui/sankey";
import {
  FinancialFlowSidebar,
  type FinancialFlowSidebarContent,
} from "./FinancialFlowSidebar";
import styles from "./FinancialFlowDiagram.module.css";

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
  const diagramRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const svg =
      diagramRef.current?.querySelector<SVGSVGElement>('svg[role="group"]');
    if (!svg) return;

    // Keep the fitted viewBox from magnifying the labels past the text scale.
    const updateLabelScale = () => {
      const scale = svg.getScreenCTM()?.a ?? 1;
      svg.style.setProperty("--label-scale", String(1 / Math.max(1, scale)));
    };
    updateLabelScale();

    const resize = new ResizeObserver(updateLabelScale);
    resize.observe(svg);
    const viewBox = new MutationObserver(updateLabelScale);
    viewBox.observe(svg, { attributeFilter: ["viewBox"] });
    return () => {
      resize.disconnect();
      viewBox.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={diagramRef} className={styles.diagram}>
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
      </div>
      {footer}
    </>
  );
}
