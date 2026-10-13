// ARAMYA — public shape of marketplace types (shared by client + server code).

export type TrainerFormat = "home_visit" | "online";

export type PublicOffering = {
  id: string;
  categorySlug: string;
  format: TrainerFormat;
  durationMin: number;
  pricePaise: number;
  sessionsInPackage: number;
};

export type PublicCategory = { slug: string; name: string; primary: boolean };

export type PublicArea = { city: string; locality: string; pinCode: string };

export type RatingSummary = { count: number; average: number | null };

export type PublicTrainerCard = {
  slug: string;
  name: string;
  photoKey: string | null;
  bio: string;
  yearsExperience: number;
  languages: string[];
  primaryCategory: PublicCategory | null;
  categories: PublicCategory[];
  areas: PublicArea[];
  formats: TrainerFormat[];
  fromPricePaise: number | null;
  fromDurationMin: number | null;
  fromSessions: number;
  distanceLabel: string | null;
  rating: RatingSummary | null;
  verified: boolean;
};
