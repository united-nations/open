"use client";

import { useCallback, useState } from "react";
import { FinancialTooltip } from "@un-eosg/ui/components/financial-tooltip";
import { GroupedTreemap } from "@un-eosg/ui/components/grouped-treemap";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import { SearchInput } from "@un-eosg/ui/components/search-input";
import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";
import { formatPercent } from "@un-eosg/ui/format-budget";
import { YearSlider } from "@/components/YearSlider";
import { SYSTEM_TREEMAP_HEIGHT_CLASS } from "@/components/charts/treemapSizing";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import { useYearResource } from "@/hooks/useYearResource";
import {
  ASSESSMENT_ORGANIZATIONS_WITHOUT_ROWS,
  assessmentCoverageNotes,
  assessmentExcludedOrganizations,
  assessmentOrganizationGroups,
  assessmentTotals,
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
    view === "organizations" ? "Search organizations" : "Search contributors";
  const measures = assessmentMeasures(year);
  const load = useCallback(() => loadCebAssessments(year), [year]);
  const {
    value: data,
    loading,
    error,
  } = useYearResource(String(year), null, false, load, null);
  const sourceContributors = data?.contributors ?? [];
  const organizationView = view === "organizations";
  const groups = organizationView
    ? assessmentOrganizationGroups(sourceContributors)
    : sourceContributors.map((contributor) => ({
        id: contributor.id,
        name: contributor.name,
        contributors: [contributor],
      }));
  const searchTerm = query.trim().toLocaleLowerCase();
  const matches = groups
    .filter(({ name }) => name.toLocaleLowerCase().includes(searchTerm))
    .map((group) => ({ ...group, ...assessmentTotals(group.contributors) }));
  const contributors = matches.flatMap((group) => group.contributors);
  const sourceRows = sourceContributors.flatMap(({ rows }) => rows);
  const coverageNotes = assessmentCoverageNotes(year, sourceRows);
  const absent = ASSESSMENT_ORGANIZATIONS_WITHOUT_ROWS[year];
  const organizationCount = new Set(sourceRows.map(([entity]) => entity)).size;
  const totals = assessmentTotals(contributors);
  const unknown = totals.unknownCurrent;
  const open = (id: string) =>
    navigateToSidebar(
      organizationView ? "entity" : CEB_ASSESSMENTS_HASH,
      `${id}@${year}`,
    );
  const hasArea = (group: (typeof matches)[number]) =>
    (group.assessed.value ?? 0) > 0 ||
    (showPrior && (group.prior.value ?? 0) > 0);
  const leaves = matches.filter(hasArea).map((contributor) => {
    const assessed = Math.max(0, contributor.assessed.value ?? 0);
    const priorFill = showPrior ? Math.max(0, contributor.prior.value ?? 0) : 0;
    const unknownFill = Math.min(contributor.unknownCurrent, assessed);
    const fill = showCurrent
      ? Math.min(contributor.paidWithinAssessment, assessed - unknownFill)
      : 0;
    const layoutValue = Math.max(assessed, fill + unknownFill + priorFill);
    const darkFillBehindLabel = fill > 0;
    const currentAmount = formatAssessmentAmount(contributor.current);
    const priorAmount = formatAssessmentAmount(contributor.prior);
    const assessedAmount = formatAssessmentAmount(contributor.assessed);
    const paid = contributor.current.value;
    const showRate =
      showCurrent &&
      assessed > 0 &&
      !contributor.assessed.partial &&
      !contributor.current.partial &&
      paid !== null &&
      paid >= 0;
    const valueLabel = showRate
      ? `${formatPercent((paid / assessed) * 100)} of ${assessedAmount} paid in ${year} towards ${year}`
      : contributor.assessed.value === null
        ? "Assessment unknown"
        : `${assessedAmount} assessed`;
    return {
      key: contributor.id,
      label: contributor.name,
      value: assessed,
      layoutValue,
      color: "#fff",
      borderColor: colors.assessed,
      borderWidth: 2,
      borderFraction:
        layoutValue > assessed ? assessed / layoutValue : undefined,
      paleFill: fill < layoutValue,
      textColor: darkFillBehindLabel ? "#fff" : "var(--color-gray-900)",
      valueLabel,
      listValueLabel: assessedAmount,
      listNote: [
        valueLabel,
        ...(showCurrent && !showRate
          ? [`${measures.current.label}: ${currentAmount}`]
          : []),
        ...(showPrior ? [`${measures.prior.label}: ${priorAmount}`] : []),
      ].join(". "),
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
      onActivate: () => open(contributor.id),
    };
  });
  return (
    <div aria-busy={loading}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <SegmentedControl
          label="Group assessments by"
          options={[
            { value: "contributors", label: "By contributor" },
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
        additionalListItems={matches
          .filter((group) => !hasArea(group))
          .map((group) => ({
            id: group.id,
            label: group.name,
            amount: group.assessed.value ?? 0,
            value: formatAssessmentAmount(group.assessed),
            description: [
              ...(showCurrent
                ? [
                    `${measures.current.label}: ${formatAssessmentAmount(group.current)}`,
                  ]
                : []),
              ...(showPrior
                ? [
                    `${measures.prior.label}: ${formatAssessmentAmount(group.prior)}`,
                  ]
                : []),
            ].join(". "),
            onOpen: () => open(group.id),
          }))}
        layout={{ leafGap: 1.5 }}
        showRowLabels={false}
        // Reverse decorative fills only; keep tooltips in measure order. The
        // fractional assessment outline follows the fill up from the bottom.
        plotClassName={`${SYSTEM_TREEMAP_HEIGHT_CLASS} [&_[aria-hidden].flex-col]:flex-col-reverse [&_[aria-hidden][style*='box-shadow'][style*='height']]:top-auto [&_button:not([style*='--color-gray-900'])]:[text-shadow:0_1px_2px_rgba(0,0,0,.85),0_0_1px_rgba(0,0,0,.85)]`}
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
            {data && (
              <p className="text-sm text-gray-600">
                This view covers {organizationCount} organizations in {year}.
                Coverage varies by year. Totals include all reported amounts for
                included organizations and are marked partial if some amounts
                are missing. Same-year payments need an assessed amount to
                appear in a tile. The List view also includes records without
                drawable area.
              </p>
            )}
            {data && absent && (
              <p className="text-sm text-gray-600">
                Absent from the {year} annual assessments and payments data
                among organizations covered in 2020–2025: {absent.join(", ")}.
              </p>
            )}
            {data && (
              <p className="text-sm text-gray-600">
                Excluded from this view because payment data is unavailable:{" "}
                {assessmentExcludedOrganizations(year).join(", ")}.
              </p>
            )}
            {coverageNotes.map((note) => (
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
