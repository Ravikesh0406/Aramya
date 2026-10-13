"use client";

// Client helpers for the public marketplace: fetch a trainer profile, and send a
// targeted booking request. Everything is validated server-side.

import type {
  PublicOffering,
  PublicTrainerCard,
} from "@/lib/server/search-types";

export type PublicTrainerProfile = PublicTrainerCard & {
  serviceRadiusKm: number;
  offerings: PublicOffering[];
  availability: { weekday: number; startTime: string; endTime: string }[];
  certifications: { name: string; issuer: string; year: number | null }[];
  reviews: { rating: number; comment: string; customerName: string; createdAt: string }[];
};

const MUTATION_HEADERS = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" };

export async function getPublicTrainerProfile(slug: string): Promise<PublicTrainerProfile | null> {
  const response = await fetch(`/api/trainers/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load this trainer profile.");
  const data = (await response.json()) as { trainer: PublicTrainerProfile | null };
  return data.trainer;
}

export async function createTargetedBooking(input: {
  trainerSlug: string;
  offeringId: string;
  weekdays: number[];
  startTime: string;
  location: string;
}): Promise<{ bookingId: string }> {
  const response = await fetch("/api/bookings/targeted", {
    method: "POST",
    headers: MUTATION_HEADERS,
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as { error?: string; bookingId?: string };
  if (!response.ok || !data.bookingId) {
    throw new Error(data.error ?? "Could not send your request.");
  }
  return { bookingId: data.bookingId };
}
