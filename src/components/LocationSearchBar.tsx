"use client";

// Location + search band (Design System §7) — "Choose your location, find your service."
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CrosshairIcon,
  LocationIcon,
  SearchIcon,
} from "@/components/Icons";
import { Button } from "@/components/ui";
import { SEARCH_SUGGESTIONS } from "@/lib/data";
import {
  getCurrentLocation,
  getCurrentLocationErrorMessage,
} from "@/lib/geolocation";

const SUGGESTION_TO_SLUG: Record<string, string> = {
  Yoga: "yoga",
  "Personal Training": "fitness-personal-training",
  Mobility: "mobility",
  "Weight Management / Weight Loss": "weight-management",
};

export function LocationSearchBar() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = SEARCH_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function locateCurrentLocation() {
    setLocating(true);
    setLocationError("");
    setLocation("Getting your location...");
    try {
      const current = await getCurrentLocation();
      setLocation(current.label);
    } catch (error) {
      setLocation("");
      setLocationError(getCurrentLocationErrorMessage(error));
    } finally {
      setLocating(false);
    }
  }

  function submit() {
    if (locating) return;
    const match = SEARCH_SUGGESTIONS.find(
      (s) => s.toLowerCase() === query.trim().toLowerCase(),
    );
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (match) {
      params.set("service", SUGGESTION_TO_SLUG[match]);
      router.push(`/book?${params.toString()}`);
    } else {
      router.push(params.size > 0 ? `/book?${params.toString()}` : "/services");
    }
  }

  return (
    <section aria-label="Find training near you" className="pb-4">
      <div className="rounded-xl border border-forest-900/10 bg-white p-4 shadow-md md:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
          {/* Location */}
          <div className="relative">
            <LocationIcon
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-terracotta-500"
            />
            <input
              type="text"
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                setLocationError("");
              }}
              placeholder="Select your location"
              aria-label="Your location"
              className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-10 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void locateCurrentLocation()}
              disabled={locating}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-forest-900 transition duration-200 ease-out hover:bg-ivory-50 disabled:opacity-50"
              aria-label="Use current location"
              title="Use current location"
            >
              <CrosshairIcon size={18} />
            </button>
            {locationError ? (
              <p className="pt-2 text-body-sm text-error">{locationError}</p>
            ) : null}
          </div>

          {/* Search */}
          <div className="relative">
            <SearchIcon
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-600"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 150)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              placeholder="Search yoga, fitness, mobility..."
              aria-label="Search services"
              className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-10 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
            />
            {focused ? (
              <div className="absolute left-0 right-0 top-[54px] z-20 rounded-md border border-forest-900/10 bg-white p-2 shadow-lg">
                <p className="t-overline px-3 py-2 text-muted-600">Suggestions</p>
                {(suggestions.length ? suggestions : SEARCH_SUGGESTIONS).map(
                  (label) => (
                    <button
                      key={label}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setQuery(label);
                        router.push(`/services/${SUGGESTION_TO_SLUG[label]}`);
                      }}
                      className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-body-sm text-charcoal-900 transition duration-200 ease-out hover:bg-ivory-50"
                    >
                      <SearchIcon size={16} className="text-muted-600" />
                      {label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>

          <Button size="lg" onClick={submit} disabled={locating} className="w-full md:w-auto">
            Find a Trainer
          </Button>
        </div>
      </div>
    </section>
  );
}
