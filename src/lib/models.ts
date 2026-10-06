export type UserRole = "customer" | "trainer";

export type UserProfile = {
  id: string;
  name: string;
  contact: string;
  role: UserRole;
  verified: boolean;
  homeLat: number | null;
  homeLng: number | null;
};

export type BookingStatus =
  | "Requested"
  | "Accepted"
  | "Confirmed"
  | "Upcoming"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Reschedule Requested"
  | "Rescheduled"
  | "No Show"
  | "Expired"
  | "Disputed";

export type BookingRequest = {
  id: string;
  reference: string;
  createdAt: string;
  location: string;
  /** Exact-match distance for trainers; null when either side lacks a GPS fix. */
  distanceKm: number | null;
  serviceSlug: string;
  serviceName: string;
  days: string[];
  time: string;
  specificTime: string;
  status: BookingStatus;
  trainerName: string | null;
  proposedDays: string[] | null;
  proposedTime: string | null;
  proposedSpecificTime: string | null;
  proposedBy: string | null;
  updatedAt: string;
  completedAt: string | null;
  customerConfirmed: boolean;
};

export type BookingInput = Omit<
  BookingRequest,
  "id" | "reference" | "createdAt" | "status" | "trainerName" | "proposedDays" | "proposedTime" | "proposedSpecificTime" | "proposedBy" | "updatedAt" | "distanceKm" | "completedAt" | "customerConfirmed"
> & {
  /** GPS fix captured at booking time; null when unavailable (legacy). */
  lat?: number | null;
  lng?: number | null;
};
