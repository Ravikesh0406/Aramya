export type UserRole = "customer" | "trainer";

export type UserProfile = {
  id: string;
  name: string;
  contact: string;
  role: UserRole;
  email?: string | null;
  verified?: boolean;
};

export type BookingStatus =
  | "Requested"
  | "Accepted"
  | "Confirmed"
  | "Upcoming"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Declined"
  | "Reschedule Requested"
  | "Rescheduled"
  | "No Show"
  | "Expired"
  | "Disputed";

export type BookingFormat = "home_visit" | "online";

export type BookingRequest = {
  id: string;
  reference: string;
  createdAt: string;
  location: string;
  serviceSlug: string;
  serviceName: string;
  days: string[];
  time: string;
  specificTime: string;
  status: BookingStatus;
  trainerName: string | null;
  trainerId: string | null;
  offeringId: string | null;
  pricePaise: number | null;
  durationMin: number | null;
  packageSessions: number | null;
  format: BookingFormat | null;
  startTime: string | null;
  endTime: string | null;
  requestKind: "open" | "targeted";
  proposedDays: string[] | null;
  proposedTime: string | null;
  proposedSpecificTime: string | null;
  proposedBy: string | null;
  updatedAt: string;
};

export type BookingInput = Omit<
  BookingRequest,
  | "id"
  | "reference"
  | "createdAt"
  | "status"
  | "trainerName"
  | "trainerId"
  | "offeringId"
  | "pricePaise"
  | "durationMin"
  | "packageSessions"
  | "format"
  | "startTime"
  | "endTime"
  | "requestKind"
  | "proposedDays"
  | "proposedTime"
  | "proposedSpecificTime"
  | "proposedBy"
  | "updatedAt"
>;
