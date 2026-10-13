import { getCurrentUser } from "@/lib/server/session";
import {
  getTrainerByUserId,
  listTrainerCategories,
  listTrainerOfferings,
  listTrainerAreas,
  listTrainerAvailability,
  listTrainerCertifications,
  listingFeeRequired,
} from "@/lib/server/trainers";
import { getActiveSubscription } from "@/lib/server/subscriptions";
import { ratingSummaryForTrainer } from "@/lib/server/reviews";
import { storageConfigured } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

/** Everything the onboarding + dashboard need for the signed-in trainer. */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }
  if (user.role !== "trainer") {
    return Response.json({ error: "Trainer account required." }, { status: 403 });
  }

  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) {
    return Response.json({ error: "Trainer profile not found." }, { status: 404 });
  }

  const [categories, offerings, areas, availability, certifications, subscription, rating] =
    await Promise.all([
      listTrainerCategories(user.id),
      listTrainerOfferings(user.id),
      listTrainerAreas(user.id),
      listTrainerAvailability(user.id),
      listTrainerCertifications(user.id),
      getActiveSubscription(user.id),
      ratingSummaryForTrainer(user.id),
    ]);

  return Response.json({
    trainer: {
      userId: trainer.user_id,
      name: trainer.name,
      contact: trainer.contact,
      email: trainer.email,
      trainerCode: trainer.trainer_code,
      slug: trainer.slug,
      bio: trainer.bio,
      yearsExperience: trainer.years_experience,
      languages: trainer.languages,
      photoKey: trainer.photo_key,
      serviceRadiusKm: trainer.service_radius_km,
      status: trainer.status,
      verificationStatus: trainer.verification_status,
      verificationNote: trainer.verification_note,
      hasLocation: trainer.home_lat !== null && trainer.home_lng !== null,
      locationConsentAt: trainer.location_consent_at,
      submittedAt: trainer.submitted_at,
    },
    categories,
    offerings,
    areas,
    availability,
    certifications,
    subscription,
    rating,
    listingFeeRequired: listingFeeRequired(),
    uploadsConfigured: storageConfigured(),
  });
}
