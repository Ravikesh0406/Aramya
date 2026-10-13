// ARAMYA — environment switches. One place so feature flags stay consistent.

export function bookingPaymentsEnabled(): boolean {
  return (process.env.BOOKING_PAYMENTS_ENABLED ?? "false").toLowerCase() === "true";
}

export function listingFeeRequired(): boolean {
  return (process.env.LISTING_FEE_REQUIRED ?? "false").toLowerCase() === "true";
}

export function razorpayMockMode(): boolean {
  return !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;
}
