"use client";

// Client helpers for the trainer workspace (all session-scoped; the server
// always resolves the trainer from the session, never from a client id).

const MUTATION_HEADERS = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" };

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? MUTATION_HEADERS : { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export type TrainerCategoryRef = { category_slug: string; is_primary: boolean };
export type TrainerOffering = {
  id: string;
  category_slug: string;
  format: "home_visit" | "online";
  duration_min: number;
  price_paise: number;
  sessions_in_package: number;
  active: boolean;
  meeting_url: string | null;
};
export type TrainerArea = { id: string; city: string; locality: string; pin_code: string };
export type TrainerAvailability = { id: string; weekday: number; start_time: string; end_time: string };
export type TrainerCertification = {
  id: string;
  name: string;
  issuer: string;
  year: number | null;
  hasDocument: boolean;
};
export type TrainerInfo = {
  userId: string;
  name: string;
  contact: string;
  email: string | null;
  trainerCode: string;
  slug: string;
  bio: string;
  yearsExperience: number;
  languages: string[];
  photoKey: string | null;
  serviceRadiusKm: number;
  status: "draft" | "submitted" | "suspended";
  verificationStatus: "pending" | "verified" | "rejected";
  verificationNote: string | null;
  hasLocation: boolean;
  locationConsentAt: string | null;
  submittedAt: string | null;
};

export type TrainerProfile = {
  trainer: TrainerInfo;
  categories: TrainerCategoryRef[];
  offerings: TrainerOffering[];
  areas: TrainerArea[];
  availability: TrainerAvailability[];
  certifications: TrainerCertification[];
  subscription: { planName: string; expiresAt: string; daysLeft: number } | null;
  rating: { count: number; average: number | null };
  listingFeeRequired: boolean;
  uploadsConfigured: boolean;
};

export async function fetchTrainerProfile(): Promise<TrainerProfile> {
  return request<TrainerProfile>("/api/trainer/profile");
}

export async function saveBasics(input: {
  name?: string;
  bio?: string;
  yearsExperience?: number;
  languages?: string[];
  email?: string;
}) {
  return request<{ trainer: unknown }>("/api/trainer/basics", "PUT", input);
}

export async function saveCategories(categories: { slug: string; primary?: boolean }[]) {
  return request<{ trainer: unknown; categories: unknown }>("/api/trainer/categories", "PUT", { categories });
}

export async function saveAreas(input: { radiusKm: number; areas: { city: string; locality: string; pinCode: string }[] }) {
  return request<{ trainer: unknown }>("/api/trainer/areas", "PUT", input);
}

export async function saveLocation(input: { lat: number; lng: number; accuracy?: number | null; consent: true }) {
  return request<{ trainer: unknown }>("/api/trainer/areas", "POST", input);
}

export async function saveAvailability(ranges: { weekday: number; startTime: string; endTime: string }[]) {
  return request<{ availability: unknown }>("/api/trainer/availability", "PUT", { ranges });
}

export async function saveCertifications(
  certifications: { name: string; issuer: string; year: number | null; documentKey?: string | null }[],
) {
  return request<{ certifications: unknown }>("/api/trainer/certifications", "PUT", { certifications });
}

export async function createOffering(input: {
  categorySlug: string;
  format: "home_visit" | "online";
  durationMin: number;
  pricePaise: number;
  sessionsInPackage: number;
  active: boolean;
  meetingUrl?: string | null;
}) {
  return request<{ offering: unknown }>("/api/trainer/offerings", "POST", input);
}

export async function updateOffering(id: string, input: Record<string, unknown>) {
  return request<{ offering: unknown }>(`/api/trainer/offerings/${id}`, "PATCH", input);
}

export async function deleteOffering(id: string) {
  return request<{ ok: boolean }>(`/api/trainer/offerings/${id}`, "DELETE");
}

export async function uploadTrainerFile(input: { dataUrl: string; kind?: "photo" | "document"; folder?: string }) {
  return request<{ key: string }>("/api/trainer/photo", "POST", input);
}

export async function submitProfile() {
  return request<{ trainer: unknown }>("/api/trainer/submit", "POST");
}

export async function fetchRequests() {
  return request<{
    targeted: (import("@/lib/models").BookingRequest & { meetingUrl?: string | null })[];
    open: import("@/lib/models").BookingRequest[];
    reviews: { bookingId: string; review: unknown }[];
    locked: boolean;
  }>("/api/trainer/requests");
}

export async function declineRequest(id: string) {
  return request<{ booking: unknown }>(`/api/bookings/${id}/decline`, "POST");
}

export async function acceptRequest(id: string) {
  return request<{ booking: unknown }>(`/api/bookings/${id}/accept`, "POST");
}

export async function setBookingMeetingUrl(id: string, meetingUrl: string | null) {
  return request<{ booking: unknown; meetingUrl: string | null }>(`/api/bookings/${id}/meeting-link`, "PATCH", {
    meetingUrl,
  });
}

export async function fetchSubscription() {
  return request<{
    active: { planName: string; expiresAt: string; daysLeft: number } | null;
    history: { id: string; planId: string; status: string; amountPaise: number; createdAt: string }[];
    plans: { id: string; name: string; description: string; pricePaise: number; periodDays: number }[];
    listingFeeRequired: boolean;
  }>("/api/trainer/subscription");
}

export async function purchaseSubscription(planId: string) {
  return request<{
    orderId: string;
    mock: boolean;
    plan: { id: string; name: string; pricePaise: number; periodDays: number };
    active: { planName: string; expiresAt: string; daysLeft: number } | null;
  }>("/api/trainer/subscription", "POST", { planId });
}

export async function cancelSubscription() {
  return request<{ cancelled: boolean }>("/api/trainer/subscription", "DELETE");
}
