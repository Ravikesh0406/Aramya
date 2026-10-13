"use client";

// ARAMYA admin console — gated by ADMIN_CONTACTS (no new role system).
// Verification queue, categories, pricing limits, listing plans, reports.

import { useCallback, useEffect, useState } from "react";
import { Container, Overline, ButtonLink, StatusBadge } from "@/components/ui";
import { Button } from "@/components/ui";
import { useCurrentUser } from "@/lib/auth";

const MUTATION_HEADERS = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" };

type AdminTrainer = {
  user_id: string;
  name: string;
  contact: string;
  email: string | null;
  trainer_code: string;
  slug: string;
  status: string;
  verification_status: string;
  verification_note: string | null;
  years_experience: number;
  photo_key: string | null;
  areas: string;
  categories: number;
  offerings: number;
  certifications: number;
  submitted_at: string | null;
  created_at: string;
};

type AdminReport = {
  id: string;
  trainer_id: string;
  reporter_contact: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  trainer_name: string;
  trainer_code: string;
  slug: string;
};

type Category = { slug: string; name: string; description: string; active: boolean; sort_order: number; requires_certification: boolean };
type PricingLimit = { id: string; category_slug: string | null; min_paise: number; max_paise: number; updated_at: string };
type Plan = { id: string; name: string; description: string; price_paise: number; period_days: number; active: boolean };
type Subscriber = { trainerId: string; trainerName: string; trainerCode: string; planName: string; expiresAt: string; daysLeft: number };
type Stats = {
  draftProfiles: number;
  awaitingVerification: number;
  verified: number;
  rejected: number;
  suspended: number;
  openReports: number;
  activeSubscribers: number;
};

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? MUTATION_HEADERS : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as { error?: string } & T;
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

function inr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const TABS = ["Applications", "Categories", "Pricing limits", "Listing plans", "Reports"] as const;
type Tab = (typeof TABS)[number];

export function AdminConsole() {
  const { user, loading } = useCurrentUser();
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState<Tab>("Applications");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [stats, setStats] = useState<Stats | null>(null);
  const [trainers, setTrainers] = useState<AdminTrainer[]>([]);
  const [trainerFilter, setTrainerFilter] = useState("awaiting");
  const [categories, setCategories] = useState<Category[]>([]);
  const [limits, setLimits] = useState<PricingLimit[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [statsData, trainersData, categoriesData, limitsData, plansData, subscribersData, reportsData] =
        await Promise.all([
          api<{ stats: Stats }>("/api/admin/stats"),
          api<{ trainers: AdminTrainer[] }>("/api/admin/trainers"),
          api<{ categories: Category[] }>("/api/admin/categories"),
          api<{ limits: PricingLimit[] }>("/api/admin/pricing-limits"),
          api<{ plans: Plan[] }>("/api/admin/subscription-plans"),
          api<{ subscribers: Subscriber[] }>("/api/admin/subscribers"),
          api<{ reports: AdminReport[] }>("/api/admin/reports"),
        ]);
      setStats(statsData.stats);
      setTrainers(trainersData.trainers);
      setCategories(categoriesData.categories);
      setLimits(limitsData.limits);
      setPlans(plansData.plans);
      setSubscribers(subscribersData.subscribers);
      setReports(reportsData.reports);
    } catch (loadError) {
      setForbidden(true);
      setError(loadError instanceof Error ? loadError.message : "Could not load admin data.");
    }
  }, []);

  // Authorization is decided by the server: the load call fails with 403 for
  // non-admins, and that error becomes the "admin access only" message.
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [statsData, trainersData, categoriesData, limitsData, plansData, subscribersData, reportsData] =
          await Promise.all([
            api<{ stats: Stats }>("/api/admin/stats"),
            api<{ trainers: AdminTrainer[] }>("/api/admin/trainers"),
            api<{ categories: Category[] }>("/api/admin/categories"),
            api<{ limits: PricingLimit[] }>("/api/admin/pricing-limits"),
            api<{ plans: Plan[] }>("/api/admin/subscription-plans"),
            api<{ subscribers: Subscriber[] }>("/api/admin/subscribers"),
            api<{ reports: AdminReport[] }>("/api/admin/reports"),
          ]);
        if (cancelled) return;
        setStats(statsData.stats);
        setTrainers(trainersData.trainers);
        setCategories(categoriesData.categories);
        setLimits(limitsData.limits);
        setPlans(plansData.plans);
        setSubscribers(subscribersData.subscribers);
        setReports(reportsData.reports);
      } catch (loadError) {
        if (cancelled) return;
        setForbidden(true);
        setError(loadError instanceof Error ? loadError.message : "Could not load admin data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  if (loading) {
    return (
      <Container className="py-16">
        <p className="text-body text-muted-600">Checking your account...</p>
      </Container>
    );
  }

  if (!user || forbidden) {
    return (
      <Container className="flex max-w-2xl flex-col gap-5 py-16">
        <Overline>Admin</Overline>
        <h1 className="t-h1 text-charcoal-900">Admin access only</h1>
        <p className="text-body text-muted-600">
          This console is limited to accounts on the ARAMYA admin allowlist. Sign in with an allowed
          contact to continue.
        </p>
        <ButtonLink href="/login?redirect=/admin">Sign in</ButtonLink>
      </Container>
    );
  }

  return (
    <section className="py-12 md:py-16">
      <Container className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Overline>Admin console</Overline>
          <h1 className="t-h1 text-charcoal-900">Trainers, categories and listings</h1>
          <p className="max-w-2xl text-body text-muted-600">
            Review applications, verify trainers, manage categories, pricing limits and listing plans.
          </p>
        </div>

        {stats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Awaiting verification", stats.awaitingVerification],
              ["Verified trainers", stats.verified],
              ["Suspended", stats.suspended],
              ["Open reports", stats.openReports],
              ["Draft profiles", stats.draftProfiles],
              ["Rejected", stats.rejected],
              ["Active subscribers", stats.activeSubscribers],
              ["Applications", stats.awaitingVerification],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm">
                <p className="t-caption text-muted-600">{label}</p>
                <p className="pt-1 text-body-md font-semibold text-forest-900">{value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <nav aria-label="Admin sections" className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              aria-current={item === tab}
              className={`rounded-pill border px-4 py-2 text-body-sm font-semibold transition duration-200 ease-out ${
                item === tab
                  ? "border-forest-900 bg-forest-900 text-white"
                  : "border-forest-900/15 bg-white text-charcoal-900 hover:border-forest-900/40"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {error ? <p className="text-body-sm text-error">{error}</p> : null}
        {notice ? <p className="text-body-sm text-success">{notice}</p> : null}

        {tab === "Applications" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-body-sm text-charcoal-900">
                Show
                <select
                  value={trainerFilter}
                  onChange={(event) => setTrainerFilter(event.target.value)}
                  className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none"
                >
                  <option value="awaiting">Awaiting verification</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="draft">Draft profiles</option>
                  <option value="suspended">Suspended</option>
                  <option value="all">All</option>
                </select>
              </label>
            </div>

            <div className="overflow-x-auto rounded-xl border border-forest-900/10 bg-white shadow-sm">
              <table className="w-full min-w-[860px] border-collapse text-left text-body-sm">
                <thead>
                  <tr className="border-b border-forest-900/10 bg-ivory-50 text-charcoal-900">
                    <th scope="col" className="px-4 py-3">Trainer</th>
                    <th scope="col" className="px-4 py-3">Code</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Areas</th>
                    <th scope="col" className="px-4 py-3">Profile</th>
                    <th scope="col" className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-900/8">
                  {trainers
                    .filter((trainer) =>
                      trainerFilter === "all"
                        ? true
                        : trainerFilter === "awaiting"
                          ? trainer.verification_status === "pending"
                          : trainerFilter === "verified"
                            ? trainer.verification_status === "verified"
                            : trainerFilter === "rejected"
                              ? trainer.verification_status === "rejected"
                              : trainer.status === trainerFilter,
                    )
                    .map((trainer) => (
                      <tr key={trainer.user_id}>
                        <td className="px-4 py-3">
                          <span className="block font-semibold text-charcoal-900">{trainer.name}</span>
                          <span className="block text-caption text-muted-600">
                            {trainer.contact}
                            {trainer.email ? ` · ${trainer.email}` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-charcoal-900">{trainer.trainer_code}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={trainer.verification_status} />
                            <span className="t-caption text-muted-600">{trainer.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-charcoal-900">{trainer.areas || "—"}</td>
                        <td className="px-4 py-3 text-charcoal-900">
                          {trainer.categories} categories · {trainer.offerings} offerings ·{" "}
                          {trainer.certifications} certifications · {trainer.years_experience} yrs
                          {trainer.certifications > 0 ? (
                            <CertificationLinks trainerId={trainer.user_id} />
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {trainer.verification_status !== "verified" ? (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  setError("");
                                  try {
                                    await api(`/api/admin/trainers/${trainer.user_id}`, "POST", { action: "verify" });
                                    setNotice(`${trainer.name} verified.`);
                                    await load();
                                  } catch (actionError) {
                                    setError(actionError instanceof Error ? actionError.message : "Could not verify.");
                                  }
                                }}
                              >
                                Verify
                              </Button>
                            ) : null}
                            {trainer.verification_status !== "rejected" ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={async () => {
                                  const note = window.prompt("Reason shown to the trainer:", "");
                                  if (note === null) return;
                                  try {
                                    await api(`/api/admin/trainers/${trainer.user_id}`, "POST", {
                                      action: "reject",
                                      note,
                                    });
                                    setNotice(`${trainer.name} sent back for changes.`);
                                    await load();
                                  } catch (actionError) {
                                    setError(actionError instanceof Error ? actionError.message : "Could not reject.");
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (!window.confirm("Clear this trainer's bio text?")) return;
                                await api(`/api/admin/trainers/${trainer.user_id}`, "POST", { action: "clearBio" });
                                setNotice(`${trainer.name}'s bio cleared.`);
                                await load();
                              }}
                            >
                              Clear bio
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (!window.confirm("Remove this trainer's profile photo?")) return;
                                await api(`/api/admin/trainers/${trainer.user_id}`, "POST", { action: "clearPhoto" });
                                setNotice(`${trainer.name}'s photo removed.`);
                                await load();
                              }}
                            >
                              Clear photo
                            </Button>
                            {trainer.status === "suspended" ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={async () => {
                                  await api(`/api/admin/trainers/${trainer.user_id}`, "POST", { action: "reactivate" });
                                  setNotice(`${trainer.name} reactivated.`);
                                  await load();
                                }}
                              >
                                Reactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  await api(`/api/admin/trainers/${trainer.user_id}`, "POST", { action: "suspend" });
                                  setNotice(`${trainer.name} suspended.`);
                                  await load();
                                }}
                              >
                                Suspend
                              </Button>
                            )}
                            <a
                              href={`/trainers/${trainer.slug}`}
                              className="inline-flex h-9 items-center rounded-[10px] border border-forest-900/20 bg-white px-3 text-body-sm font-semibold text-forest-900"
                            >
                              View profile
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "Categories" ? <CategoriesPanel categories={categories} onDone={load} /> : null}
        {tab === "Pricing limits" ? <PricingPanel limits={limits} categories={categories} onDone={load} /> : null}
        {tab === "Listing plans" ? <PlansPanel plans={plans} subscribers={subscribers} onDone={load} /> : null}
        {tab === "Reports" ? <ReportsPanel reports={reports} onDone={load} /> : null}
      </Container>
    </section>
  );
}

function CertificationLinks({ trainerId }: { trainerId: string }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api<{ certifications: { id: string }[] }>(
          `/api/trainer/certifications?trainer=${trainerId}`,
        );
        if (!cancelled) setIds(data.certifications.map((item) => item.id));
      } catch {
        /* not critical */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [trainerId]);
  if (ids.length === 0) return null;
  return (
    <span className="block pt-1">
      {ids.map((id) => (
        <a
          key={id}
          href={`/api/admin/trainers/${id}`}
          className="text-caption font-semibold text-forest-900 underline"
        >
          document
        </a>
      ))}
    </span>
  );
}

function CategoriesPanel({ categories, onDone }: { categories: Category[]; onDone: () => Promise<void> }) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("50");
  const [requiresCertification, setRequiresCertification] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <form
        className="grid gap-3 rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            await api("/api/admin/categories", "POST", {
              slug,
              name,
              description,
              sortOrder: Number(sortOrder),
              requiresCertification,
              active: true,
            });
            setSlug("");
            setName("");
            setDescription("");
            await onDone();
          } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not save category.");
          }
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Slug</span>
          <input value={slug} onChange={(event) => setSlug(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Description</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Sort order</span>
          <input value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none" />
        </label>
        <label className="flex items-center gap-2 self-end text-body-sm text-charcoal-900">
          <input type="checkbox" checked={requiresCertification} onChange={(event) => setRequiresCertification(event.target.checked)} />
          Requires certification to verify
        </label>
        <div className="self-end">
          <Button type="submit">Save category</Button>
        </div>
      </form>
      {error ? <p className="text-body-sm text-error">{error}</p> : null}

      <ul className="flex flex-col divide-y divide-forest-900/8 rounded-xl border border-forest-900/10 bg-white shadow-sm">
        {categories.map((category) => (
          <li key={category.slug} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-body font-semibold text-charcoal-900">{category.name}</p>
              <p className="t-caption text-muted-600">
                {category.slug} · order {category.sort_order}
                {category.requires_certification ? " · certification required" : ""}
              </p>
            </div>
            <span className="text-body-sm text-muted-600">{category.active ? "active" : "hidden"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingPanel({
  limits,
  categories,
  onDone,
}: {
  limits: PricingLimit[];
  categories: Category[];
  onDone: () => Promise<void>;
}) {
  const [categorySlug, setCategorySlug] = useState("");
  const [minRupees, setMinRupees] = useState("");
  const [maxRupees, setMaxRupees] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <form
        className="grid gap-3 rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            await api("/api/admin/pricing-limits", "POST", {
              categorySlug: categorySlug || null,
              minPaise: Math.round(Number(minRupees) * 100),
              maxPaise: Math.round(Number(maxRupees) * 100),
            });
            setMinRupees("");
            setMaxRupees("");
            await onDone();
          } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not save limits.");
          }
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Category (empty = global fallback)</span>
          <select value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none">
            <option value="">Global</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Minimum (₹ per 60 min)</span>
          <input value={minRupees} onChange={(event) => setMinRupees(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Maximum (₹ per 60 min)</span>
          <input value={maxRupees} onChange={(event) => setMaxRupees(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none" />
        </label>
        <div className="self-end">
          <Button type="submit">Save limits</Button>
        </div>
      </form>
      {error ? <p className="text-body-sm text-error">{error}</p> : null}
      <p className="t-caption text-muted-600">
        Limits are bounds only — trainers pick their own price inside them. Existing offerings keep
        working; trainers are asked to fix prices on their next edit.
      </p>

      <ul className="flex flex-col divide-y divide-forest-900/8 rounded-xl border border-forest-900/10 bg-white shadow-sm">
        {limits.map((limit) => (
          <li key={limit.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-body font-semibold text-charcoal-900">
                {limit.category_slug
                  ? categories.find((category) => category.slug === limit.category_slug)?.name ?? limit.category_slug
                  : "Global fallback"}
              </p>
              <p className="t-caption text-muted-600">per 60 minutes</p>
            </div>
            <p className="text-body-sm text-charcoal-900">
              {inr(limit.min_paise)} – {inr(limit.max_paise)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlansPanel({ plans, subscribers, onDone }: { plans: Plan[]; subscribers: Subscriber[]; onDone: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [periodDays, setPeriodDays] = useState("30");
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <form
        className="grid gap-3 rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            await api("/api/admin/subscription-plans", "POST", {
              name,
              description,
              pricePaise: Math.round(Number(priceRupees) * 100),
              periodDays: Number(periodDays),
            });
            setName("");
            setDescription("");
            setPriceRupees("");
            await onDone();
          } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "Could not save plan.");
          }
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Plan name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Description</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Price (₹)</span>
          <input value={priceRupees} onChange={(event) => setPriceRupees(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-caption text-muted-600">Period (days)</span>
          <input value={periodDays} onChange={(event) => setPeriodDays(event.target.value)} className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm focus:border-forest-900 focus:outline-none" />
        </label>
        <div className="self-end">
          <Button type="submit">Create plan</Button>
        </div>
      </form>
      {error ? <p className="text-body-sm text-error">{error}</p> : null}

      <ul className="flex flex-col divide-y divide-forest-900/8 rounded-xl border border-forest-900/10 bg-white shadow-sm">
        {plans.map((plan) => (
          <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="text-body font-semibold text-charcoal-900">{plan.name}</p>
              <p className="t-caption text-muted-600">{plan.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-body-sm text-charcoal-900">
                {inr(plan.price_paise)} / {plan.period_days} days
              </p>
              {plan.active ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await api("/api/admin/subscription-plans", "POST", { action: "deactivate", id: plan.id });
                    await onDone();
                  }}
                >
                  Deactivate
                </Button>
              ) : (
                <span className="text-body-sm text-muted-600">inactive</span>
              )}
            </div>
          </li>
        ))}
        {plans.length === 0 ? <li className="px-5 py-6 text-body-sm text-muted-600">No plans yet.</li> : null}
      </ul>

      <div className="rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm">
        <p className="t-overline text-terracotta-500">Active subscribers ({subscribers.length})</p>
        <ul className="flex flex-col divide-y divide-forest-900/8 pt-3">
          {subscribers.map((subscriber) => (
            <li key={`${subscriber.trainerId}-${subscriber.expiresAt}`} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span className="text-body-sm text-charcoal-900">
                {subscriber.trainerName} <span className="text-muted-600">({subscriber.trainerCode})</span>
              </span>
              <span className="text-body-sm text-muted-600">
                {subscriber.planName} · {subscriber.daysLeft} days left
              </span>
            </li>
          ))}
          {subscribers.length === 0 ? (
            <li className="py-2 text-body-sm text-muted-600">No active subscriptions.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function ReportsPanel({ reports, onDone }: { reports: AdminReport[]; onDone: () => Promise<void> }) {
  return (
    <div className="flex flex-col gap-4">
      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-forest-900/15 bg-white p-8 text-center shadow-sm">
          <p className="t-h4 text-charcoal-900">No open reports</p>
          <p className="pt-2 text-body-sm text-muted-600">Reports from trainers&apos; profiles appear here.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {reports.map((report) => (
            <li key={report.id} className="rounded-xl border border-forest-900/8 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="t-h4 text-charcoal-900">
                    <a href={`/trainers/${report.slug}`} className="underline">
                      {report.trainer_name}
                    </a>{" "}
                    <span className="t-caption text-muted-600">({report.trainer_code})</span>
                  </p>
                  <p className="pt-1 text-body-sm text-muted-600">
                    {report.reason} · reported by {report.reporter_contact} ·{" "}
                    {new Date(report.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await api(`/api/admin/reports/${report.id}`, "POST", { action: "resolve" });
                      await onDone();
                    }}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await api(`/api/admin/reports/${report.id}`, "POST", { action: "dismiss" });
                      await onDone();
                    }}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await api(`/api/admin/trainers/${report.trainer_id}`, "POST", { action: "suspend" });
                      await onDone();
                    }}
                  >
                    Suspend trainer
                  </Button>
                </div>
              </div>
              {report.details ? <p className="pt-3 text-body-sm text-charcoal-900">{report.details}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
