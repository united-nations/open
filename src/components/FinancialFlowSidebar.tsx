"use client";

import { useEffect, useId, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  FinancialDetailPanel,
  type FinancialDetailPanelProps,
} from "@un-eosg/ui/components/financial-detail-panel";
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
  const [origin] = useState(() => document.activeElement);
  useEffect(() => {
    const style = document.documentElement.style;
    const previousOverflow = style.overflow;
    const previousGutter = style.scrollbarGutter;
    style.overflow = "hidden";
    style.scrollbarGutter = "auto";
    return () => {
      style.overflow = previousOverflow;
      style.scrollbarGutter = previousGutter;
    };
  }, []);
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            // A detail link may have opened another sidebar in the same action.
            if (!document.querySelector('[role="dialog"][aria-modal="true"]')) {
              if (origin instanceof Element && "focus" in origin) {
                (origin as HTMLElement).focus();
              }
            }
          }}
          className="fixed inset-y-0 end-0 z-50 h-full w-full bg-white shadow-2xl focus:outline-none sm:w-[32rem]"
        >
          <FinancialDetailPanel
            {...content}
            title={
              <Dialog.Title asChild>
                <span>{content.title}</span>
              </Dialog.Title>
            }
            titleId={titleId}
            year={{ kind: "static", label: "Year", value: year }}
            controls={
              <SidebarControls
                onClose={onClose}
                closeLabel="Close flow details"
              />
            }
            className="bg-white sm:w-full"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
