"use client";

import { useCallback, useState } from "react";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { GroupedTreemap } from "@un-eosg/ui/components/grouped-treemap";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { ChartFooter } from "@/components/ChartFooter";
import { YearSlider } from "@/components/YearSlider";
import { SYSTEM_TREEMAP_HEIGHT_CLASS } from "@/components/charts/treemapSizing";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { useYearResource } from "@/hooks/useYearResource";
import {
  assessmentEntities,
  CEB_ASSESSMENTS_HASH,
  loadCebAssessments,
  PRIOR_ASSESSMENT_PAYMENT_COLOR,
  sumAssessments,
  UNKNOWN_ASSESSMENT_PAYMENT_COLOR,
} from "@/lib/cebAssessments";
import { formatBudget } from "@/lib/contributors";
import { FINANCING_INSTRUMENT_COLORS } from "@/lib/financingInstruments";
import { useYearRanges } from "@/lib/useYearRanges";

const color = FINANCING_INSTRUMENT_COLORS.assessed;
const priorLabel = "Paid toward earlier years";

function receiptLabel({
  value,
  partial,
}: ReturnType<typeof sumAssessments>["current"]) {
  if (value === null) return "Unknown";
  return formatBudget(value) + (partial ? " (partial)" : "");
}

export function CebAssessmentsTreemap() {
  const { years, default: defaultYear } = useYearRanges().cebAssessments;
  const [year, setYear] = useState(defaultYear);
  const [query, setQuery] = useState("");
  const [showPrior, setShowPrior] = useState(false);
  const load = useCallback(() => loadCebAssessments(year), [year]);
  const {
    value: data,
    loading,
    error,
  } = useYearResource(String(year), null, false, load, null);
  const contributors = (data?.contributors ?? []).map((contributor) => {
    const entities = assessmentEntities(contributor.rows);
    return {
      ...contributor,
      ...sumAssessments(contributor.rows),
      unknownCurrent: entities.reduce(
        (sum, entity) => sum + entity.unknownCurrent,
        0,
      ),
      paidWithinAssessment: entities.reduce(
        (sum, { assessed, current }) =>
          sum +
          Math.min(
            Math.max(0, assessed.value ?? 0),
            Math.max(0, current.value ?? 0),
          ),
        0,
      ),
    };
  });
  const matches = contributors.filter(({ name }) =>
    name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const totals = sumAssessments(matches.flatMap(({ rows }) => rows));
  const leaves = matches.flatMap((contributor) => {
    const assessed = Math.max(0, contributor.assessed.value ?? 0);
    const priorFill = showPrior ? Math.max(0, contributor.prior.value ?? 0) : 0;
    if (assessed === 0 && priorFill === 0) return [];
    const unknownFill = Math.min(contributor.unknownCurrent, assessed);
    const fill = Math.min(
      contributor.paidWithinAssessment,
      assessed - unknownFill,
    );
    const layoutValue = Math.max(assessed, fill + unknownFill + priorFill);
    const contrast =
      fill / layoutValue >= 0.85 ||
      (priorFill / layoutValue >= 0.15 &&
        (fill + unknownFill + priorFill) / layoutValue >= 0.9);
    const currentLabel = receiptLabel(contributor.current);
    const earlierLabel = receiptLabel(contributor.prior);
    return [
      {
        key: contributor.id,
        label: contributor.name,
        value: assessed,
        layoutValue,
        color: "#fff",
        borderColor: color,
        borderWidth: 2,
        borderFraction:
          layoutValue > assessed ? assessed / layoutValue : undefined,
        paleFill: !contrast,
        textColor: contrast ? "#fff" : "var(--color-gray-900)",
        valueLabel: receiptLabel(contributor.assessed),
        accessibleDescription: [
          fill === 0 ? `Paid toward this year: ${currentLabel}.` : "",
          showPrior && priorFill === 0 ? `${priorLabel}: ${earlierLabel}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
        data: contributor,
        segments: [
          {
            key: "current",
            label: "Paid toward this year",
            color,
            value: fill,
            valueLabel: currentLabel,
          },
          {
            key: "unknownCurrent",
            label: "Payment status unknown",
            color: UNKNOWN_ASSESSMENT_PAYMENT_COLOR,
            value: unknownFill,
          },
          {
            key: "prior",
            label: priorLabel,
            color: PRIOR_ASSESSMENT_PAYMENT_COLOR,
            value: priorFill,
            valueLabel: earlierLabel,
          },
        ],
        onActivate: () =>
          navigateToSidebar(CEB_ASSESSMENTS_HASH, `${contributor.id}@${year}`),
      },
    ];
  });
  return (
    <div aria-busy={loading}>
      <GroupedTreemap
        rows={[{ key: "assessments", label: "Assessments", leaves }]}
        layout={{ leafGap: 1.5 }}
        showRowLabels={false}
        plotClassName={SYSTEM_TREEMAP_HEIGHT_CLASS}
        totalLabel="Assessments"
        secondaryControls={
          <div className="flex max-w-full min-w-0 items-center gap-3 pt-3">
            <div className="shrink-0">
              <YearSlider
                years={years}
                selectedYear={year}
                onChange={setYear}
              />
            </div>
            <div className="w-48 min-w-0">
              <SearchInput
                variant="border-bottom"
                aria-label="Search assessed contributors"
                placeholder="Search assessed contributors…"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                showClear
                onClear={() => setQuery("")}
                className="min-w-0"
              />
            </div>
          </div>
        }
        controls={
          <div className="flex flex-wrap gap-2">
            <LegendLabel label="Paid toward this year" color={color} />
            <LegendLabel
              label="Payment status unknown"
              color={UNKNOWN_ASSESSMENT_PAYMENT_COLOR}
            />
            <LegendLabel
              label={priorLabel}
              color={PRIOR_ASSESSMENT_PAYMENT_COLOR}
              selected={showPrior}
              onToggle={() => setShowPrior((current) => !current)}
            />
          </div>
        }
        summaries={[
          {
            key: "assessed",
            label: "Assessments",
            value: receiptLabel(totals.assessed),
          },
          {
            key: "current",
            label: "Paid toward this year",
            value: receiptLabel(totals.current),
          },
          ...(showPrior
            ? [
                {
                  key: "prior",
                  label: priorLabel,
                  value: receiptLabel(totals.prior),
                },
              ]
            : []),
        ]}
        showLeafValues
        formatValue={formatBudget}
        renderTooltip={({ leaf }) => {
          const contributor = leaf.data;
          if (!contributor) return null;
          const { assessed, current, prior, unknownCurrent } = contributor;
          const paid = current.value;
          const showShare =
            !assessed.partial &&
            !current.partial &&
            paid !== null &&
            paid >= 0 &&
            leaf.value > 0 &&
            paid <= leaf.value;
          return (
            <FinancialTooltip
              title={contributor.name}
              total={{ label: "Assessed", value: receiptLabel(assessed) }}
              rows={[
                {
                  label: "Paid toward this year",
                  color,
                  value: receiptLabel(current),
                  share: showShare ? paid / leaf.value : undefined,
                },
                ...(unknownCurrent > 0
                  ? [
                      {
                        label: "Payment status unknown",
                        value: formatBudget(unknownCurrent),
                        color: UNKNOWN_ASSESSMENT_PAYMENT_COLOR,
                      },
                    ]
                  : []),
                {
                  label: priorLabel,
                  value: receiptLabel(prior),
                  color: showPrior ? PRIOR_ASSESSMENT_PAYMENT_COLOR : undefined,
                },
              ]}
              actionHint="Click to explore details"
            />
          );
        }}
        footer={
          <div className="space-y-2">
            <ChartFooter hint="Click on a contributor to explore details" />
            {showPrior && (
              <p className="text-sm text-gray-600">
                The blue outline marks this year’s assessment. Earlier-year
                payments can extend below it.
              </p>
            )}
          </div>
        }
        emptyContent={
          <div className="flex h-full items-center justify-center text-sm text-gray-600">
            {loading
              ? "Loading assessments…"
              : error
                ? "Assessments could not be loaded."
                : showPrior
                  ? "No positive assessments or earlier-year payments match the search."
                  : "No positive assessments match the search."}
          </div>
        }
      />
    </div>
  );
}
