import { ImageResponse } from "next/og";

export const alt = "Derso — Kurs ve okul ders programı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(165deg, #071512 0%, #0c241f 55%, #0a1c18 100%)",
          color: "#fff",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.04em",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#2dd4bf",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#071512",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            D
          </div>
          Derso
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 750,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
              maxWidth: 900,
            }}
          >
            Haftalık ders programını dakikalar içinde kurun
          </div>
          <div
            style={{
              fontSize: 26,
              color: "rgba(232,244,240,0.78)",
              maxWidth: 820,
              lineHeight: 1.4,
            }}
          >
            Kurs merkezleri ve okullar için otomatik çizelgeleme, Excel aktarım
            ve yazdırılabilir çıktılar.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#2dd4bf",
            fontWeight: 600,
          }}
        >
          dersomatik.com
        </div>
      </div>
    ),
    { ...size }
  );
}
