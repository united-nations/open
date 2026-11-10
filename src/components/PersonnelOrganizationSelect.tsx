"use client";

import { FinancialFlowColumnSelect } from "@/components/FinancialFlowColumnSelect";

/** Shared presentation; each personnel chart owns its organization selection. */
export function PersonnelOrganizationSelect({
  organizations,
  value,
  onChange,
  label,
}: {
  organizations: readonly string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const available = new Set(organizations);
  const options = [
    ...new Set([...organizations, ...(value !== "all" ? [value] : [])]),
  ].sort((a, b) => a.localeCompare(b));
  return (
    <FinancialFlowColumnSelect
      label={label}
      value={value}
      onChange={onChange}
      options={[
        { value: "all", label: "All organizations" },
        ...options.map((organization) => ({
          value: organization,
          label: available.has(organization)
            ? organization
            : `${organization} (unavailable)`,
          disabled: !available.has(organization),
        })),
      ]}
    />
  );
}
