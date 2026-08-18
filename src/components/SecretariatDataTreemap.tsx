"use client";

import { useCallback, useEffect, useState } from "react";
import { BudgetTreemap } from "@/components/BudgetTreemap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clearSidebarHash } from "@/hooks/useDeepLink";
import { formatBudget } from "@/lib/entities";

type SecretariatDataset = "audited" | "ppb";
type BudgetBlock = "programme" | "peacekeeping";

const DATASET_DETAILS: Record<
  SecretariatDataset,
  { label: string; description: string }
> = {
  audited: {
    label: "Audited financial statements",
    description:
      "Actual expenses from the Secretariat's consolidated financial statements, covering 2019–2023 and organized by budget part, section and entity.",
  },
  ppb: {
    label: "Programme budget data (PPB + PKO)",
    description:
      "Expenditure reported in the Proposed Programme Budget editions, covering 2019–2025, paired with separately assessed peacekeeping mission budgets on their July–June cycles.",
  },
};

const BLOCK_DETAILS: Record<
  BudgetBlock,
  { label: string; description: string; hashPrefix: string }
> = {
  programme: {
    label: "Secretariat budget",
    description:
      "Budget parts and sections, with funding sources shown as shades",
    hashPrefix: "secretariat",
  },
  peacekeeping: {
    label: "Peacekeeping Operations budget",
    description: "Separately assessed mission accounts on July–June cycles",
    hashPrefix: "pko",
  },
};

export function SecretariatDataTreemap() {
  const [dataset, setDataset] = useState<SecretariatDataset>("audited");
  const [activeBlock, setActiveBlock] = useState<BudgetBlock>("programme");
  const [blockTotals, setBlockTotals] = useState<{
    programme: number | null;
    peacekeeping: number | null;
  }>({ programme: null, peacekeeping: null });
  const details = DATASET_DETAILS[dataset];
  const activeDetails = BLOCK_DETAILS[activeBlock];

  useEffect(() => {
    const selectBlockFromHash = () => {
      if (window.location.hash.startsWith("#pko=")) {
        setActiveBlock("peacekeeping");
      } else if (window.location.hash.startsWith("#secretariat=")) {
        setActiveBlock("programme");
      }
    };

    selectBlockFromHash();
    window.addEventListener("hashchange", selectBlockFromHash);
    window.addEventListener("popstate", selectBlockFromHash);
    return () => {
      window.removeEventListener("hashchange", selectBlockFromHash);
      window.removeEventListener("popstate", selectBlockFromHash);
    };
  }, []);

  const changeDataset = (value: string) => {
    if (value !== "audited" && value !== "ppb") return;
    clearSidebarHash();
    setBlockTotals({ programme: null, peacekeeping: null });
    setDataset(value);
  };

  const recordProgrammeTotal = useCallback((total: number) => {
    setBlockTotals((current) =>
      current.programme === total ? current : { ...current, programme: total },
    );
  }, []);

  const recordPeacekeepingTotal = useCallback((total: number) => {
    setBlockTotals((current) =>
      current.peacekeeping === total
        ? current
        : { ...current, peacekeeping: total },
    );
  }, []);

  const combinedTotal =
    blockTotals.programme !== null && blockTotals.peacekeeping !== null
      ? blockTotals.programme + blockTotals.peacekeeping
      : null;
  const selectorColumns =
    combinedTotal && combinedTotal > 0
      ? `${blockTotals.programme! / combinedTotal}fr ${blockTotals.peacekeeping! / combinedTotal}fr`
      : "1fr 1fr";

  const programmeDataset =
    dataset === "audited" ? "budget-audited-ppb" : "budget-ppb";
  const peacekeepingDataset =
    dataset === "audited" ? "budget-audited-pko" : "budget-pko";

  const selectBlock = (block: BudgetBlock) => {
    if (block === activeBlock) return;
    clearSidebarHash();
    setActiveBlock(block);
  };

  return (
    <div className="w-full">
      <div className="mb-6 border-l-2 border-un-blue bg-gray-50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <label
              id="secretariat-dataset-label"
              className="text-xs font-medium tracking-wide text-gray-500 uppercase"
            >
              Data source
            </label>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">
              {details.description}
            </p>
          </div>

          <Select value={dataset} onValueChange={changeDataset}>
            <SelectTrigger
              aria-labelledby="secretariat-dataset-label"
              className="h-9 w-full shrink-0 border-gray-300 bg-white sm:w-[280px]"
            >
              <SelectValue asChild>
                <span>{details.label}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              className="border-gray-300 bg-white sm:w-[280px]"
              position="popper"
              align="end"
              sideOffset={4}
            >
              <SelectItem value="audited">
                {DATASET_DETAILS.audited.label}
              </SelectItem>
              <SelectItem value="ppb">{DATASET_DETAILS.ppb.label}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          These sources use different scopes and accounting bases. Compare the
          composition within a source; do not treat their totals as directly
          interchangeable.
        </p>
      </div>

      <div>
        <div
          className="grid gap-2 pb-3"
          style={{ gridTemplateColumns: selectorColumns }}
          role="tablist"
          aria-label="Budget"
        >
          {(Object.keys(BLOCK_DETAILS) as BudgetBlock[]).map((block) => {
            const blockDetails = BLOCK_DETAILS[block];
            const selected = block === activeBlock;
            const total = blockTotals[block];

            return (
              <button
                key={block}
                id={`${block}-budget-tab`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${block}-budget-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectBlock(block)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                    return;
                  event.preventDefault();
                  const nextBlock =
                    block === "programme" ? "peacekeeping" : "programme";
                  selectBlock(nextBlock);
                  document.getElementById(`${nextBlock}-budget-tab`)?.focus();
                }}
                className={`relative min-h-24 min-w-0 border px-3 py-4 text-left transition-colors focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-2 focus-visible:outline-none sm:px-5 ${
                  selected
                    ? "z-10 border-un-blue bg-un-blue text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="block text-sm leading-tight font-semibold sm:text-base">
                  {blockDetails.label}
                </span>
                <span
                  className={`mt-1 block text-xl leading-none font-bold sm:text-2xl ${
                    selected ? "text-white" : "text-gray-900"
                  }`}
                >
                  {total === null ? "Loading…" : formatBudget(total)}
                </span>
                {selected && (
                  <span
                    aria-hidden="true"
                    className="absolute top-full left-1/2 -translate-x-1/2 border-x-[12px] border-t-[12px] border-x-transparent border-t-un-blue"
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-2 mb-4 text-sm text-gray-600">
          {activeDetails.description}
        </p>

        <section
          id="programme-budget-panel"
          role="tabpanel"
          aria-labelledby="programme-budget-tab"
          hidden={activeBlock !== "programme"}
        >
          <BudgetTreemap
            key={programmeDataset}
            dataset={programmeDataset}
            hashPrefix={BLOCK_DETAILS.programme.hashPrefix}
            sectionId="secretariat"
            onTotalChange={recordProgrammeTotal}
          />
        </section>

        <section
          id="peacekeeping-budget-panel"
          role="tabpanel"
          aria-labelledby="peacekeeping-budget-tab"
          hidden={activeBlock !== "peacekeeping"}
        >
          <BudgetTreemap
            key={peacekeepingDataset}
            dataset={peacekeepingDataset}
            hashPrefix={BLOCK_DETAILS.peacekeeping.hashPrefix}
            sectionId="secretariat"
            onTotalChange={recordPeacekeepingTotal}
          />
        </section>

        <p className="mt-3 text-xs text-gray-500">
          Box width represents each selected year&apos;s USD total. The budgets
          use different fiscal periods and are not added into a combined total.
        </p>
      </div>
    </div>
  );
}
