// ARAMYA — minimal geo helpers (haversine + bounding box).

export type Coordinates = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Coarse, privacy-preserving distance for display ("about 3 km"). */
export function coarseDistanceKm(distance: number): string {
  const km = Math.round(distance * 2) / 2; // nearest 500 m
  if (km < 1) return "less than 1 km";
  return `about ${km} km`;
}

export function withinRadius(point: Coordinates, trainer: Coordinates | null, radiusKm: number): boolean {
  if (!trainer || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
  if (point.lat === 0 && point.lng === 0) return false;
  return distanceKm(point, trainer) <= radiusKm;
}

/** Bounding-box prefilter used before haversine comparisons. */
export function boundingBox(point: Coordinates, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(Math.cos(toRadians(point.lat)), 0.0001));
  return {
    minLat: point.lat - latDelta,
    maxLat: point.lat + latDelta,
    minLng: point.lng - lngDelta,
    maxLng: point.lng + lngDelta,
  };
}
