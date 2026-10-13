"use client";

// ARAMYA trainer onboarding — multi-step, mobile-first, saved after each step.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Overline } from "@/components/ui";
import {
  CheckIcon,
  ClockIcon,
  CrosshairIcon,
  MapPinIcon,
  PlusIcon,
} from "@/components/Icons";
import {
  fetchTrainerProfile,
  saveAreas,
  saveAvailability,
  saveBasics,
  saveCategories,
  saveCertifications,
  createOffering,
  deleteOffering,
  saveLocation,
  submitProfile,
  updateOffering,
  uploadTrainerFile,
  type TrainerProfile,
} from "@/lib/trainer-api";
import { getCurrentLocation, getCurrentLocationErrorMessage } from "@/lib/geolocation";
import { allowedPriceRange, listCategoriesClient } from "@/lib/trainer-pricing";

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "expertise", label: "Expertise" },
  { key: "offerings", label: "Services & prices" },
  { key: "availability", label: "Availability" },
  { key: "location", label: "Location & areas" },
  { key: "credentials", label: "Credentials" },
  { key: "review", label: "Review & submit" },
] as const;

const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Urdu",
];

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

const STEP_BY_KEY: Record<string, number> = {
  basics: 0,
  expertise: 1,
  offerings: 2,
  availability: 3,
  location: 4,
  credentials: 5,
  review: 6,
};

export function TrainerOnboarding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // step state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [years, setYears] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ slug: string; primary: boolean }[]>([]);
  const [radiusKm, setRadiusKm] = useState("10");
  const [areas, setAreas] = useState<{ city: string; locality: string; pinCode: string }[]>([]);
  const [geoStatus, setGeoStatus] = useState("");
  const [ranges, setRanges] = useState<Record<number, { startTime: string; endTime: string }[]>>({});
  const [certifications, setCertifications] = useState<
    { name: string; issuer: string; year: string; documentKey?: string | null }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchTrainerProfile();
        if (cancelled) return;
        setProfile(data);
        setName(data.trainer.name);
        setBio(data.trainer.bio);
        setYears(data.trainer.yearsExperience ? String(data.trainer.yearsExperience) : "");
        setLanguages(data.trainer.languages);
        setCategories(data.categories.map((category) => ({ slug: category.category_slug, primary: category.is_primary })));
        setRadiusKm(String(data.trainer.serviceRadiusKm));
        setAreas(data.areas.map((area) => ({ city: area.city, locality: area.locality, pinCode: area.pin_code })));
        setCertifications(
          data.certifications.map((certification) => ({
            name: certification.name,
            issuer: certification.issuer,
            year: certification.year ? String(certification.year) : "",
            documentKey: null,
          })),
        );
        const next: Record<number, { startTime: string; endTime: string }[]> = {};
        for (const range of data.availability) {
          next[range.weekday] = [...(next[range.weekday] ?? []), { startTime: range.start_time, endTime: range.end_time }];
        }
        setRanges(next);
        const requested = searchParams.get("step");
        const editing = searchParams.get("edit") !== null || Boolean(requested);
        if (requested && STEP_BY_KEY[requested] !== undefined) {
          setStep(STEP_BY_KEY[requested]);
        }
        // Already submitted profiles land on onboarding only to edit, so do not
        // redirect back to the dashboard when a step or edit flag is present.
        if (data.trainer.status === "submitted" && !editing) {
          router.replace("/trainer");
        }
      } catch {
        if (!cancelled) setError("Could not load your trainer profile.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const [availableCategories, setAvailableCategories] = useState<{ slug: string; name: string; description: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listCategoriesClient().then((categories) => {
      if (!cancelled) setAvailableCategories(categories);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(action: () => Promise<unknown>, successMessage: string, advance = true) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await action();
      const refreshed = await fetchTrainerProfile();
      setProfile(refreshed);
      setMessage(successMessage);
      if (advance) setStep((current) => Math.min(current + 1, STEPS.length - 1));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-forest-900/10 bg-white p-6 text-body text-muted-600 shadow-sm">
        {error || "Loading your trainer profile..."}
      </div>
    );
  }

  const hasInPerson = profile.offerings.some((offering) => offering.format === "home_visit");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Overline>Trainer onboarding</Overline>
        <h1 className="t-h1 text-charcoal-900">Set up your trainer profile</h1>
        <p className="max-w-2xl text-body text-muted-600">
          Your progress saves as you go. You can change everything later from the dashboard.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((item, index) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => setStep(index)}
              aria-current={index === step}
              className={`inline-flex items-center gap-2 rounded-pill border px-3.5 py-1.5 text-caption font-semibold transition duration-200 ease-out ${
                index === step
                  ? "border-forest-900 bg-forest-900 text-white"
                  : "border-forest-900/15 bg-white text-charcoal-900 hover:border-forest-900/40"
              }`}
            >
              <span className="tabular-nums">{index + 1}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm md:p-6">
        {step === 0 ? (
          <div className="flex flex-col gap-4">
            <h2 className="t-h3 text-charcoal-900">Basics</h2>
            <label className="flex flex-col gap-1">
              <span className="t-caption text-muted-600">Full name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="t-caption text-muted-600">
                Bio ({bio.length}/1200) — at least 40 characters
              </span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={5}
                maxLength={1200}
                placeholder="How you train, who you work with, what a session looks like."
                className="rounded-[10px] border border-forest-900/15 bg-white px-4 py-3 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="t-caption text-muted-600">Years of experience</span>
                <input
                  type="number"
                  min={0}
                  max={70}
                  value={years}
                  onChange={(event) => setYears(event.target.value)}
                  className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="t-caption text-muted-600">Email (optional, never public)</span>
                <input
                  type="email"
                  defaultValue={profile.trainer.email ?? ""}
                  onBlur={(event) => void saveBasics({ email: event.target.value })}
                  className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
                />
              </label>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="t-caption text-muted-600">Languages you teach in</legend>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((language) => {
                  const selected = languages.includes(language);
                  return (
                    <button
                      key={language}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setLanguages((current) =>
                          current.includes(language)
                            ? current.filter((item) => item !== language)
                            : [...current, language],
                        )
                      }
                      className={`rounded-pill border px-3 py-1.5 text-body-sm font-semibold transition duration-200 ease-out ${
                        selected
                          ? "border-forest-900 bg-forest-900 text-white"
                          : "border-forest-900/15 bg-white text-charcoal-900 hover:border-forest-900/40"
                      }`}
                    >
                      {language}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <span className="t-caption text-muted-600">Profile photo</span>
              <div className="flex items-center gap-4">
                {photoPreview || profile.trainer.photoKey ? (
                  <img
                    src={photoPreview ?? `/api/trainer-photo/${encodeURIComponent(profile.trainer.photoKey as string)}`}
                    alt=""
                    className="h-16 w-16 rounded-pill object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-16 w-16 items-center justify-center rounded-pill bg-sand-100 text-body-md font-semibold text-forest-900"
                  >
                    {name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-forest-900/20 bg-white px-4 py-2 text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:border-forest-900/45">
                  <PlusIcon size={16} />
                  Upload photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await readFileAsDataUrl(file);
                        setPhotoPreview(dataUrl);
                        await uploadTrainerFile({ dataUrl, kind: "photo" });
                        setMessage("Photo updated.");
                        const refreshed = await fetchTrainerProfile();
                        setProfile(refreshed);
                      } catch (uploadError) {
                        setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
                      }
                    }}
                  />
                </label>
              </div>
              {!profile.uploadsConfigured ? (
                <p className="t-caption text-muted-600">
                  Uploads are not configured in this environment, so photos cannot be added yet.
                </p>
              ) : null}
            </div>

            <div className="pt-2">
              <Button
                size="lg"
                disabled={saving}
                onClick={() =>
                  void run(
                    () =>
                      saveBasics({
                        name,
                        bio,
                        yearsExperience: Number(years),
                        languages,
                        email: profile.trainer.email ?? "",
                      }),
                    "Basics saved.",
                  )
                }
              >
                {saving ? "Saving..." : "Save and continue"}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <h2 className="t-h3 text-charcoal-900">Expertise</h2>
            <p className="text-body-sm text-muted-600">
              Choose everything you teach, then mark one as your primary specialization.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {availableCategories.map((category) => {
                const selected = categories.find((item) => item.slug === category.slug);
                return (
                  <div
                    key={category.slug}
                    className={`rounded-xl border p-4 transition duration-200 ease-out ${
                      selected ? "border-forest-900 bg-ivory-50" : "border-forest-900/12 bg-white"
                    }`}
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        onChange={(event) => {
                          setCategories((current) =>
                            event.target.checked
                              ? [...current, { slug: category.slug, primary: current.length === 0 }]
                              : current.filter((item) => item.slug !== category.slug),
                          );
                        }}
                      />
                      <span>
                        <span className="block text-body font-semibold text-charcoal-900">{category.name}</span>
                        <span className="block text-body-sm text-muted-600">{category.description}</span>
                      </span>
                    </label>
                    {selected ? (
                      <label className="flex items-center gap-2 pt-2 text-body-sm text-charcoal-900">
                        <input
                          type="radio"
                          name="primary-category"
                          checked={selected.primary}
                          onChange={() =>
                            setCategories((current) =>
                              current.map((item) => ({ ...item, primary: item.slug === category.slug })),
                            )
                          }
                        />
                        Primary specialization
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="pt-2">
              <Button
                size="lg"
                disabled={saving}
                onClick={() =>
                  void run(
                    () => saveCategories(categories.map((category) => ({ slug: category.slug, primary: category.primary }))),
                    "Expertise saved.",
                  )
                }
              >
                {saving ? "Saving..." : "Save and continue"}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-5">
            <h2 className="t-h3 text-charcoal-900">Services &amp; prices</h2>
            <p className="text-body-sm text-muted-600">
              You set your own prices. Aramya only checks they are inside the allowed range for typos
              and abuse.
            </p>
            <OfferingForm
              categories={availableCategories}
              onCreated={async () => {
                const refreshed = await fetchTrainerProfile();
                setProfile(refreshed);
              }}
            />
            <ul className="flex flex-col divide-y divide-forest-900/8">
              {profile.offerings.map((offering) => (
                <li key={offering.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-body font-semibold text-charcoal-900">
                      {offering.duration_min} min · {formatPrice(offering.price_paise)} ·{" "}
                      {offering.sessions_in_package > 1 ? `${offering.sessions_in_package} sessions` : "single session"}
                    </p>
                    <p className="text-body-sm text-muted-600">
                      {availableCategories.find((category) => category.slug === offering.category_slug)?.name ??
                        offering.category_slug}{" "}
                      · {offering.format === "online" ? "Online (Zoom)" : "Home visit"} ·{" "}
                      {offering.active ? "live" : "hidden"}
                    </p>
                    {offering.format === "online" ? (
                      <p className="t-caption text-muted-600">
                        Meeting link: {offering.meeting_url ? "set" : "not set"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        void updateOffering(offering.id, { active: !offering.active }).then(async () => {
                          const refreshed = await fetchTrainerProfile();
                          setProfile(refreshed);
                        })
                      }
                    >
                      {offering.active ? "Hide" : "Make live"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void deleteOffering(offering.id).then(async () => {
                          const refreshed = await fetchTrainerProfile();
                          setProfile(refreshed);
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Button size="lg" variant="secondary" onClick={() => setStep(3)}>
                Continue to availability
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4">
            <h2 className="t-h3 text-charcoal-900">Availability</h2>
            <p className="text-body-sm text-muted-600">
              Add the time ranges you can train, per weekday, in IST. Customers book inside these
              windows.
            </p>
            {WEEKDAYS.map((day) => (
              <div key={day.value} className="rounded-xl border border-forest-900/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body font-semibold text-charcoal-900">{day.label}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setRanges((current) => ({
                        ...current,
                        [day.value]: [...(current[day.value] ?? []), { startTime: "06:00", endTime: "09:00" }],
                      }))
                    }
                  >
                    <PlusIcon size={15} /> Add range
                  </Button>
                </div>
                <div className="flex flex-col gap-2 pt-3">
                  {(ranges[day.value] ?? []).map((range, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        value={range.startTime}
                        onChange={(event) =>
                          setRanges((current) => {
                            const list = [...(current[day.value] ?? [])];
                            list[index] = { ...list[index], startTime: event.target.value };
                            return { ...current, [day.value]: list };
                          })
                        }
                        className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
                      />
                      <span className="text-body-sm text-muted-600">to</span>
                      <input
                        type="time"
                        value={range.endTime}
                        onChange={(event) =>
                          setRanges((current) => {
                            const list = [...(current[day.value] ?? [])];
                            list[index] = { ...list[index], endTime: event.target.value };
                            return { ...current, [day.value]: list };
                          })
                        }
                        className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setRanges((current) => ({
                            ...current,
                            [day.value]: (current[day.value] ?? []).filter((_, position) => position !== index),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-2">
              <Button
                size="lg"
                disabled={saving}
                onClick={() =>
                  void run(
                    () =>
                      saveAvailability(
                        Object.entries(ranges).flatMap(([weekday, list]) =>
                          list.map((range) => ({
                            weekday: Number(weekday),
                            startTime: range.startTime,
                            endTime: range.endTime,
                          })),
                        ),
                      ),
                    "Availability saved.",
                  )
                }
              >
                {saving ? "Saving..." : "Save and continue"}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-4">
            <h2 className="t-h3 text-charcoal-900">Location &amp; areas</h2>
            {hasInPerson ? (
              <p className="text-body-sm text-muted-600">
                You offer home visits, so customers need to match you to an area.
              </p>
            ) : (
              <p className="text-body-sm text-muted-600">
                Optional for online-only trainers. You can add it later if you start visiting homes.
              </p>
            )}

            <div className="rounded-xl border border-forest-900/10 bg-ivory-50 p-4">
              <p className="text-body-sm font-semibold text-charcoal-900">Your exact location</p>
              <p className="pt-1 text-body-sm text-muted-600">
                Used only to match you with customers nearby. It is never shown publicly — customers
                see your city and locality, and an approximate distance.
              </p>
              <div className="pt-3">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    setGeoStatus("Getting your location...");
                    try {
                      const current = await getCurrentLocation();
                      await saveLocation({
                        lat: current.coordinates.latitude,
                        lng: current.coordinates.longitude,
                        consent: true,
                      });
                      const refreshed = await fetchTrainerProfile();
                      setProfile(refreshed);
                      setGeoStatus("Location saved. It stays private.");
                    } catch (geoError) {
                      setGeoStatus(getCurrentLocationErrorMessage(geoError));
                    }
                  }}
                >
                  <CrosshairIcon size={16} />
                  {profile.trainer.hasLocation ? "Update my location" : "Use my current location"}
                </Button>
              </div>
              {geoStatus ? <p className="pt-2 text-body-sm text-muted-600">{geoStatus}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <label className="flex flex-col gap-1">
                <span className="t-caption text-muted-600">City</span>
                <input
                  value={areas[0]?.city ?? ""}
                  onChange={(event) =>
                    setAreas((current) =>
                      current.length === 0
                        ? [{ city: event.target.value, locality: "", pinCode: "" }]
                        : current.map((area, index) => (index === 0 ? { ...area, city: event.target.value } : area)),
                    )
                  }
                  className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="t-caption text-muted-600">Locality</span>
                <input
                  value={areas[0]?.locality ?? ""}
                  onChange={(event) =>
                    setAreas((current) =>
                      current.length === 0
                        ? [{ city: "", locality: event.target.value, pinCode: "" }]
                        : current.map((area, index) => (index === 0 ? { ...area, locality: event.target.value } : area)),
                    )
                  }
                  className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="t-caption text-muted-600">PIN code</span>
                <input
                  inputMode="numeric"
                  value={areas[0]?.pinCode ?? ""}
                  onChange={(event) =>
                    setAreas((current) =>
                      current.length === 0
                        ? [{ city: "", locality: "", pinCode: event.target.value }]
                        : current.map((area, index) => (index === 0 ? { ...area, pinCode: event.target.value } : area)),
                    )
                  }
                  className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
                />
              </label>
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const city = areas[0]?.city ?? "";
                    const locality = areas[0]?.locality ?? "";
                    const pinCode = areas[0]?.pinCode ?? "";
                    if (!city || !pinCode) {
                      setError("City and PIN code are required for each service area.");
                      return;
                    }
                    setError("");
                    setAreas((current) => [
                      ...current.filter((area) => area.pinCode !== pinCode),
                      { city, locality, pinCode },
                    ]);
                  }}
                >
                  <PlusIcon size={16} /> Add area
                </Button>
              </div>
            </div>

            {areas.length > 1 ? (
              <ul className="flex flex-wrap gap-2">
                {areas.slice(1).map((area) => (
                  <li key={area.pinCode}>
                    <span className="inline-flex items-center gap-2 rounded-pill border border-forest-900/15 bg-white px-3 py-1 text-body-sm text-charcoal-900">
                      <MapPinIcon size={14} />
                      {[area.locality, area.city, area.pinCode].filter(Boolean).join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <label className="flex max-w-xs flex-col gap-1">
              <span className="t-caption text-muted-600">Service radius (km) from your location</span>
              <input
                type="number"
                min={1}
                max={100}
                value={radiusKm}
                onChange={(event) => setRadiusKm(event.target.value)}
                className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
              />
            </label>

            <div className="pt-2">
              <Button
                size="lg"
                disabled={saving}
                onClick={() =>
                  void run(() => saveAreas({ radiusKm: Number(radiusKm), areas }), "Areas saved.", !hasInPerson)
                }
              >
                {saving ? "Saving..." : "Save and continue"}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="flex flex-col gap-4">
            <h2 className="t-h3 text-charcoal-900">Credentials</h2>
            <p className="text-body-sm text-muted-600">
              Required for prenatal &amp; postnatal categories. Documents are private — only our team
              reviews them.
            </p>
            {certifications.map((certification, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-forest-900/10 bg-white p-4 sm:grid-cols-[1fr_1fr_120px_auto]">
                <input
                  value={certification.name}
                  placeholder="Certification name"
                  onChange={(event) =>
                    setCertifications((current) =>
                      current.map((item, position) => (position === index ? { ...item, name: event.target.value } : item)),
                    )
                  }
                  className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
                />
                <input
                  value={certification.issuer}
                  placeholder="Issuer"
                  onChange={(event) =>
                    setCertifications((current) =>
                      current.map((item, position) => (position === index ? { ...item, issuer: event.target.value } : item)),
                    )
                  }
                  className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
                />
                <input
                  inputMode="numeric"
                  value={certification.year}
                  placeholder="Year"
                  onChange={(event) =>
                    setCertifications((current) =>
                      current.map((item, position) => (position === index ? { ...item, year: event.target.value } : item)),
                    )
                  }
                  className="h-12 rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 focus:border-forest-900 focus:outline-none"
                />
                <Button
                  variant="ghost"
                  onClick={() => setCertifications((current) => current.filter((_, position) => position !== index))}
                >
                  Remove
                </Button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-forest-900/20 bg-white px-4 py-2 text-body-sm font-semibold text-forest-900 sm:col-span-4 sm:w-fit">
                  Upload document (private)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await readFileAsDataUrl(file);
                        const uploaded = await uploadTrainerFile({ dataUrl, kind: "document", folder: "certifications" });
                        setCertifications((current) =>
                          current.map((item, position) =>
                            position === index ? { ...item, documentKey: uploaded.key } : item,
                          ),
                        );
                      } catch (uploadError) {
                        setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
                      }
                    }}
                  />
                </label>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() => setCertifications((current) => [...current, { name: "", issuer: "", year: "" }])}
            >
              <PlusIcon size={16} /> Add certification
            </Button>
            <div className="pt-2">
              <Button
                size="lg"
                disabled={saving}
                onClick={() =>
                  void run(
                    () =>
                      saveCertifications(
                        certifications.map((certification) => ({
                          name: certification.name,
                          issuer: certification.issuer,
                          year: certification.year ? Number(certification.year) : null,
                          documentKey: certification.documentKey ?? null,
                        })),
                      ),
                    "Credentials saved.",
                  )
                }
              >
                {saving ? "Saving..." : "Save and continue"}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="flex flex-col gap-4">
            <h2 className="t-h3 text-charcoal-900">Review &amp; submit</h2>
            <ul className="flex flex-col gap-2">
              {[
                { label: "Basics", done: profile.trainer.bio.length >= 40 && profile.trainer.yearsExperience > 0 && profile.trainer.languages.length > 0 },
                { label: "Expertise", done: profile.categories.length > 0 },
                { label: "Services & prices", done: profile.offerings.some((offering) => offering.active) },
                { label: "Availability", done: profile.availability.length > 0 },
                {
                  label: "Location & areas",
                  done: hasInPerson ? profile.areas.length > 0 : true,
                },
                { label: "Credentials", done: profile.certifications.length > 0 },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-body text-charcoal-900">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-pill ${
                      item.done ? "bg-success/15 text-success" : "bg-forest-900/8 text-muted-600"
                    }`}
                  >
                    {item.done ? <CheckIcon size={13} strokeWidth={2.6} /> : <ClockIcon size={13} />}
                  </span>
                  {item.label}
                  {item.done ? null : <span className="text-body-sm text-muted-600">— not finished yet</span>}
                </li>
              ))}
            </ul>
            <p className="text-body-sm text-muted-600">
              Submitting sends your profile for review. Your verification status shows in the
              dashboard; customers only see you once you are verified and listed.
            </p>
            <div className="pt-2">
              <Button
                size="lg"
                disabled={saving}
                onClick={() =>
                  void run(() => submitProfile(), "Profile submitted for review.", false).then(() =>
                    router.push("/trainer"),
                  )
                }
              >
                {saving ? "Submitting..." : "Submit for review"}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? <p className="pt-4 text-body-sm text-error">{error}</p> : null}
        {message ? <p className="pt-4 text-body-sm text-success">{message}</p> : null}
      </div>
    </div>
  );
}

function OfferingForm({
  categories,
  onCreated,
}: {
  categories: { slug: string; name: string }[];
  onCreated: () => Promise<void>;
}) {
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [format, setFormat] = useState<"home_visit" | "online">("home_visit");
  const [durationMin, setDurationMin] = useState("60");
  const [priceRupees, setPriceRupees] = useState("");
  const [sessionsInPackage, setSessionsInPackage] = useState("1");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [range, setRange] = useState<{ minPaise: number; maxPaise: number } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadRange() {
      if (!categorySlug) return;
      const result = await allowedPriceRange(categorySlug, Number(durationMin), Number(sessionsInPackage));
      if (!cancelled) setRange(result);
    }
    void loadRange();
    return () => {
      cancelled = true;
    };
  }, [categorySlug, durationMin, sessionsInPackage]);

  async function submit() {
    setSaving(true);
    setError("");
    try {
      await createOffering({
        categorySlug,
        format,
        durationMin: Number(durationMin),
        pricePaise: Math.round(Number(priceRupees) * 100),
        sessionsInPackage: Number(sessionsInPackage),
        active: true,
        meetingUrl: meetingUrl || null,
      });
      setPriceRupees("");
      setMeetingUrl("");
      await onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not save the offering.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-forest-900/10 bg-ivory-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Category</span>
          <select
            value={categorySlug}
            onChange={(event) => setCategorySlug(event.target.value)}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Format</span>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as "home_visit" | "online")}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          >
            <option value="home_visit">Home visit</option>
            <option value="online">Online (Zoom)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Duration (minutes)</span>
          <select
            value={durationMin}
            onChange={(event) => setDurationMin(event.target.value)}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          >
            {[15, 30, 45, 60, 75, 90, 120, 150, 180].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Sessions in package</span>
          <input
            type="number"
            min={1}
            max={40}
            value={sessionsInPackage}
            onChange={(event) => setSessionsInPackage(event.target.value)}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Total price (₹)</span>
          <input
            type="number"
            min={0}
            value={priceRupees}
            onChange={(event) => setPriceRupees(event.target.value)}
            className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
          />
        </label>
        {format === "online" ? (
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="t-caption text-muted-600">Zoom meeting link (https, zoom.us)</span>
            <input
              value={meetingUrl}
              onChange={(event) => setMeetingUrl(event.target.value)}
              placeholder="https://zoom.us/j/..."
              className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
            />
          </label>
        ) : null}
      </div>
      {range ? (
        <p className="t-caption text-muted-600">
          Allowed for this session: {formatPrice(range.minPaise)} – {formatPrice(range.maxPaise)}.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void submit()} disabled={saving || !priceRupees}>
          {saving ? "Saving..." : "Add offering"}
        </Button>
        {error ? <p className="text-body-sm text-error">{error}</p> : null}
      </div>
    </div>
  );
}
