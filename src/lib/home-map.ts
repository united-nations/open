import { geoEqualEarth, geoPath, type GeoPermissibleObjects } from "d3-geo";
import land from "./home-map-land.json";

// Natural Earth 5.1.2, public-domain 1:110m land geometry. See home-map-land.source.txt.
// Fit the whole globe once, independently of each preview's point coverage.
// Both land paths and point positions use this exact projection and extent.
const globe = { type: "Sphere" } as const;
const projection = geoEqualEarth().fitExtent(
  [
    [0, 0],
    [320, 184],
  ],
  globe,
);
const path = geoPath(projection).digits(1);

export const HOME_MAP_LAND_PATH = path(land as GeoPermissibleObjects) ?? "";

export function projectHomeMapPoint(
  longitude: number,
  latitude: number,
): [number, number] | null {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    Math.abs(longitude) > 180 ||
    Math.abs(latitude) > 90
  )
    return null;
  const point = projection([longitude, latitude]);
  return point && point.every(Number.isFinite) ? point : null;
}
