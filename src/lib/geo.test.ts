import { describe, expect, it } from "vitest";
import { haversineKm, formatKm, DEFAULT_MATCH_RADIUS_KM } from "@/lib/geo";

describe("geo", () => {
  it("measures Delhi–Noida at a few km and Delhi–Mumbai at ~1150 km", () => {
    expect(haversineKm(28.61, 77.2, 28.61, 77.2)).toBe(0);
    const noida = haversineKm(28.61, 77.2, 28.5355, 77.391);
    expect(noida).toBeGreaterThan(15);
    expect(noida).toBeLessThan(30);
    const mumbai = haversineKm(28.61, 77.2, 19.07, 72.87);
    expect(mumbai).toBeGreaterThan(1100);
    expect(mumbai).toBeLessThan(1200);
  });

  it("formats sub-km distances in meters", () => {
    expect(formatKm(0.4)).toBe("400 m away");
    expect(formatKm(2.34)).toBe("2.3 km away");
  });

  it("defaults the match radius to 8 km", () => {
    expect(DEFAULT_MATCH_RADIUS_KM).toBe(8);
  });
});
