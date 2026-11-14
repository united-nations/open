import {
  HierarchicalSingleSelect,
  type HierarchicalGroup,
} from "@/components/ui/hierarchical-single-select";
import { UNCATEGORIZED_SYSTEM_GROUP } from "@/lib/entities";
import { getSystemGroupingStyle } from "@/lib/systemGroupings";
import type { Entity } from "@/types";

export function organizationHierarchyGroups(
  organizations: Iterable<string>,
  metadata: readonly Entity[],
): HierarchicalGroup[] {
  // The active reporting source supplies membership. Metadata supplies labels
  // and categories only.
  const categories = new Map(
    metadata.map(({ entity, system_grouping }) => [entity, system_grouping]),
  );
  const groups = new Map<string, string[]>();
  for (const organization of new Set(organizations)) {
    if (!organization) continue;
    const category = categories.get(organization) || UNCATEGORIZED_SYSTEM_GROUP;
    const members = groups.get(category) ?? [];
    members.push(organization);
    groups.set(category, members);
  }
  return [...groups]
    .map(([category, children]) => ({
      id: `group:${category}`,
      label: category,
      color: getSystemGroupingStyle(category).hexColor,
      children: children.sort((a, b) => a.localeCompare(b)),
    }))
    .sort(
      (a, b) =>
        getSystemGroupingStyle(a.label).order -
          getSystemGroupingStyle(b.label).order ||
        a.label.localeCompare(b.label),
    );
}

export function OrganizationHierarchySelect({
  groups,
  selected,
  onChange,
  allLabel,
}: {
  groups: HierarchicalGroup[];
  selected: string;
  onChange: (selection: string) => void;
  allLabel: string;
}) {
  return (
    <HierarchicalSingleSelect
      groups={[{ id: "all", label: allLabel, children: [] }, ...groups]}
      selected={selected}
      onChange={onChange}
      getLabel={(id) =>
        id === "all"
          ? allLabel
          : (groups.find((group) => group.id === id)?.label ??
            id.replace(/^group:/, ""))
      }
    />
  );
}
