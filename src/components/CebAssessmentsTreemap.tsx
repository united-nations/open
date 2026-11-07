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
  assessmentExclusionNotes,
  CEB_ASSESSMENT_COLORS,
  CEB_ASSESSMENTS_HASH,
  formatAssessmentAmount,
  loadCebAssessments,
  rowsWithAssessments,
  sumAssessments,
} from "@/lib/cebAssessments";
import { formatBudget } from "@/lib/contributors";
import { useYearRanges } from "@/lib/useYearRanges";

const colors = CEB_ASSESSMENT_COLORS;
const priorLabel = "Paid toward earlier years";

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
  const contributors = (data?.contributors ?? []).filter(({ name }) =>
    name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const exclusions = assessmentExclusionNotes(year, contributors);
  const matches = contributors.map((contributor) => {
    const rows = rowsWithAssessments(contributor.rows);
    const entities = assessmentEntities(rows);
    return {
      ...contributor,
      rows,
      ...sumAssessments(rows),
      unknownCurrent: entities.reduce(
        (sum, entity) => sum + entity.unknownCurrent,
        0,
      ),
      paidWithinAssessment: entities.reduce(
        (sum, entity) => sum + entity.paidWithinAssessment,
        0,
      ),
    };
  });
  const totals = sumAssessments(matches.flatMap(({ rows }) => rows));
  const unknown = matches.reduce((sum, match) => sum + match.unknownCurrent, 0);
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
    const darkFillBehindLabel =
      priorFill / layoutValue >= 0.15 &&
      (fill + unknownFill + priorFill) / layoutValue >= 0.9;
    const currentLabel = formatAssessmentAmount(contributor.current);
    const earlierLabel = formatAssessmentAmount(contributor.prior);
    return [
      {
        key: contributor.id,
        label: contributor.name,
        value: assessed,
        layoutValue,
        color: "#fff",
        borderColor: colors.assessed,
        borderWidth: 2,
        borderFraction:
          layoutValue > assessed ? assessed / layoutValue : undefined,
        paleFill: !darkFillBehindLabel,
        textColor: darkFillBehindLabel ? "#fff" : "var(--color-gray-900)",
        valueLabel: formatAssessmentAmount(contributor.assessed),
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
            color: colors.current,
            value: fill,
            valueLabel: currentLabel,
          },
          {
            key: "unknownCurrent",
            label: "Payment status unknown",
            color: colors.unknown,
            value: unknownFill,
          },
          {
            key: "prior",
            label: priorLabel,
            color: colors.prior,
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
            <LegendLabel label="Paid toward this year" color={colors.current} />
            {unknown > 0 && (
              <LegendLabel
                label="Payment status unknown"
                color={colors.unknown}
              />
            )}
            <LegendLabel
              label={priorLabel}
              color={colors.prior}
              selected={showPrior}
              onToggle={() => setShowPrior((current) => !current)}
            />
          </div>
        }
        summaries={[
          {
            key: "assessed",
            label: "Assessments",
            value: formatAssessmentAmount(totals.assessed),
          },
          {
            key: "current",
            label: "Paid toward this year",
            value: formatAssessmentAmount(totals.current),
          },
          ...(unknown > 0
            ? [
                {
                  key: "unknown",
                  label: "Payment status unknown",
                  value: formatBudget(unknown),
                },
              ]
            : []),
          {
            key: "prior",
            label: priorLabel,
            value: formatAssessmentAmount(totals.prior),
          },
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
              total={{
                label: "Assessed",
                value: formatAssessmentAmount(assessed),
              }}
              rows={[
                {
                  label: "Paid toward this year",
                  color: colors.current,
                  value: formatAssessmentAmount(current),
                  share: showShare ? paid / leaf.value : undefined,
                },
                ...(unknownCurrent > 0
                  ? [
                      {
                        label: "Payment status unknown",
                        value: formatBudget(unknownCurrent),
                        color: colors.unknown,
                      },
                    ]
                  : []),
                {
                  label: priorLabel,
                  value: formatAssessmentAmount(prior),
                  color: showPrior ? colors.prior : undefined,
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
                Earlier-year payments can extend beyond the assessment outline.
              </p>
            )}
            {exclusions.map((note) => (
              <p key={note} className="text-sm text-gray-600">
                {note}
              </p>
            ))}
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
