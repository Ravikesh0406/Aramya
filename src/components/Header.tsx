"use client";

// ARAMYA marketplace header — Design System §7.
// Logo | Location | Search | Services | How it Works | Plans | For Trainers | Login | Book a Trial

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui";
import {
  CloseIcon,
  CrosshairIcon,
  LocationIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@/components/Icons";
import { LOCATIONS, NAV_LINKS, SEARCH_SUGGESTIONS, SERVICES } from "@/lib/data";
import {
  getCurrentLocation,
  getCurrentLocationErrorMessage,
} from "@/lib/geolocation";
import { clearCurrentUser, useCurrentUser } from "@/lib/auth";

const SUGGESTION_TO_SLUG: Record<string, string> = {
  Yoga: "yoga",
  "Personal Training": "fitness-personal-training",
  Mobility: "mobility",
  "Weight Management / Weight Loss": "weight-management",
};

export function Header() {
  const router = useRouter();
  const { user, loading: authLoading } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [location, setLocation] = useState("Select your location");
  const [locationLoading, setLocationLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = SEARCH_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(query.trim().toLowerCase()),
  );

  // Close popovers on outside click / Escape
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setLocationOpen(false);
        setSearchOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLocationOpen(false);
        setSearchOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function locateCurrentLocation() {
    setLocationLoading(true);
    setLocation("Getting your location...");
    try {
      const current = await getCurrentLocation();
      setLocation(current.label);
    } catch (error) {
      setLocation(getCurrentLocationErrorMessage(error));
    } finally {
      setLocationLoading(false);
    }
  }

  function chooseLocation(option: string) {
    if (option === "Use current location") {
      void locateCurrentLocation();
    } else if (option === "Search locality") {
      setLocation("Indiranagar, Bengaluru");
    } else {
      setLocation("Enter your address");
    }
    setLocationOpen(false);
  }

  function openSuggestion(label: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(`/services/${SUGGESTION_TO_SLUG[label] ?? "yoga"}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-forest-900/10 bg-ivory-50/95 backdrop-blur-md">
      <div ref={wrapperRef}>
        <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center gap-4 px-6 md:px-8">
          <Logo />

          {/* Location selector */}
          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setLocationOpen((open) => !open)}
              aria-expanded={locationOpen}
              aria-haspopup="listbox"
              className="flex h-11 max-w-[190px] items-center gap-2 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:border-forest-900/40"
            >
              <LocationIcon size={17} className="shrink-0 text-terracotta-500" />
              <span className="truncate">{location}</span>
            </button>
            {locationOpen ? (
              <div
                role="listbox"
                className="absolute left-0 top-[52px] w-72 rounded-md border border-forest-900/10 bg-white p-2 shadow-lg"
              >
                {LOCATIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => chooseLocation(option)}
                    className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-body-sm text-charcoal-900 transition duration-200 ease-out hover:bg-ivory-50"
                  >
                    {option === "Use current location" ? (
                      <CrosshairIcon size={17} className="text-forest-900" />
                    ) : (
                      <LocationIcon size={17} className="text-muted-600" />
                    )}
                    {option}
                  </button>
                ))}
                <div className="mt-1 border-t border-forest-900/10 px-3 pt-2">
                  <label
                    htmlFor="header-address"
                    className="t-caption block pb-1 text-muted-600"
                  >
                    Full address
                  </label>
                  <input
                    id="header-address"
                    type="text"
                    placeholder="Flat, street, area, city"
                    className="h-11 w-full rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Search */}
          <div className="relative hidden flex-1 xl:block">
            <SearchIcon
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-600"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search yoga, fitness, mobility..."
              aria-label="Search services"
              className="h-11 w-full rounded-[10px] border border-forest-900/15 bg-white pl-10 pr-4 text-body-sm text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
            />
            {searchOpen ? (
              <div className="absolute left-0 right-0 top-[52px] rounded-md border border-forest-900/10 bg-white p-2 shadow-lg">
                <p className="t-overline px-3 py-2 text-muted-600">
                  Suggestions
                </p>
                {(suggestions.length ? suggestions : SEARCH_SUGGESTIONS).map(
                  (label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => openSuggestion(label)}
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

          {/* Desktop nav */}
          <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-sm px-3 py-2 text-body-sm font-semibold text-charcoal-900 transition duration-200 ease-out hover:text-forest-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            {!authLoading && !user ? (
              <Link
                href="/login"
                className="hidden items-center gap-1.5 rounded-sm px-3 py-2 text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:text-forest-800 md:inline-flex"
              >
                <UserIcon size={17} />
                Login
              </Link>
            ) : null}
            {user ? (
              <button
                type="button"
                onClick={() => void clearCurrentUser()}
                className="hidden items-center gap-1.5 rounded-sm px-3 py-2 text-body-sm font-semibold text-muted-600 transition duration-200 ease-out hover:text-forest-800 md:inline-flex"
              >
                <UserIcon size={17} />
                Sign out
              </button>
            ) : null}
            <ButtonLink href="/book" size="sm" className="hidden sm:inline-flex">
              Book a Trial
            </ButtonLink>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-forest-900/15 bg-white text-forest-900 transition duration-200 ease-out hover:border-forest-900/40 lg:hidden"
            >
              {menuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile / tablet menu */}
        {menuOpen ? (
          <div className="border-t border-forest-900/10 bg-ivory-50 px-6 py-5 lg:hidden">
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-sm px-2 py-3 text-body-md text-charcoal-900 transition duration-200 ease-out hover:bg-white"
                >
                  {link.label}
                </Link>
              ))}
              {!authLoading && !user ? (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-sm px-2 py-3 text-body-md text-charcoal-900 transition duration-200 ease-out hover:bg-white"
                >
                  Login
                </Link>
              ) : null}
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    void clearCurrentUser();
                    setMenuOpen(false);
                  }}
                  className="rounded-sm px-2 py-3 text-left text-body-md text-muted-600 transition duration-200 ease-out hover:bg-white"
                >
                  Sign out
                </button>
              ) : null}
            </nav>

            <div className="mt-4 flex flex-col gap-3">
              <label
                htmlFor="mobile-location"
                className="t-overline text-muted-600"
              >
                Location
              </label>
              <input
                id="mobile-location"
                type="text"
                value={location === "Select your location" ? "" : location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Search locality or enter address"
                className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => chooseLocation("Use current location")}
                disabled={locationLoading}
                className="inline-flex items-center gap-2 text-body-sm font-semibold text-forest-900 disabled:opacity-50"
              >
                <CrosshairIcon size={16} /> Use current location
              </button>

              <label htmlFor="mobile-search" className="t-overline text-muted-600">
                Search
              </label>
              <div className="relative">
                <SearchIcon
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-600"
                />
                <input
                  id="mobile-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search yoga, fitness, mobility..."
                  className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-10 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {SEARCH_SUGGESTIONS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      openSuggestion(label);
                    }}
                    className="rounded-pill border border-forest-900/15 bg-white px-3.5 py-1.5 text-body-sm text-charcoal-900 transition duration-200 ease-out hover:border-forest-900/40"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <ButtonLink
                href="/book"
                size="lg"
                className="mt-1 w-full"
              >
                Book a Trial
              </ButtonLink>
              <p className="t-caption text-muted-600">
                {SERVICES.length} active services · Sessions booked 24+ hours in
                advance
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
