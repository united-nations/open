"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { FinancialDetailPanel } from "@un-eosg/ui/components/financial-detail-panel";
import {
  FinancialPanelTotalRow,
  FinancialPanelHeading,
  FinancialPanelRankedRow,
  FinancialPanelBar,
} from "@un-eosg/ui/components/financial-panel-parts";
import { SidebarControls } from "./SidebarControls";
import { formatBudget } from "@/lib/entities";
import {
  geographicStyle,
  type GeographicExpense,
} from "@/lib/geographicExpenses";

export function GeographicSidebar({
  row,
  year,
  years,
  onYearChange,
  onClose,
}: {
  row: GeographicExpense;
  year: number;
  years: number[];
  onYearChange: (year: number) => void;
  onClose: () => void;
}) {
  const entries = Object.entries(row.entities).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 w-full bg-white shadow-xl sm:w-2/3 lg:w-1/3 lg:min-w-[500px]"
        >
          <Dialog.Title className="sr-only">{row.name}</Dialog.Title>
          <FinancialDetailPanel
            title={row.name}
            titleId="geographic-sidebar-title"
            subtitle={geographicStyle(row.level).label}
            className="sm:w-full"
            yearSelectorPlacement="header"
            yearSelector={{
              label: "Select year",
              years,
              selected: year,
              onChange: onYearChange,
            }}
            controls={
              <SidebarControls onClose={onClose} closeLabel="Close sidebar" />
            }
          >
            <div className="space-y-5">
              <FinancialPanelTotalRow
                label="Total spending"
                value={formatBudget(row.total)}
              />
              {row.notes.map((note) => (
                <p key={note} className="text-sm">
                  {note}
                </p>
              ))}
              <div>
                <FinancialPanelHeading>
                  Spending by entity
                </FinancialPanelHeading>
                {entries.map(([entity, amount]) => (
                  <FinancialPanelRankedRow
                    key={entity}
                    label={entity}
                    value={formatBudget(amount)}
                  >
                    <FinancialPanelBar
                      percent={(Math.max(0, amount) / max) * 100}
                      color={geographicStyle(row.level).color}
                    />
                  </FinancialPanelRankedRow>
                ))}
              </div>
            </div>
          </FinancialDetailPanel>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
