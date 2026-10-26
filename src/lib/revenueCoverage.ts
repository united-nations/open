import coverage from "../../public/data/revenue-coverage.json";

interface RevenueCoverage {
  controls: boolean;
  government: boolean;
  nonGovernment: boolean;
  note: string | null;
}
export function revenueCoverage(year: number): RevenueCoverage | undefined {
  return (coverage as Record<string, RevenueCoverage>)[String(year)];
}
export function contributorYearAvailable(
  id: string,
  year: number,
  governmentNames: string[],
) {
  const coverage = revenueCoverage(year);
  if (!coverage) return true;
  if (id === "gov" || governmentNames.includes(id)) return coverage.government;
  if (id === "unattributed") return coverage.controls;
  return true;
}
