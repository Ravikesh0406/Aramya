import { getCurrentUser } from "@/lib/server/session";
import { getTrainerByUserId } from "@/lib/server/trainers";
import { resolveBookingMeetingUrl, expireStaleRequests, listTargetedBookingsForTrainer, listVisibleBookings } from "@/lib/server/store";
import { getReviewForBooking } from "@/lib/server/reviews";

export const dynamic = "force-dynamic";

/** Targeted requests addressed to the signed-in trainer (never other trainers'). */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) {
    return Response.json({ error: "Trainer profile not found." }, { status: 404 });
  }

  void expireStaleRequests();
  const targeted = await listTargetedBookingsForTrainer(user.id);
  const open = await listVisibleBookings(user);

  // Meeting links stay private: only for this trainer's confirmed online bookings.
  const withLinks = await Promise.all(
    targeted.map(async (booking) => {
      if (booking.format === "online" && booking.status === "Confirmed") {
        return { ...booking, meetingUrl: await resolveBookingMeetingUrl(booking.id) };
      }
      return booking;
    }),
  );

  const reviews = await Promise.all(
    withLinks
      .filter((booking) => booking.status === "Completed")
      .map(async (booking) => ({ bookingId: booking.id, review: await getReviewForBooking(booking.id) })),
  );

  return Response.json({ targeted: withLinks, open, reviews, locked: trainer.status !== "submitted" });
}
