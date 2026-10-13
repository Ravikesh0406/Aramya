// ARAMYA — shared validation helpers (server-side truth for onboarding + booking).

export const PIN_PATTERN = /^[1-9][0-9]{5}$/;
export const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export const DURATION_MIN_MIN = 15;
export const DURATION_MAX_MIN = 180;
export const DURATION_STEP_MIN = 15;

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function isValidDuration(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= DURATION_MIN_MIN &&
    minutes <= DURATION_MAX_MIN &&
    minutes % DURATION_STEP_MIN === 0
  );
}

export function toMinutes(time: string): number | null {
  if (!isValidTime(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function normalizeAreaText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function succeed<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

/** Minutes must land on a 15-minute boundary. */
export function isQuarterHour(value: number): boolean {
  return value % 15 === 0;
}

export function overlapsInterval(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}
