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

export type NearbyQuery = { lat: number; lng: number; radiusKm?: number };

export async function getBookings(near?: NearbyQuery): Promise<BookingRequest[]> {
  try {
    const params = new URLSearchParams();
    if (near) {
      params.set("lat", String(near.lat));
      params.set("lng", String(near.lng));
      if (near.radiusKm) params.set("radiusKm", String(near.radiusKm));
    }
    const query = params.size > 0 ? `?${params.toString()}` : "";
    const response = await fetch(`/api/bookings${query}`, { cache: "no-store" });
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

export function useBookings(near?: NearbyQuery | null) {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const nearKey = near ? `${near.lat.toFixed(4)}:${near.lng.toFixed(4)}:${near.radiusKm ?? ""}` : "";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextBookings = await getBookings(near ?? undefined);
      if (!cancelled) {
        setBookings(nextBookings);
        setLoading(false);
      }
    }

    setLoading(true);
    void load();
    const onChange = () => void load();
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT_NAME, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT_NAME, onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearKey]);

  return { bookings, loading };
}

export type { BookingInput, BookingRequest, BookingStatus };
