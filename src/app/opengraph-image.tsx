// Dynamic OG share image — no static assets needed.
import { ImageResponse } from "@vercel/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "#102B24",
          color: "#F7F3EA",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#8FA58E", fontWeight: 800 }}>
          ARAMYA · MANAGED AT-HOME TRAINING
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 800, lineHeight: 1.05, marginTop: 24 }}>
          <span>Fitness & wellness,</span>
          <span>at home.</span>
        </div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 32, color: "#F7F3EA", opacity: 0.8 }}>
          4-Session Trial ₹999 · Monthly Plan ₹4,500
        </div>
      </div>
    ),
    { ...size },
  );
}
