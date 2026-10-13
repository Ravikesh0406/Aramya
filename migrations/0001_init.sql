-- ARAMYA 0001 — initial schema (reproduces the pre-marketplace SQLite schema).
-- Tables: users, auth_sessions, bookings.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'trainer')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contact, role)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location TEXT NOT NULL,
  service_slug TEXT NOT NULL,
  service_name TEXT NOT NULL,
  days TEXT NOT NULL,
  time TEXT NOT NULL,
  specific_time TEXT NOT NULL,
  status TEXT NOT NULL,
  trainer_name TEXT,
  proposed_days TEXT,
  proposed_time TEXT,
  proposed_specific_time TEXT,
  proposed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
