import { searchTrainers, type SearchQuery, type TimeWindowKey } from "@/lib/server/search";

export const dynamic = "force-dynamic";

function numberOrNull(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseQuery(params: URLSearchParams): SearchQuery {
  const format = params.get("format");
  const window = params.get("window");
  const sort = params.get("sort");
  return {
    pin: params.get("pin"),
    city: params.get("city"),
    locality: params.get("locality"),
    lat: numberOrNull(params.get("lat")),
    lng: numberOrNull(params.get("lng")),
    category: params.get("category"),
    format: format === "in_person" || format === "online" ? format : null,
    minPricePaise: numberOrNull(params.get("minPrice")),
    maxPricePaise: numberOrNull(params.get("maxPrice")),
    minExperience: numberOrNull(params.get("experience")),
    weekday: numberOrNull(params.get("weekday")),
    window: window === "morning" || window === "afternoon" || window === "evening" ? (window as TimeWindowKey) : null,
    minRating: numberOrNull(params.get("rating")),
    sort:
      sort === "price" || sort === "experience" || sort === "rating" || sort === "relevance" ? sort : null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const results = await searchTrainers(parseQuery(url.searchParams));
  return Response.json(results);
}
