import type {
  SecretariatEntitiesData,
  SecretariatGroup,
  SecretariatMissionLocation,
  SecretariatOverviewData,
} from "@/types";

export type MappedMissionGroup = Extract<SecretariatGroup, "spm" | "pko">;

/** Use the annual financial taxonomy for both the bar and its map selection. */
export function buildFieldMissionModel(
  overview: SecretariatOverviewData,
  geography: SecretariatEntitiesData,
  kinds: readonly MappedMissionGroup[],
) {
  const groups = overview.meta.groups;
  const orderedGroups = (Object.keys(groups) as SecretariatGroup[]).sort(
    (a, b) => groups[a].order - groups[b].order,
  );
  const totals = Object.fromEntries(
    orderedGroups.map((group) => [group, 0]),
  ) as Record<SecretariatGroup, number>;
  const byLocation = new Map<string, Map<SecretariatGroup, number>>();
  for (const entity of overview.entities) {
    totals[entity.group] += entity.total;
    const code = geography.aliases[entity.code] ?? entity.code;
    const amounts = byLocation.get(code) ?? new Map<SecretariatGroup, number>();
    amounts.set(entity.group, (amounts.get(entity.group) ?? 0) + entity.total);
    byLocation.set(code, amounts);
  }

  const locatedMissions: {
    location: SecretariatMissionLocation;
    amount: number;
    group: MappedMissionGroup;
  }[] = [];
  for (const location of geography.locations) {
    // The geography crosswalk identifies map eligibility and position. Its
    // legacy group labels must not override the selected year's financial group.
    if (location.kind === "support") continue;
    for (const group of kinds) {
      const amount = byLocation.get(location.code)?.get(group);
      if (amount !== undefined && amount > 0) {
        locatedMissions.push({ location, amount, group });
      }
    }
  }
  locatedMissions.sort(
    (a, b) =>
      b.amount - a.amount || a.location.code.localeCompare(b.location.code),
  );

  // Match the stacked bar's positive-area denominator, preserving signed
  // expenditure separately in totals. Anchors follow its actual sorted groups.
  const positiveTotal = orderedGroups.reduce(
    (sum, group) => sum + Math.max(0, totals[group]),
    0,
  );
  const missionGroups = orderedGroups.filter(
    (group): group is MappedMissionGroup =>
      kinds.includes(group as MappedMissionGroup),
  );
  const missionTotal = missionGroups.reduce(
    (sum, group) => sum + Math.max(0, totals[group]),
    0,
  );
  let topOffset = 0;
  let expandedOffset = 0;
  const connectors = [];
  for (const group of orderedGroups) {
    const share =
      positiveTotal > 0
        ? (Math.max(0, totals[group]) / positiveTotal) * 100
        : 0;
    if (
      missionGroups.includes(group as MappedMissionGroup) &&
      missionTotal > 0
    ) {
      const expandedShare = (Math.max(0, totals[group]) / missionTotal) * 100;
      connectors.push({
        group,
        start: topOffset,
        end: topOffset + share,
        expandedStart: expandedOffset,
        expandedEnd: expandedOffset + expandedShare,
      });
      expandedOffset += expandedShare;
    }
    topOffset += share;
  }
  return { groups, totals, locatedMissions, connectors };
}
