import type { SecretariatMissionLocation } from "@/types";

/** Financial views describe the mission geography, not the representative map point. */
export function missionLocationLabel(
  location?: SecretariatMissionLocation | null,
): string | undefined {
  if (!location) return undefined;
  const isServiceCentre =
    location.budgetCategory === "support_center" ||
    ["UNLB", "UNGSC", "RSCE"].includes(location.code);
  return `${isServiceCentre ? "Location" : "Country / area"}: ${location.displayArea ?? location.area}`;
}
