export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type CurrentLocation = {
  label: string;
  coordinates: Coordinates;
};

export function formatCoordinates(coordinates: Coordinates) {
  return `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`;
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}

async function reverseGeocode(coordinates: Coordinates): Promise<string> {
  const params = new URLSearchParams({
    lat: String(coordinates.latitude),
    lon: String(coordinates.longitude),
    format: "jsonv2",
    addressdetails: "1",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error("Reverse geocoding failed");

  const data: {
    display_name?: string;
    address?: Record<string, string | undefined>;
  } = await response.json();

  const address = data.address ?? {};
  const parts = [
    address.road ?? address.pedestrian ?? address.neighbourhood ?? address.suburb,
    address.suburb ?? address.neighbourhood ?? address.city_district,
    address.city ?? address.town ?? address.village ?? address.county ?? address.state,
  ].filter((part, index, items): part is string => Boolean(part) && items.indexOf(part) === index);

  return parts.length > 0 ? parts.join(", ") : data.display_name ?? formatCoordinates(coordinates);
}

export async function getCurrentLocation(): Promise<CurrentLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser.");
  }

  const position = await getPosition();
  const coordinates = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };

  try {
    return { label: await reverseGeocode(coordinates), coordinates };
  } catch {
    return { label: formatCoordinates(coordinates), coordinates };
  }
}

export function getCurrentLocationErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const geoError = error as GeolocationPositionError;
    if (geoError.code === 1) return "Location permission was denied.";
    if (geoError.code === 2) return "Your location is unavailable right now.";
    if (geoError.code === 3) return "Location request timed out. Try again.";
  }
  return error instanceof Error
    ? error.message
    : "Could not get your current location.";
}
