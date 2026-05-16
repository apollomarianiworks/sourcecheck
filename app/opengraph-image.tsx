import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SourceCheck — Check claims, inspect sources, compare evidence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Verdana, Geneva, sans-serif",
          padding: 96,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 40 }}>
          <div
            style={{
              width: 76,
              height: 76,
              background: "#cc0000",
              color: "#fff",
              fontSize: 50,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 72, fontWeight: 700, color: "#1a1a1a" }}>
            <span style={{ color: "#cc0000" }}>Source</span>Check
          </div>
        </div>

        <div style={{ fontSize: 40, color: "#262626", textAlign: "center", marginBottom: 24, lineHeight: 1.2 }}>
          Check claims. Inspect sources. Compare evidence.
        </div>

        <div style={{ fontSize: 22, color: "#5e5e5e", textAlign: "center", maxWidth: 880, lineHeight: 1.35 }}>
          A free, public source-quality scanner. Cross-references fact-checkers, news archives,
          and reference sources. Not a truth detector — a transparency layer.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 24,
            fontSize: 16,
            color: "#8a8a8a",
          }}
        >
          <span>Google Fact Check Tools</span>
          <span>·</span>
          <span>GDELT</span>
          <span>·</span>
          <span>Wikipedia</span>
          <span>·</span>
          <span>Local source rules</span>
        </div>
      </div>
    ),
    size
  );
}
