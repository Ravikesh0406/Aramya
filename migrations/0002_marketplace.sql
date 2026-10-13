-- ARAMYA 0002 — marketplace schema.
-- Trainer identity, profiles, offerings, availability, areas, certifications,
-- categories, pricing limits, listing subscriptions, reports, reviews.

-- ---------------------------------------------------------------- users additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_lat DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_lng DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_accuracy_m DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_consent_at TIMESTAMPTZ;

-- ------------------------------------------------------------- trainer_profiles
CREATE TABLE IF NOT EXISTS trainer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  trainer_code TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT NOT NULL DEFAULT '',
  years_experience INTEGER NOT NULL DEFAULT 0,
  languages TEXT NOT NULL DEFAULT '[]',
  photo_key TEXT,
  service_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'suspended')),
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_note TEXT,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainer_profiles_slug ON trainer_profiles (slug);
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_status ON trainer_profiles (status, verification_status);

-- -------------------------------------------------------------------- categories
CREATE TABLE IF NOT EXISTS categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  requires_certification BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------- trainer_categories
CREATE TABLE IF NOT EXISTS trainer_categories (
  trainer_id TEXT NOT NULL REFERENCES trainer_profiles (user_id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES categories (slug) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (trainer_id, category_slug)
);

CREATE INDEX IF NOT EXISTS idx_trainer_categories_slug ON trainer_categories (category_slug);

-- -------------------------------------------------------------- trainer_offerings
CREATE TABLE IF NOT EXISTS trainer_offerings (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer_profiles (user_id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES categories (slug) ON DELETE RESTRICT,
  format TEXT NOT NULL CHECK (format IN ('home_visit', 'online')),
  duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 15 AND 180),
  price_paise INTEGER NOT NULL CHECK (price_paise > 0),
  sessions_in_package INTEGER NOT NULL DEFAULT 1 CHECK (sessions_in_package >= 1),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  meeting_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainer_offerings_trainer ON trainer_offerings (trainer_id, active);
CREATE INDEX IF NOT EXISTS idx_trainer_offerings_category ON trainer_offerings (category_slug, active);

-- ----------------------------------------------------------- trainer_service_areas
CREATE TABLE IF NOT EXISTS trainer_service_areas (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer_profiles (user_id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  locality TEXT NOT NULL DEFAULT '',
  pin_code TEXT NOT NULL CHECK (pin_code ~ '^[1-9][0-9]{5}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trainer_service_areas_unique
  ON trainer_service_areas (trainer_id, city, locality, pin_code);
CREATE INDEX IF NOT EXISTS idx_trainer_service_areas_pin ON trainer_service_areas (pin_code);
CREATE INDEX IF NOT EXISTS idx_trainer_service_areas_city ON trainer_service_areas (city, locality);

-- ------------------------------------------------------------ trainer_availability
CREATE TABLE IF NOT EXISTS trainer_availability (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer_profiles (user_id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TEXT NOT NULL CHECK (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_time TEXT NOT NULL CHECK (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CHECK (start_time < end_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trainer_availability_slot
  ON trainer_availability (trainer_id, weekday, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_trainer_availability_weekday ON trainer_availability (trainer_id, weekday);

-- ---------------------------------------------------------- trainer_certifications
CREATE TABLE IF NOT EXISTS trainer_certifications (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer_profiles (user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL DEFAULT '',
  year INTEGER,
  document_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainer_certifications_trainer ON trainer_certifications (trainer_id);

-- ------------------------------------------------------------------ pricing_limits
CREATE TABLE IF NOT EXISTS pricing_limits (
  id TEXT PRIMARY KEY,
  category_slug TEXT REFERENCES categories (slug) ON DELETE CASCADE,
  min_paise INTEGER NOT NULL CHECK (min_paise > 0),
  max_paise INTEGER NOT NULL CHECK (max_paise >= min_paise),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- one limit per category, and a single global fallback row (category_slug IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_limits_category ON pricing_limits (category_slug);

-- -------------------------------------------------------------- subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_paise INTEGER NOT NULL CHECK (price_paise > 0),
  period_days INTEGER NOT NULL CHECK (period_days > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------ trainer_subscriptions
CREATE TABLE IF NOT EXISTS trainer_subscriptions (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer_profiles (user_id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans (id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainer_subscriptions_trainer ON trainer_subscriptions (trainer_id, status, expires_at);

-- ------------------------------------------------------------ subscription_payments
CREATE TABLE IF NOT EXISTS subscription_payments (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer_profiles (user_id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans (id) ON DELETE RESTRICT,
  order_id TEXT UNIQUE NOT NULL,
  payment_id TEXT UNIQUE,
  signature TEXT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------ profile_reports
CREATE TABLE IF NOT EXISTS profile_reports (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainer_profiles (user_id) ON DELETE CASCADE,
  reporter_contact TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_profile_reports_status ON profile_reports (status, created_at DESC);

-- ----------------------------------------------------------------------- area_interest
CREATE TABLE IF NOT EXISTS area_interest (
  id TEXT PRIMARY KEY,
  contact TEXT NOT NULL,
  pin_code TEXT NOT NULL CHECK (pin_code ~ '^[1-9][0-9]{5}$'),
  city TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_area_interest_unique ON area_interest (contact, pin_code);

-- --------------------------------------------------------------------------- reviews
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE CASCADE,
  trainer_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_trainer ON reviews (trainer_id, created_at DESC);

-- ------------------------------------------------------------------------- bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS trainer_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS offering_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_paise INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_min INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS package_sessions INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS format TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS request_kind TEXT NOT NULL DEFAULT 'open';

CREATE INDEX IF NOT EXISTS idx_bookings_trainer ON bookings (trainer_id, status);

-- Duplicate-submit guard: one open targeted request per customer + trainer + offering.
-- Legacy open requests keep trainer_id NULL, so they are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_open_targeted
  ON bookings (customer_id, trainer_id, offering_id)
  WHERE status = 'Requested' AND request_kind = 'targeted';

-- ---------------------------------------------------------------- seed categories
INSERT INTO categories (slug, name, description, sort_order, requires_certification) VALUES
  ('yoga', 'Yoga', 'One-to-one yoga practice led by a professional trainer.', 10, FALSE),
  ('fitness-personal-training', 'Fitness / Personal Training', 'Goal-based personal training at home or online.', 20, FALSE),
  ('mobility', 'Mobility', 'Movement-focused sessions that build flexibility, control and range.', 30, FALSE),
  ('weight-management', 'Weight Management', 'Training and lifestyle guidance within professional qualifications.', 40, FALSE),
  ('womens-wellness', 'Women''s Wellness', 'Strength, mobility and recovery focused sessions for women.', 50, FALSE),
  ('prenatal-postnatal-yoga', 'Prenatal & Postnatal Yoga', 'Specialised yoga practice for pregnancy and postnatal recovery.', 60, TRUE),
  ('meditation-mindfulness', 'Meditation & Mindfulness', 'Breathwork, meditation and mindfulness practice.', 70, FALSE),
  ('strength-fitness-training', 'Strength & Fitness Training', 'Structured strength and conditioning work.', 80, FALSE),
  ('senior-fitness-mobility', 'Senior Fitness & Mobility', 'Gentle, safe movement for older adults.', 90, FALSE),
  ('back-care-posture', 'Back Care & Posture', 'Movement and posture work within professional qualifications.', 100, FALSE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  requires_certification = EXCLUDED.requires_certification;

-- Seed placeholder pricing limits (owner to confirm): ₹200–₹5,000 per 60 minutes.
INSERT INTO pricing_limits (id, category_slug, min_paise, max_paise)
VALUES ('limits-global', NULL, 20000, 500000)
ON CONFLICT (id) DO UPDATE SET
  min_paise = EXCLUDED.min_paise,
  max_paise = EXCLUDED.max_paise;
