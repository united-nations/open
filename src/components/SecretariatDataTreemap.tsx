"use client";

import { useCallback, useEffect, useState } from "react";
import { BudgetTreemap } from "@/components/BudgetTreemap";
import { clearSidebarHash } from "@/hooks/useDeepLink";
import { formatBudget } from "@/lib/entities";
import {
  BUDGET_FUNDING_SOURCES,
  FUNDING_SOURCES,
  type BudgetFundingSource,
} from "@/lib/budgetGroupings";

type SecretariatDataset = "audited" | "ppb" | "trust_funds";
type BudgetBlock = "programme" | "peacekeeping";

const FUNDING_FILTER_LABELS: Record<BudgetFundingSource, string> = {
  regular_budget: "Regular budget",
  other_assessed: "Other assessed",
  extrabudgetary: "Extrabudgetary",
};

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
  trust_funds: {
    label: "Individual trust-fund schedules",
    description:
      "Current-period expenses from the audited Schedule of Individual Trust Funds, mapped to Secretariat entities through a reconstructed historical crosswalk. This source is extrabudgetary only.",
  },
};

const BLOCK_DETAILS: Record<
  BudgetBlock,
  {
    label: string;
    description: string;
    hashPrefix: string;
  }
> = {
  programme: {
    label: "Secretariat & Special Political Missions",
    description:
      "Budget parts and sections, with funding sources shown as shades",
    hashPrefix: "secretariat",
  },
  peacekeeping: {
    label: "Peacekeeping",
    description: "Mission budgets and accounts on July–June cycles",
    hashPrefix: "pko",
  },
};

export function SecretariatDataTreemap() {
  const [dataset, setDataset] = useState<SecretariatDataset>("audited");
  const [activeBlock, setActiveBlock] = useState<BudgetBlock>("programme");
  const [activeFundingSources, setActiveFundingSources] = useState<
    BudgetFundingSource[]
  >(["regular_budget", "other_assessed"]);
  const [blockTotals, setBlockTotals] = useState<{
    programme: number | null;
    peacekeeping: number | null;
  }>({ programme: null, peacekeeping: null });
  const details = DATASET_DETAILS[dataset];
  const activeDetails = BLOCK_DETAILS[activeBlock];

  useEffect(() => {
    const selectBlockFromHash = () => {
      if (window.location.hash.startsWith("#trust-fund-entity=")) {
        setDataset("trust_funds");
        setActiveFundingSources(["extrabudgetary"]);
      } else if (window.location.hash.startsWith("#pko=")) {
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

  const changeDataset = (value: SecretariatDataset) => {
    if (value === dataset) return;
    clearSidebarHash();
    setBlockTotals({ programme: null, peacekeeping: null });
    setDataset(value);
    if (value === "trust_funds") {
      setActiveFundingSources(["extrabudgetary"]);
    } else if (dataset === "trust_funds") {
      setActiveFundingSources(["regular_budget", "other_assessed"]);
    }
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
      ? `minmax(8rem, ${blockTotals.programme! / combinedTotal}fr) minmax(8rem, ${blockTotals.peacekeeping! / combinedTotal}fr)`
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

  const toggleFundingSource = (source: BudgetFundingSource) => {
    setActiveFundingSources((current) =>
      current.includes(source)
        ? current.filter((item) => item !== source)
        : BUDGET_FUNDING_SOURCES.filter(
            (item) => item === source || current.includes(item),
          ),
    );
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-labelledby="secretariat-dataset-label"
        >
          <span
            id="secretariat-dataset-label"
            className="mr-2 text-xs font-medium tracking-wide text-gray-500 uppercase"
          >
            Data source
          </span>
          <div className="inline-flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
            {(Object.keys(DATASET_DETAILS) as SecretariatDataset[]).map(
              (source) => (
                <button
                  key={source}
                  type="button"
                  aria-pressed={dataset === source}
                  onClick={() => changeDataset(source)}
                  className={`rounded px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none ${
                    dataset === source
                      ? "bg-white font-medium text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {DATASET_DETAILS[source].label}
                </button>
              ),
            )}
          </div>
        </div>

        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-gray-700">
          {details.description}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          These sources use different scopes and accounting bases. Compare the
          composition within a source; do not treat their totals as directly
          interchangeable.
        </p>
      </div>

      <div>
        <div
          className="mb-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Funding sources"
        >
          {BUDGET_FUNDING_SOURCES.map((source) => {
            const active = activeFundingSources.includes(source);
            const disabled =
              dataset === "trust_funds" && source !== "extrabudgetary";
            return (
              <button
                key={source}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                title={FUNDING_SOURCES[source].tooltip}
                onClick={() => toggleFundingSource(source)}
                className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-2 focus-visible:outline-none ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"} ${
                  active
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-white text-gray-400 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-600"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${FUNDING_SOURCES[source].color} ${active ? "opacity-100" : "opacity-40"}`}
                />
                <span>{FUNDING_FILTER_LABELS[source]}</span>
              </button>
            );
          })}
        </div>

        {dataset !== "trust_funds" && (
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
                    className={`mt-3 block text-xl leading-none font-bold sm:text-2xl ${
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
        )}

        {dataset !== "trust_funds" && (
          <p className="mt-2 mb-4 text-sm text-gray-600">
            {activeDetails.description}
          </p>
        )}

        {dataset === "trust_funds" ? (
          <section>
            <BudgetTreemap
              key="budget-trust-funds"
              dataset="budget-trust-funds"
              hashPrefix="trust-fund-entity"
              sectionId="budget"
              activeFundingSources={activeFundingSources}
            />
          </section>
        ) : (
          <>
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
                sectionId="budget"
                activeFundingSources={activeFundingSources}
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
                sectionId="budget"
                activeFundingSources={activeFundingSources}
                onTotalChange={recordPeacekeepingTotal}
              />
            </section>
          </>
        )}

        <p className="mt-3 text-xs text-gray-500">
          Box width represents the selected funding sources in each selected
          year. A minimum width keeps a zero-value budget selectable. The
          sources use different scopes and are not added into a combined total.
        </p>
      </div>
    </div>
  );
}
