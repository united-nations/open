"use client";

import { useState } from "react";
import { ChartFrame } from "@un-eosg/ui/components/chart-frame";
import { ChartHeader } from "@un-eosg/ui/components/chart-header";
import { LegendLabel } from "@un-eosg/ui/components/legend-label";
import { BinaryToggle } from "@un-eosg/ui/components/binary-toggle";
import { ChartHeading } from "@/components/ContentHeading";
import { PersonnelOrganizationSelect } from "@/components/PersonnelOrganizationSelect";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatPeople,
  PERSONNEL_SEX,
  personnelGradeGroups,
  personnelSexTotals,
  personnelPyramidScale,
  personnelPyramidWidths,
  type PersonnelData,
  type PersonnelSexTotals,
} from "@/lib/personnel";

const percent = (count: number, total: number) =>
  total > 0 ? `${((100 * count) / total).toFixed(1)}%` : "Unavailable";

interface GenderRow extends PersonnelSexTotals {
  key: string;
  label: string;
}

function genderAria(row: GenderRow, pyramid = false) {
  return `${row.label}: ${formatPeople(row.total)} staff in total. ${PERSONNEL_SEX.map((sex) => `${sex.label}${pyramid && sex.key === "female" ? " to the left" : pyramid && sex.key === "male" ? " to the right" : ""}: ${formatPeople(row[sex.key])} (${percent(row[sex.key], row.total)})`).join("; ")}.`;
}

function GenderTooltip({ row }: { row: GenderRow }) {
  return (
    <TooltipContent className="max-w-sm border border-gray-200 bg-white p-3 text-gray-900 shadow-lg">
      <p className="mb-2 font-semibold">
        {row.label} · {formatPeople(row.total)} staff
      </p>
      {PERSONNEL_SEX.map((sex) => (
        <p key={sex.key} className="flex justify-between gap-6">
          <span>{sex.label}</span>
          <span className="tabular-nums">
            {formatPeople(row[sex.key])} · {percent(row[sex.key], row.total)}
          </span>
        </p>
      ))}
    </TooltipContent>
  );
}

function GenderLegend() {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Sex as reported by CEB"
    >
      {PERSONNEL_SEX.map((sex) => (
        <LegendLabel
          key={sex.key}
          label={sex.label}
          color={sex.color}
          variant="pill"
        />
      ))}
    </div>
  );
}

function GenderBar({
  row,
  max,
  relative = true,
  selected = false,
}: {
  row: GenderRow;
  max?: number;
  relative?: boolean;
  selected?: boolean;
}) {
  const denominator = relative ? row.total : (max ?? row.total);
  return (
    <div
      className={`grid grid-cols-[7rem_minmax(0,1fr)_4rem] items-center gap-2 py-0.5 sm:grid-cols-[10rem_minmax(0,1fr)_5rem] sm:gap-3 ${selected ? "bg-sky-50" : ""}`}
      data-personnel-row={row.key}
    >
      <span className="text-xs break-words sm:text-sm">{row.label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            role="img"
            aria-label={genderAria(row)}
            className="relative flex h-2 min-w-0 overflow-hidden rounded-full bg-gray-50 outline-offset-2 focus-visible:outline-2 focus-visible:outline-un-blue"
          >
            <div
              className="flex h-full overflow-hidden rounded-full"
              style={{
                width: `${denominator > 0 ? (100 * row.total) / denominator : 0}%`,
              }}
            >
              {PERSONNEL_SEX.map((sex) => (
                <span
                  key={sex.key}
                  className="block h-full min-w-0"
                  data-personnel-sex={sex.key}
                  style={{
                    width: `${row.total > 0 ? (100 * row[sex.key]) / row.total : 0}%`,
                    backgroundColor: sex.color,
                  }}
                />
              ))}
            </div>
            {relative && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 left-1/2 border-l border-dashed border-gray-800"
              />
            )}
          </div>
        </TooltipTrigger>
        <GenderTooltip row={row} />
      </Tooltip>
      <span className="text-right text-xs text-gray-600 tabular-nums sm:text-sm">
        {formatPeople(row.total)}
      </span>
    </div>
  );
}

function PyramidBar({
  row,
  maximum,
  selected = false,
}: {
  row: GenderRow;
  maximum: number;
  selected?: boolean;
}) {
  const widths = personnelPyramidWidths(row, maximum);
  return (
    <div
      className={`grid grid-cols-[7rem_minmax(0,1fr)_4rem] items-center gap-2 py-0.5 sm:grid-cols-[10rem_minmax(0,1fr)_5rem] sm:gap-3 ${selected ? "bg-sky-50" : ""}`}
      data-personnel-row={row.key}
    >
      <span className="text-xs break-words sm:text-sm">{row.label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            role="img"
            aria-label={genderAria(row, true)}
            className="min-w-0 outline-offset-2 focus-visible:outline-2 focus-visible:outline-un-blue"
          >
            <div
              className="relative h-2 overflow-hidden rounded-full bg-gray-50"
              data-pyramid-maximum={maximum}
            >
              <span
                className="absolute inset-y-0 right-1/2 rounded-l-full bg-un-blue"
                style={{
                  width: `${widths.female}%`,
                }}
                data-pyramid-sex="female"
                data-count={row.female}
              />
              <span
                className="absolute inset-y-0 left-1/2 rounded-r-full"
                style={{
                  width: `${widths.male}%`,
                  backgroundColor: PERSONNEL_SEX[1].color,
                }}
                data-pyramid-sex="male"
                data-count={row.male}
              />
              <span
                className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-gray-700"
                aria-hidden="true"
              />
            </div>
            {row.unknown > 0 && (
              <div className="mt-0.5" data-pyramid-unknown={row.unknown}>
                <span className="block text-xs text-gray-600">
                  Not reported: {formatPeople(row.unknown)}
                </span>
                <div className="h-1 overflow-hidden rounded-full bg-gray-50">
                  <span
                    className="block h-full rounded-full bg-gray-400"
                    style={{ width: `${widths.unknown}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <GenderTooltip row={row} />
      </Tooltip>
      <span className="text-right text-xs text-gray-600 tabular-nums sm:text-sm">
        {formatPeople(row.total)}
      </span>
    </div>
  );
}

function CategoryHeader({
  label,
  relative,
}: {
  label: string;
  relative: boolean;
}) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)_4rem] items-end gap-2 self-end border-b border-gray-200 pb-1 sm:grid-cols-[10rem_minmax(0,1fr)_5rem] sm:gap-3">
      <h3 className="text-xs font-medium text-gray-700">{label}</h3>
      <div className="flex justify-between text-xs text-gray-500">
        {relative ? (
          <>
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </>
        ) : (
          <>
            <span>Women</span>
            <span>Men</span>
          </>
        )}
      </div>
      <span className="text-right text-xs text-gray-500">Staff</span>
    </div>
  );
}

function GenderMeasure({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <BinaryToggle
      variant="segmented"
      label={label}
      options={[
        { value: "relative", label: "Relative" },
        { value: "absolute", label: "Absolute" },
      ]}
      value={value}
      onValueChange={onChange}
    />
  );
}

function ExpandRows({
  expanded,
  onToggle,
  label,
  previewCount,
  total,
  controls,
}: {
  expanded: boolean;
  onToggle: () => void;
  label: string;
  previewCount: number;
  total: number;
  controls: string;
}) {
  if (total <= previewCount) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={controls}
        onClick={onToggle}
        className="cursor-pointer text-xs text-gray-600 underline underline-offset-2 hover:text-un-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue"
      >
        {expanded ? `Show fewer ${label}` : `Show all ${label}`}
      </button>
      <span>
        {expanded ? total : previewCount} of {total} {label}
      </span>
    </div>
  );
}

export function PersonnelGenderCharts({ data }: { data: PersonnelData }) {
  const [gradeOrg, setGradeOrg] = useState("all");
  const [comparisonOrg, setComparisonOrg] = useState("all");
  const organizations = data.organizations.map((item) => item.org);
  const [sort, setSort] = useState("name");
  const [gradeMeasure, setGradeMeasure] = useState("absolute");
  const [orgMeasure, setOrgMeasure] = useState("absolute");
  const [allGrades, setAllGrades] = useState(false);
  const [allOrganizations, setAllOrganizations] = useState(false);
  const records = data.composition.filter(
    (record) => gradeOrg === "all" || record.org === gradeOrg,
  );
  const groups = personnelGradeGroups(records);
  const gradeRows = groups.flatMap((group) => group.rows);
  const gradeMaximum = personnelPyramidScale(gradeRows);
  const previewGrades = 8;
  const displayedGroups = groups
    .map((group, index) => ({
      ...group,
      rows: allGrades
        ? group.rows
        : group.rows.slice(
            0,
            Math.max(
              0,
              previewGrades -
                groups
                  .slice(0, index)
                  .reduce((sum, preceding) => sum + preceding.rows.length, 0),
            ),
          ),
    }))
    .filter((group) => group.rows.length > 0);
  const organizationRows = data.organizations
    .filter(
      (organization) =>
        comparisonOrg === "all" || organization.org === comparisonOrg,
    )
    .map((organization) => ({
      key: organization.org,
      label: organization.org,
      ...personnelSexTotals(
        data.composition.filter((record) => record.org === organization.org),
      ),
    }))
    .sort((a, b) =>
      sort === "share"
        ? (b.total ? b.female / b.total : -1) -
            (a.total ? a.female / a.total : -1) ||
          a.label.localeCompare(b.label)
        : a.label.localeCompare(b.label),
    );
  const organizationMaximum = personnelPyramidScale(organizationRows);
  const displayedOrganizations = allOrganizations
    ? organizationRows
    : organizationRows.slice(0, 8);
  return (
    <div className="grid items-start gap-x-8 gap-y-2 lg:grid-cols-2">
      <section
        className="grid min-w-0 gap-y-2 lg:row-span-5 lg:grid-rows-subgrid"
        id="personnel-gender-grade"
      >
        <ChartHeading>Gender balance by grade</ChartHeading>
        <ChartFrame className="contents [&>div]:contents">
          <ChartHeader
            controlsClassName="basis-full"
            controls={
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <PersonnelOrganizationSelect
                  organizations={organizations}
                  value={gradeOrg}
                  onChange={setGradeOrg}
                  label="Organization for grade balance"
                />
                <GenderMeasure
                  value={gradeMeasure}
                  onChange={setGradeMeasure}
                  label="Grade gender measure"
                />
              </div>
            }
          />
          <GenderLegend />
          <CategoryHeader
            label={displayedGroups[0]?.category ?? "Grade"}
            relative={gradeMeasure === "relative"}
          />
          <div id="personnel-grade-rows">
            {groups.length ? (
              displayedGroups.map((group, index) => (
                <div key={group.category} className="mb-4 last:mb-0">
                  {index > 0 && (
                    <CategoryHeader
                      label={group.category}
                      relative={gradeMeasure === "relative"}
                    />
                  )}
                  {group.rows.map((row) =>
                    gradeMeasure === "relative" ? (
                      <GenderBar key={row.key} row={row} />
                    ) : (
                      <PyramidBar
                        key={row.key}
                        row={row}
                        maximum={gradeMaximum}
                      />
                    ),
                  )}
                </div>
              ))
            ) : (
              <p className="py-6 text-sm text-gray-600">
                No grade and gender records are available for this selection.
              </p>
            )}
            <ExpandRows
              expanded={allGrades}
              onToggle={() => setAllGrades((value) => !value)}
              label="grades"
              previewCount={previewGrades}
              total={gradeRows.length}
              controls="personnel-grade-rows"
            />
          </div>
        </ChartFrame>
      </section>
      <section
        className="grid min-w-0 gap-y-2 lg:row-span-5 lg:grid-rows-subgrid"
        id="personnel-gender-organization"
      >
        <ChartHeading>Gender balance by organization</ChartHeading>
        <ChartFrame className="contents [&>div]:contents">
          <ChartHeader
            controlsClassName="basis-full"
            controls={
              <div className="flex flex-wrap items-center gap-3">
                <PersonnelOrganizationSelect
                  organizations={organizations}
                  value={comparisonOrg}
                  onChange={setComparisonOrg}
                  label="Organization for organization balance"
                />
                <GenderMeasure
                  value={orgMeasure}
                  onChange={setOrgMeasure}
                  label="Organization gender measure"
                />
                <BinaryToggle
                  variant="segmented"
                  label="Organization order"
                  options={[
                    { value: "name", label: "A–Z" },
                    { value: "share", label: "Women’s share" },
                  ]}
                  value={sort}
                  onValueChange={setSort}
                />
              </div>
            }
          />
          <GenderLegend />
          <CategoryHeader
            label={"Organization"}
            relative={orgMeasure === "relative"}
          />
          <div id="personnel-organization-rows">
            {displayedOrganizations.length ? (
              displayedOrganizations.map((row) =>
                orgMeasure === "relative" ? (
                  <GenderBar
                    key={row.key}
                    row={row}
                    selected={row.key === comparisonOrg}
                  />
                ) : (
                  <PyramidBar
                    key={row.key}
                    row={row}
                    maximum={organizationMaximum}
                    selected={row.key === comparisonOrg}
                  />
                ),
              )
            ) : (
              <p className="py-6 text-sm text-gray-600">
                No organization and gender records are available for this
                selection.
              </p>
            )}
            <ExpandRows
              expanded={allOrganizations}
              onToggle={() => setAllOrganizations((value) => !value)}
              label="organizations"
              previewCount={8}
              total={organizationRows.length}
              controls="personnel-organization-rows"
            />
          </div>
        </ChartFrame>
      </section>
    </div>
  );
}

function bandOrder(label: string) {
  if (label === "NA" || label === "Not reported")
    return Number.POSITIVE_INFINITY;
  if (label.startsWith("under")) return -1;
  return Number(label.match(/\d+/)?.[0] ?? Number.POSITIVE_INFINITY);
}

export function PersonnelAgeTenureCharts({ data }: { data: PersonnelData }) {
  const charts = [
    {
      key: "ageBand" as const,
      id: "personnel-age",
      title: "Age of the workforce",
    },
    {
      key: "tenureBand" as const,
      id: "personnel-tenure",
      title: "Length of service",
    },
  ];
  return (
    <div className="space-y-3">
      <div className="grid items-start gap-x-8 gap-y-3 lg:grid-cols-2">
        {charts.map((chart) => {
          const labels = [
            ...new Set(data.ageTenure.map((row) => row[chart.key])),
          ].sort((a, b) => bandOrder(a) - bandOrder(b) || a.localeCompare(b));
          const rows = labels.map((label) => ({
            key: label,
            label: label === "NA" ? "Not reported" : label,
            ...personnelSexTotals(
              data.ageTenure.filter((record) => record[chart.key] === label),
            ),
          }));
          const max = Math.max(1, ...rows.map((row) => row.total));
          return (
            <section
              key={chart.key}
              id={chart.id}
              className="grid min-w-0 gap-y-3 lg:row-span-3 lg:grid-rows-subgrid"
            >
              <ChartHeading>{chart.title}</ChartHeading>
              <ChartFrame className="contents [&>div]:contents">
                <GenderLegend />
                <div>
                  {rows.map((row) => (
                    <GenderBar
                      key={row.key}
                      row={row}
                      max={max}
                      relative={false}
                    />
                  ))}
                </div>
              </ChartFrame>
            </section>
          );
        })}
      </div>
    </div>
  );
}
