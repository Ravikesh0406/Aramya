"use client";

// Trainer search controls — every change writes shareable URL query params,
// so the server component stays the single source of truth for results.

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { CrosshairIcon, SearchIcon } from "@/components/Icons";
import { getCurrentLocation, getCurrentLocationErrorMessage } from "@/lib/geolocation";

const WEEKDAYS = [
  { value: "", label: "Any day" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];
const WINDOWS = [
  { value: "", label: "Any time" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];
const FORMATS = [
  { value: "", label: "Any format" },
  { value: "in_person", label: "In person" },
  { value: "online", label: "Online" },
];
const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "price", label: "Price" },
  { value: "experience", label: "Experience" },
  { value: "rating", label: "Rating" },
];

export type TrainerFilterOption = { value: string; label: string };

export function TrainerFilters({
  categories,
  inUse,
}: {
  categories: TrainerFilterOption[];
  inUse: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [geoError, setGeoError] = useState("");
  const [locating, setLocating] = useState(false);

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    router.push(`/trainers?${next.toString()}`);
  }

  async function locate() {
    setLocating(true);
    setGeoError("");
    try {
      const current = await getCurrentLocation();
      const parts = current.label.split(",").map((part) => part.trim()).filter(Boolean);
      update({
        lat: String(current.coordinates.latitude),
        lng: String(current.coordinates.longitude),
        locality: parts.length >= 2 ? parts[parts.length - 2] : null,
        city: parts.length >= 1 ? parts[parts.length - 1] ?? "" : null,
        pin: null,
      });
    } catch (error) {
      setGeoError(getCurrentLocationErrorMessage(error));
    } finally {
      setLocating(false);
    }
  }

  return (
    <section
      aria-label="Search trainers"
      className="rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm md:p-6"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
        <div className="relative">
          <SearchIcon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-600"
          />
          <input
            type="search"
            defaultValue={params.get("pin") ?? params.get("locality") ?? params.get("city") ?? ""}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const value = (event.target as HTMLInputElement).value.trim();
                if (/^[1-9][0-9]{5}$/.test(value)) update({ pin: value, city: null, locality: null });
                else if (value.includes(",")) {
                  const [first, second] = value.split(",").map((part) => part.trim());
                  update({ locality: first, city: second ?? null, pin: null });
                } else update({ city: value, locality: null, pin: null });
              }
            }}
            placeholder="City, locality or PIN code"
            aria-label="City, locality or PIN code"
            className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-10 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
          />
        </div>

        <label className="flex flex-col gap-1">
          <span className="sr-only">Category</span>
          <select
            value={params.get("category") ?? ""}
            onChange={(event) => update({ category: event.target.value })}
            className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
          >
            <option value="">All specializations</option>
            {categories
              .filter((category) => inUse.includes(category.value))
              .map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
          </select>
        </label>

        <Button size="lg" onClick={() => void locate()} disabled={locating}>
          <CrosshairIcon size={17} />
          {locating ? "Locating..." : "Use my location"}
        </Button>
      </div>

      {geoError ? <p className="pt-2 text-body-sm text-error">{geoError}</p> : null}

      <div className="grid gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Format</span>
          <select
            value={params.get("format") ?? ""}
            onChange={(event) => update({ format: event.target.value })}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          >
            {FORMATS.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Day</span>
          <select
            value={params.get("weekday") ?? ""}
            onChange={(event) => update({ weekday: event.target.value })}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          >
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Time window</span>
          <select
            value={params.get("window") ?? ""}
            onChange={(event) => update({ window: event.target.value })}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          >
            {WINDOWS.map((window) => (
              <option key={window.value} value={window.value}>
                {window.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Sort by</span>
          <select
            value={params.get("sort") ?? "relevance"}
            onChange={(event) => update({ sort: event.target.value })}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Price from (₹/session)</span>
          <input
            type="number"
            min={0}
            step={100}
            defaultValue={params.get("minPrice") ? String(Math.floor(Number(params.get("minPrice")) / 100)) : ""}
            onBlur={(event) => update({ minPrice: event.target.value ? String(Number(event.target.value) * 100) : null })}
            placeholder="Any"
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Price up to (₹/session)</span>
          <input
            type="number"
            min={0}
            step={100}
            defaultValue={params.get("maxPrice") ? String(Math.floor(Number(params.get("maxPrice")) / 100)) : ""}
            onBlur={(event) => update({ maxPrice: event.target.value ? String(Number(event.target.value) * 100) : null })}
            placeholder="Any"
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Experience</span>
          <select
            value={params.get("experience") ?? ""}
            onChange={(event) => update({ experience: event.target.value })}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          >
            <option value="">Any experience</option>
            <option value="2">2+ years</option>
            <option value="5">5+ years</option>
            <option value="10">10+ years</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Rating</span>
          <select
            value={params.get("rating") ?? ""}
            onChange={(event) => update({ rating: event.target.value })}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          >
            <option value="">Any rating</option>
            <option value="4">4.0 and above</option>
            <option value="4.5">4.5 and above</option>
          </select>
        </label>
      </div>
    </section>
  );
}
