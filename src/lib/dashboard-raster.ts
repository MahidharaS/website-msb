// Draws the live dashboard DOM onto an offscreen canvas (frames, bars, real text, SVG
// charts) so the grain engine can sample it pixel by pixel. That is what lets the report
// turn into particles in place instead of cross-fading to a lookalike.

const SCALE = 0.75;

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function visible(c: string) {
  return c && c !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(c);
}

async function drawSvg(
  ctx: CanvasRenderingContext2D,
  el: SVGSVGElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const xml = new XMLSerializer().serializeToString(el);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    ctx.drawImage(img, x, y, w, h);
  } catch {
    /* skip a chart that fails to decode */
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function rasterizeDashboard(
  root: HTMLElement,
  stage: HTMLElement,
) {
  const base = stage.getBoundingClientRect();
  const W = Math.max(1, Math.round(base.width * SCALE));
  const H = Math.max(1, Math.round(base.height * SCALE));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.scale(SCALE, SCALE);
  for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-g]"))) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const x = r.left - base.left,
      y = r.top - base.top;
    const cs = getComputedStyle(el);
    const kind = el.dataset["g"];
    if (kind === "frame") {
      ctx.strokeStyle = visible(cs.borderTopColor)
        ? cs.borderTopColor
        : "rgba(242,240,234,.35)";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(x + 0.5, y + 0.5, r.width - 1, r.height - 1);
    } else if (kind === "fill") {
      ctx.fillStyle = visible(cs.backgroundColor)
        ? cs.backgroundColor
        : "#C6F432";
      ctx.fillRect(x, y, r.width, r.height);
    } else if (kind === "text") {
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      ctx.fillStyle = cs.color;
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const ls = parseFloat(cs.letterSpacing);
      if ("letterSpacing" in ctx)
        (ctx as unknown as { letterSpacing: string }).letterSpacing =
          Number.isFinite(ls) ? `${ls}px` : "0px";
      const size = parseFloat(cs.fontSize);
      const lh = parseFloat(cs.lineHeight) || size * 1.25;
      ctx.textBaseline = "top";
      const lines = wrap(ctx, text, r.width + 2);
      const align = cs.textAlign;
      lines.forEach((line, i) => {
        const tw = ctx.measureText(line).width;
        const tx =
          align === "center"
            ? x + (r.width - tw) / 2
            : align === "right" || align === "end"
              ? x + r.width - tw
              : x;
        ctx.fillText(line, tx, y + i * lh + (lh - size) / 2);
      });
    } else if (kind === "svg" && el instanceof SVGSVGElement) {
      await drawSvg(ctx, el, x, y, r.width, r.height);
    }
  }
  return {
    image: ctx.getImageData(0, 0, W, H),
    scale: SCALE,
    width: base.width,
    height: base.height,
  };
}
