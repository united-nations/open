"use client";
import { DetailDrawer, DrawerTitle } from "./DetailDrawer";
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
    <DetailDrawer
      titleId="geographic-sidebar-title"
      onClose={onClose}
      className="sm:w-2/3 lg:w-1/3 lg:min-w-[500px]"
    >
      <FinancialDetailPanel
        title={<DrawerTitle>{row.name}</DrawerTitle>}
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
            label="Total expenditure"
            value={formatBudget(row.total)}
          />
          {row.notes.map((note) => (
            <p key={note} className="text-sm">
              {note}
            </p>
          ))}
          <div>
            <FinancialPanelHeading>Expenditure by entity</FinancialPanelHeading>
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
    </DetailDrawer>
  );
}
