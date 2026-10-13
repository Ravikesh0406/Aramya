import { getCurrentUser } from "@/lib/server/session";
import {
  getTrainerByUserId,
  listCategories,
  listTrainerAreas,
  listTrainerAvailability,
  listTrainerCategories,
  listTrainerCertifications,
  listTrainerOfferings,
  submitTrainerProfile,
} from "@/lib/server/trainers";
import { BIO_MIN, BIO_MAX } from "@/lib/server/trainers";

export const dynamic = "force-dynamic";

export type CompletenessStep = {
  key: string;
  label: string;
  complete: boolean;
  hint: string;
};

/** Completeness used by onboarding and the dashboard. */
export async function getCompleteness(userId: string): Promise<CompletenessStep[]> {
  const trainer = await getTrainerByUserId(userId);
  const [categories, offerings, availability, areas, certifications] = await Promise.all([
    listTrainerCategories(userId),
    listTrainerOfferings(userId),
    listTrainerAvailability(userId),
    listTrainerAreas(userId),
    listTrainerCertifications(userId),
  ]);

  const hasInPerson = offerings.some((offering) => offering.format === "home_visit");
  const activeOfferings = offerings.filter((offering) => offering.active);

  // Certifications are only mandatory for categories flagged as requiring them.
  const allCategories = await listCategories(true);
  const gated = new Set(
    allCategories.filter((category) => category.requires_certification).map((category) => category.slug),
  );
  const needsCertification = categories.some((category) => gated.has(category.category_slug));

  return [
    {
      key: "basics",
      label: "Basics",
      complete: Boolean(
        trainer &&
          trainer.bio.length >= BIO_MIN &&
          trainer.bio.length <= BIO_MAX &&
          trainer.years_experience > 0 &&
          trainer.languages.length > 0 &&
          trainer.photo_key,
      ),
      hint: "Photo, bio, years of experience and languages.",
    },
    {
      key: "expertise",
      label: "Expertise",
      complete: categories.length > 0,
      hint: "At least one category, with a primary specialization.",
    },
    {
      key: "offerings",
      label: "Services & prices",
      complete: activeOfferings.length > 0,
      hint: "At least one active offering with a price and duration.",
    },
    {
      key: "availability",
      label: "Availability",
      complete: availability.length > 0,
      hint: "Time ranges for the days you can train.",
    },
    {
      key: "location",
      label: "Location & areas",
      complete: hasInPerson ? areas.length > 0 : true,
      hint: hasInPerson ? "Service areas are required for at-home sessions." : "Optional for online-only trainers.",
    },
    {
      key: "credentials",
      label: "Credentials",
      complete: needsCertification ? certifications.length > 0 : true,
      hint: needsCertification
        ? "Required for prenatal & postnatal categories."
        : "Optional. Add certifications to strengthen your profile.",
    },
  ];
}

export async function POST(request: Request) {
  if (request.headers.get("X-Requested-With") !== "XMLHttpRequest") {
    return Response.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  const user = await getCurrentUser(request);
  if (!user || user.role !== "trainer") {
    return Response.json({ error: "Trainer sign-in is required." }, { status: 401 });
  }

  const completeness = await getCompleteness(user.id);
  const incomplete = completeness.filter((step) => !step.complete);
  if (incomplete.length > 0) {
    return Response.json(
      {
        error: `Finish these steps first: ${incomplete.map((step) => step.label).join(", ")}.`,
        incomplete: incomplete.map((step) => step.key),
      },
      { status: 400 },
    );
  }

  const trainer = await submitTrainerProfile(user.id);
  return Response.json({ trainer });
}
