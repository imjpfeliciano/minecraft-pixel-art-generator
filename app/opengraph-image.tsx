import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0f172a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Pixel-grid background pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(121,192,90,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(121,192,90,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            left: -100,
            top: "50%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(121,192,90,0.18) 0%, transparent 70%)",
            transform: "translateY(-50%)",
          }}
        />

        {/* Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 32,
            zIndex: 1,
            padding: "48px 80px",
          }}
        >
          {/* Logo + wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "#79C05A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={36} height={36} viewBox="0 0 24 24" fill="white">
                <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#f8fafc",
                letterSpacing: "-0.5px",
              }}
            >
              mc-pixel
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: "#f8fafc",
                lineHeight: 1.1,
                letterSpacing: "-1px",
              }}
            >
              Convert any image into{" "}
              <span style={{ color: "#79C05A" }}>pixel-perfect</span> block art
            </span>
            <span
              style={{
                fontSize: 24,
                color: "#94a3b8",
                fontWeight: 400,
                lineHeight: 1.5,
              }}
            >
              Free · Browser-based · Exports Litematica schematics
            </span>
          </div>

          {/* Pills */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {["Upload Image", "Choose Blocks", "Download .litematic"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "8px 20px",
                  borderRadius: 999,
                  border: "1px solid rgba(121,192,90,0.4)",
                  background: "rgba(121,192,90,0.08)",
                  color: "#79C05A",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
