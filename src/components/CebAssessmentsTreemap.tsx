"use client";

import { useCallback, useState } from "react";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { GroupedTreemap } from "@un-eosg/ui/components/grouped-treemap";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { formatAssessmentRate } from "@un-eosg/ui/format-budget";
import { ChartFooter } from "@/components/ChartFooter";
import { YearSlider } from "@/components/YearSlider";
import { SYSTEM_TREEMAP_HEIGHT_CLASS } from "@/components/charts/treemapSizing";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { useYearResource } from "@/hooks/useYearResource";
import {
  assessmentOrganizationGroups,
  assessmentTotals,
  assessmentExclusionNotes,
  assessmentMeasures,
  CEB_ASSESSMENT_COLORS,
  CEB_ASSESSMENTS_HASH,
  formatAssessmentAmount,
  loadCebAssessments,
} from "@/lib/cebAssessments";
import { formatBudget } from "@/lib/contributors";
import { useYearRanges } from "@/lib/useYearRanges";

const colors = CEB_ASSESSMENT_COLORS;

export function CebAssessmentsTreemap() {
  const { years, default: defaultYear } = useYearRanges().cebAssessments;
  const [year, setYear] = useState(defaultYear);
  const [view, setView] = useState<"contributors" | "organizations">(
    "contributors",
  );
  const [queries, setQueries] = useState({
    contributors: "",
    organizations: "",
  });
  const [showCurrent, setShowCurrent] = useState(true);
  const [showPrior, setShowPrior] = useState(true);
  const query = queries[view];
  const setQuery = (value: string) =>
    setQueries((current) => ({ ...current, [view]: value }));
  const searchLabel =
    view === "organizations" ? "Search organizations" : "Search member states";
  const measures = assessmentMeasures(year);
  const load = useCallback(() => loadCebAssessments(year), [year]);
  const {
    value: data,
    loading,
    error,
  } = useYearResource(String(year), null, false, load, null);
  const organizationView = view === "organizations";
  const groups = organizationView
    ? assessmentOrganizationGroups(data?.contributors ?? [])
    : (data?.contributors ?? []).map((contributor) => ({
        id: contributor.id,
        name: contributor.name,
        contributors: [contributor],
      }));
  const searchTerm = query.trim().toLocaleLowerCase();
  const matches = groups
    .filter(({ name }) => name.toLocaleLowerCase().includes(searchTerm))
    .map((group) => ({ ...group, ...assessmentTotals(group.contributors) }));
  const contributors = matches.flatMap((group) => group.contributors);
  const exclusions = assessmentExclusionNotes(year, contributors);
  const totals = assessmentTotals(contributors);
  const unknown = totals.unknownCurrent;
  const leaves = matches.flatMap((contributor) => {
    const assessed = Math.max(0, contributor.assessed.value ?? 0);
    const priorFill = showPrior ? Math.max(0, contributor.prior.value ?? 0) : 0;
    if (assessed === 0 && priorFill === 0) return [];
    const unknownFill = Math.min(contributor.unknownCurrent, assessed);
    const fill = showCurrent
      ? Math.min(contributor.paidWithinAssessment, assessed - unknownFill)
      : 0;
    const layoutValue = Math.max(assessed, fill + unknownFill + priorFill);
    const darkFillBehindLabel = fill / layoutValue >= 0.85;
    const currentAmount = formatAssessmentAmount(contributor.current);
    const priorAmount = formatAssessmentAmount(contributor.prior);
    const assessedAmount = formatAssessmentAmount(contributor.assessed);
    const paid = contributor.current.value;
    const valueLabel =
      showCurrent && assessed > 0 && paid !== null && paid >= 0
        ? `${formatAssessmentRate((paid / assessed) * 100)} of ${assessedAmount} ${contributor.current.partial ? "reported paid" : "paid"} in ${year} towards ${year}`
        : `${assessedAmount} assessed`;
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
        valueLabel,
        listValueLabel: assessedAmount,
        listNote: showPrior
          ? `${valueLabel}. ${measures.prior.label}: ${priorAmount}.`
          : valueLabel,
        accessibleDescription: [
          showCurrent && fill === 0
            ? `${measures.current.label}: ${currentAmount}.`
            : "",
          showPrior && priorFill === 0
            ? `${measures.prior.label}: ${priorAmount}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
        data: contributor,
        segments: [
          {
            key: "current",
            label: measures.current.label,
            color: colors.current,
            value: fill,
            valueLabel: currentAmount,
          },
          {
            key: "unknownCurrent",
            label: "Payment status unknown",
            color: colors.unknown,
            value: unknownFill,
          },
          {
            key: "prior",
            label: measures.prior.label,
            color: colors.prior,
            value: priorFill,
            valueLabel: priorAmount,
          },
        ],
        onActivate: () =>
          navigateToSidebar(
            organizationView ? "entity" : CEB_ASSESSMENTS_HASH,
            `${contributor.id}@${year}`,
          ),
      },
    ];
  });
  return (
    <div aria-busy={loading}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <SegmentedControl
          label="Group assessments by"
          options={[
            { value: "contributors", label: "By member state" },
            { value: "organizations", label: "By organization" },
          ]}
          value={view}
          onValueChange={(value) =>
            setView(
              value === "organizations" ? "organizations" : "contributors",
            )
          }
        />
        <div className="max-sm:[&_[role=slider]]:hidden">
          <YearSlider years={years} selectedYear={year} onChange={setYear} />
        </div>
      </div>
      <div
        role="group"
        aria-label="Assessment measures"
        className="mb-3 flex flex-wrap gap-2"
      >
        <LegendLabel
          {...measures.assessed}
          label={`${measures.assessed.label} in ${year}`}
          color={colors.assessed}
          marker={
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 border-2"
              style={{ borderColor: colors.assessed }}
            />
          }
        />
        <LegendLabel
          {...measures.current}
          color={colors.current}
          selected={showCurrent}
          onToggle={() => setShowCurrent((current) => !current)}
        />
        {unknown > 0 && (
          <LegendLabel label="Payment status unknown" color={colors.unknown} />
        )}
        <LegendLabel
          {...measures.prior}
          color={colors.prior}
          selected={showPrior}
          onToggle={() => setShowPrior((current) => !current)}
        />
      </div>
      <GroupedTreemap
        rows={[{ key: "assessments", label: "Assessments", leaves }]}
        layout={{ leafGap: 1.5 }}
        showRowLabels={false}
        plotClassName={SYSTEM_TREEMAP_HEIGHT_CLASS}
        totalLabel={measures.assessed.label}
        controlsClassName="sm:min-w-[19.5rem]"
        controls={
          <div className="min-w-0 flex-1 sm:flex-none">
            <SearchInput
              variant="border-bottom"
              aria-label={searchLabel}
              placeholder="Search…"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              showClear
              onClear={() => setQuery("")}
              className="h-11 w-full text-base sm:h-9 sm:w-48 sm:text-sm"
            />
          </div>
        }
        summaries={[
          {
            key: "assessed",
            label: "Assessments payable",
            value: formatAssessmentAmount(totals.assessed),
          },
          {
            key: "current",
            label: `Paid towards ${year}`,
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
            label: "Paid towards earlier years",
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
                label: measures.assessed.label,
                value: formatAssessmentAmount(assessed),
              }}
              rows={[
                {
                  label: measures.current.label,
                  color: showCurrent ? colors.current : undefined,
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
                  label: measures.prior.label,
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
            <ChartFooter
              hint={`Click on ${organizationView ? "an organization" : "a contributor"} to explore details`}
            />
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
