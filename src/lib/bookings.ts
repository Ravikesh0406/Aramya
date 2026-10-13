"use client";

import { useEffect, useState } from "react";
import type { BookingInput, BookingRequest, BookingStatus, BookingRequest as BookingRequestType } from "@/lib/models";

const EVENT_NAME = "aramya:bookingsChanged";
function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

async function requestBooking(path: string, method = "GET", body?: unknown): Promise<BookingRequestType> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (method !== "GET") headers.set("X-Requested-With", "XMLHttpRequest");
  const response = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = (await response.json()) as { booking?: BookingRequestType; error?: string };
  if (!response.ok || !data.booking) {
    throw new Error(data.error ?? "Request failed.");
  }
  notify();
  return data.booking;
}

export async function getBookings(): Promise<BookingRequest[]> {
  try {
    const response = await fetch("/api/bookings", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { bookings?: BookingRequest[] };
    return Array.isArray(data.bookings) ? data.bookings : [];
  } catch {
    return [];
  }
}

export async function createBooking(input: BookingInput): Promise<BookingRequest> {
  return requestBooking("/api/bookings", "POST", input);
}

export async function acceptBooking(id: string) {
  return requestBooking(`/api/bookings/${id}/accept`, "POST");
}

export async function cancelBooking(id: string) {
  return requestBooking(`/api/bookings/${id}/cancel`, "POST");
}

export async function requestReschedule(id: string, days: string[], time: string, specificTime: string) {
  return requestBooking(`/api/bookings/${id}/reschedule`, "POST", { days, time, specificTime });
}

export async function acceptReschedule(id: string) {
  return requestBooking(`/api/bookings/${id}/reschedule/accept`, "POST");
}

export async function declineReschedule(id: string) {
  return requestBooking(`/api/bookings/${id}/reschedule/decline`, "POST");
}

export async function rescheduleTargeted(
  id: string,
  proposal: { weekdays: number[]; startTime: string },
) {
  return requestBooking(`/api/bookings/${id}/reschedule`, "POST", proposal);
}

export async function confirmBooking(id: string) {
  return requestBooking(`/api/bookings/${id}/confirm`, "POST");
}

export async function setSessionState(id: string, action: "start" | "complete" | "noshow") {
  return requestBooking(`/api/bookings/${id}/session`, "POST", { action });
}

export async function leaveReview(input: {
  bookingId: string;
  rating: number;
  comment: string;
}) {
  const headers = new Headers({ "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" });
  const response = await fetch("/api/reviews", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as { review?: unknown; error?: string };
  if (!response.ok) throw new Error(data.error ?? "Could not save your review.");
  notify();
  return data.review;
}

export function useBookings() {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextBookings = await getBookings();
      if (!cancelled) {
        setBookings(nextBookings);
        setLoading(false);
      }
    }

    void load();
    window.addEventListener("storage", load);
    window.addEventListener(EVENT_NAME, load);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", load);
      window.removeEventListener(EVENT_NAME, load);
    };
  }, []);

  return { bookings, loading };
}

export type { BookingInput, BookingRequest, BookingStatus };
