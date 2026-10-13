#!/usr/bin/env node
// Dev-only seed: clearly fake trainers for local testing.
//
// Refuses to run when NODE_ENV=production, or when DATABASE_URL does not look
// like a local/dev database, unless --allow-remote is passed.
// Sample trainers never appear in production paths or are described as real.

import { closePool, ensureSchema, queryOne, randomId } from "../src/lib/server/db.ts";
import { seedReferenceData } from "../src/lib/server/seed.ts";
import {
  getTrainerByUserId,
  insertOffering,
  replaceTrainerAreas,
  replaceTrainerAvailability,
  replaceTrainerCategories,
  setVerificationStatus,
  submitTrainerProfile,
  updateTrainerBasics,
} from "../src/lib/server/trainers.ts";
import { createUser } from "../src/lib/server/store.ts";
import { hashPassword } from "../src/lib/server/password.ts";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "postgres", "host.docker.internal"];

function assertSafeToSeed(url: string, force: boolean) {
  if (process.env.NODE_ENV === "production" && !force) {
    throw new Error("Refusing to seed sample trainers in production.");
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }
  const name = parsed.pathname.replace(/^\//, "");
  if (force) return;
  if (parsed.hostname !== "" && !LOCAL_HOSTS.includes(parsed.hostname.split(":")[0])) {
    throw new Error(
      `Refusing to seed a non-local database (${parsed.hostname}). Pass --allow-remote to override.`,
    );
  }
  if (!name.includes("dev") && !name.includes("local") && !name.includes("test")) {
    throw new Error(
      `Refusing to seed "${name}": this does not look like a dev database. Pass --allow-remote to override.`,
    );
  }
}

type SampleTrainer = {
  name: string;
  bio: string;
  years: number;
  languages: string[];
  category: string;
  format: "home_visit" | "online";
  durationMin: number;
  pricePaise: number;
  sessionsInPackage: number;
  meetingUrl?: string;
  areas: { city: string; locality: string; pinCode: string }[];
  availability: { weekday: number; startTime: string; endTime: string }[];
};

const SAMPLES: SampleTrainer[] = [
  {
    name: "Sample Trainer Aarav",
    bio: "SAMPLE RECORD - not a real trainer. Yoga and mobility work for beginners and returning practitioners, one to one, at a pace you set.",
    years: 6,
    languages: ["English", "Hindi"],
    category: "yoga",
    format: "home_visit",
    durationMin: 60,
    pricePaise: 60000,
    sessionsInPackage: 1,
    areas: [
      { city: "New Delhi", locality: "Vasant Vihar", pinCode: "110057" },
      { city: "New Delhi", locality: "RK Puram", pinCode: "110022" },
    ],
    availability: [
      { weekday: 1, startTime: "06:00", endTime: "09:00" },
      { weekday: 3, startTime: "17:00", endTime: "20:00" },
      { weekday: 5, startTime: "06:30", endTime: "10:00" },
    ],
  },
  {
    name: "Sample Trainer Diya",
    bio: "SAMPLE RECORD - not a real trainer. Strength and conditioning with a mobility-first approach, built around the equipment you already have.",
    years: 9,
    languages: ["English", "Hindi"],
    category: "fitness-personal-training",
    format: "home_visit",
    durationMin: 60,
    pricePaise: 90000,
    sessionsInPackage: 8,
    areas: [{ city: "New Delhi", locality: "Hauz Khas", pinCode: "110016" }],
    availability: [
      { weekday: 2, startTime: "06:00", endTime: "09:00" },
      { weekday: 4, startTime: "18:00", endTime: "21:00" },
      { weekday: 6, startTime: "07:00", endTime: "11:00" },
    ],
  },
  {
    name: "Sample Trainer Ishaan",
    bio: "SAMPLE RECORD - not a real trainer. Breathwork and meditation sessions online, suitable for complete beginners.",
    years: 4,
    languages: ["English"],
    category: "meditation-mindfulness",
    format: "online",
    durationMin: 45,
    pricePaise: 40000,
    sessionsInPackage: 1,
    meetingUrl: "https://zoom.us/j/sample-not-real",
    areas: [],
    availability: [
      { weekday: 0, startTime: "07:00", endTime: "10:00" },
      { weekday: 2, startTime: "19:00", endTime: "21:00" },
      { weekday: 4, startTime: "07:00", endTime: "10:00" },
    ],
  },
  {
    name: "Sample Trainer Meera",
    bio: "SAMPLE RECORD - not a real trainer. Pre- and post-natal yoga with certifications on file, trained to work gently and safely.",
    years: 11,
    languages: ["English", "Hindi", "Marathi"],
    category: "prenatal-postnatal-yoga",
    format: "online",
    durationMin: 60,
    pricePaise: 120000,
    sessionsInPackage: 1,
    meetingUrl: "https://zoom.us/j/sample-not-real",
    areas: [{ city: "Pune", locality: "Kothrud", pinCode: "411038" }],
    availability: [
      { weekday: 1, startTime: "08:00", endTime: "11:00" },
      { weekday: 3, startTime: "08:00", endTime: "11:00" },
      { weekday: 5, startTime: "16:00", endTime: "19:00" },
    ],
  },
];

async function seedSample(sample: SampleTrainer, index: number) {
  const contact = `sample${index + 1}`;
  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE contact = $1 AND role = 'trainer'",
    [contact],
  );
  if (existing) {
    const trainer = await getTrainerByUserId(existing.id);
    if (trainer) {
      console.log(`  ${sample.name} already present (${trainer.slug}).`);
      return;
    }
  }

  const user = await createUser({
    name: sample.name,
    contact,
    role: "trainer",
    passwordHash: hashPassword("sample-password"),
  });
  const trainer = await getTrainerByUserId(user.id);
  if (!trainer) throw new Error("profile not created");

  await updateTrainerBasics(user.id, {
    bio: sample.bio,
    yearsExperience: sample.years,
    languages: sample.languages,
  });
  await replaceTrainerCategories(user.id, [{ slug: sample.category, primary: true }]);
  if (sample.areas.length > 0) {
    await replaceTrainerAreas(user.id, sample.areas);
  }
  await replaceTrainerAvailability(user.id, sample.availability);
  if (sample.category === "prenatal-postnatal-yoga") {
    const { replaceTrainerCertifications } = await import("../src/lib/server/trainers.ts");
    await replaceTrainerCertifications(user.id, [
      { name: "Pre & Postnatal Yoga (SAMPLE)", issuer: "Sample Institute", year: 2018 },
    ]);
  }
  await insertOffering(user.id, {
    categorySlug: sample.category,
    format: sample.format,
    durationMin: sample.durationMin,
    pricePaise: sample.pricePaise,
    sessionsInPackage: sample.sessionsInPackage,
    active: true,
    meetingUrl: sample.format === "online" ? (sample.meetingUrl ?? null) : null,
  });
  await submitTrainerProfile(user.id);
  await setVerificationStatus(user.id, "verified", null, "seed");

  console.log(`  ${sample.name} -> /trainers/${trainer.slug}`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const force = process.argv.includes("--allow-remote");
  assertSafeToSeed(url, force);

  await ensureSchema();
  await seedReferenceData();
  console.log("Seeding sample trainers (all records are fake):");
  for (const [index, sample] of SAMPLES.entries()) {
    await seedSample(sample, index);
  }
  console.log(`Done. Sample trainer password: "sample-password".`);
  void randomId;
  await closePool();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
