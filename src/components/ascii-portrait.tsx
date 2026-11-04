import { useEffect, useRef } from "react";

// The photo, re-drawn as data: each cell becomes a character whose weight follows the
// pixel's brightness, coloured along the portfolio palette. A draggable split (follows the
// pointer on desktop) shows the real photo on one side and the "data" version on the other.
const RAMP = " .,:;-=+*%#₹@";
const PALETTE = [
  "#4DA3FF",
  "#9B7BFF",
  "#FF5FA2",
  "#FF6B4A",
  "#FFB547",
  "#C6F432",
];

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const STOPS = PALETTE.map(hex);
function gradient(t: number) {
  const x = Math.max(0, Math.min(0.9999, t)) * (STOPS.length - 1);
  const i = Math.floor(x),
    f = x - i;
  const a = STOPS[i]!,
    b = STOPS[i + 1]!;
  return `rgb(${Math.round(a[0]! + (b[0]! - a[0]!) * f)},${Math.round(a[1]! + (b[1]! - a[1]!) * f)},${Math.round(a[2]! + (b[2]! - a[2]!) * f)})`;
}

export function AsciiPortrait({ src, alt }: { src: string; alt: string }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = host.current,
      cv = canvas.current;
    if (!el || !cv) return;
    const img = new Image();
    img.src = src;
    let alive = true;
    const draw = () => {
      if (!alive || !img.complete || !img.naturalWidth) return;
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      // image is drawn with object-fit: cover, anchored bottom-center — mirror that
      const scale = Math.max(
        r.width / img.naturalWidth,
        r.height / img.naturalHeight,
      );
      const dw = img.naturalWidth * scale,
        dh = img.naturalHeight * scale;
      const ox = (r.width - dw) / 2,
        oy = r.height - dh;
      const cell = r.width < 360 ? 6 : 8;
      const cols = Math.ceil(r.width / cell),
        rows = Math.ceil(r.height / (cell * 1.35));
      const sample = document.createElement("canvas");
      sample.width = cols;
      sample.height = rows;
      const sctx = sample.getContext("2d", { willReadFrequently: true });
      if (!sctx) return;
      sctx.drawImage(
        img,
        ox / cell,
        oy / (cell * 1.35),
        dw / cell,
        dh / (cell * 1.35),
      );
      const px = sctx.getImageData(0, 0, cols, rows).data;
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.font = `600 ${cell * 1.25}px "JetBrains Mono", monospace`;
      ctx.textBaseline = "top";
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const o = (y * cols + x) * 4;
          const l =
            (px[o]! * 0.299 + px[o + 1]! * 0.587 + px[o + 2]! * 0.114) / 255;
          if (l < 0.07) continue;
          const ch =
            RAMP[
              Math.min(
                RAMP.length - 1,
                Math.floor(Math.pow(l, 0.8) * RAMP.length),
              )
            ]!;
          ctx.fillStyle = gradient((y / rows) * 0.85 + (x / cols) * 0.15);
          ctx.globalAlpha = 0.35 + l * 0.65;
          ctx.fillText(ch, x * cell, y * cell * 1.35);
        }
      ctx.globalAlpha = 1;
    };
    img.onload = draw;
    if (img.complete) draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    void document.fonts?.ready.then(draw);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [src]);

  return (
    <div
      ref={host}
      className="ascii-portrait"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty(
          "--split",
          `${Math.max(8, Math.min(92, ((e.clientX - r.left) / r.width) * 100))}%`,
        );
      }}
      onPointerLeave={(e) => e.currentTarget.style.removeProperty("--split")}
    >
      <img src={src} alt={alt} width={900} height={1350} fetchPriority="high" />
      <canvas ref={canvas} aria-hidden="true" />
      <span className="ascii-split" aria-hidden="true" />
      <span className="ascii-tag mono" aria-hidden="true">
        PHOTO ⟷ DATA
      </span>
    </div>
  );
}
