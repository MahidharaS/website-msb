// Grain formations for the particle engine.
// Every formation has exactly GRAIN_COUNT points so any two can morph into each other.
// Image formations (portrait, contours, mountains) are pre-sampled from the supplied
// pixel-vector artwork into /public/grains/*.bin (int16 xyz / 4096 + rgb + pad, 10 bytes each).

export const GRAIN_COUNT = 48000;
export const TEX_W = 256;
export const TEX_H = Math.ceil(GRAIN_COUNT / TEX_W);

export type Formation = {
  /** RGBA float texture data: xyz + packed rgb */
  data: Float32Array;
  /** world-space anchor points used for DOM labels and swarm cursors */
  anchors: [number, number, number][];
};

const LIME: RGB = [0.776, 0.957, 0.196];
const PAPER: RGB = [0.949, 0.941, 0.918];
const OLIVE: RGB = [0.29, 0.353, 0.07];
const ASH: RGB = [0.45, 0.46, 0.43];
// accent family (matches --c-* tokens in styles.css)
const SKY: RGB = [0.3, 0.64, 1];
const VIOLET: RGB = [0.61, 0.48, 1];
const PINK: RGB = [1, 0.37, 0.64];
const CORAL: RGB = [1, 0.42, 0.29];
const AMBER: RGB = [1, 0.71, 0.28];
const MINT: RGB = [0.24, 0.86, 0.59];
const SPECTRUM: RGB[] = [SKY, VIOLET, PINK, CORAL, AMBER, LIME];
const FACE_COLORS: RGB[] = [CORAL, AMBER, SKY, MINT, PINK, VIOLET];
type RGB = [number, number, number];
type V3 = [number, number, number];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pack = (c: RGB, k = 1) =>
  Math.round(Math.min(1, c[0] * k) * 255) * 65536 +
  Math.round(Math.min(1, c[1] * k) * 255) * 256 +
  Math.round(Math.min(1, c[2] * k) * 255);

class Builder {
  data = new Float32Array(TEX_W * TEX_H * 4);
  i = 0;
  r: () => number;
  anchors: [number, number, number][] = [];
  constructor(seed: number) {
    this.r = rng(seed);
  }
  push(x: number, y: number, z: number, c: RGB, k = 1) {
    if (this.i >= GRAIN_COUNT) return;
    const o = this.i * 4;
    this.data[o] = x;
    this.data[o + 1] = y;
    this.data[o + 2] = z;
    this.data[o + 3] = pack(c, k);
    this.i++;
  }
  box(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    z0: number,
    z1: number,
    n: number,
    c: RGB,
    k = 1,
  ) {
    for (let j = 0; j < n; j++)
      this.push(
        x0 + (x1 - x0) * this.r(),
        y0 + (y1 - y0) * this.r(),
        z0 + (z1 - z0) * this.r(),
        c,
        k * (0.75 + this.r() * 0.35),
      );
  }
  line(a: V3, b: V3, n: number, c: RGB, k = 1, jitter = 0.008) {
    for (let j = 0; j < n; j++) {
      const t = this.r();
      this.push(
        a[0] + (b[0] - a[0]) * t + (this.r() - 0.5) * jitter,
        a[1] + (b[1] - a[1]) * t + (this.r() - 0.5) * jitter,
        a[2] + (b[2] - a[2]) * t + (this.r() - 0.5) * jitter,
        c,
        k * (0.8 + this.r() * 0.3),
      );
    }
  }
  rect(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    z: number,
    n: number,
    c: RGB,
    k = 1,
  ) {
    const w = x1 - x0,
      h = y1 - y0,
      per = 2 * (w + h);
    this.line([x0, y0, z], [x1, y0, z], Math.round((n * w) / per), c, k);
    this.line([x0, y1, z], [x1, y1, z], Math.round((n * w) / per), c, k);
    this.line([x0, y0, z], [x0, y1, z], Math.round((n * h) / per), c, k);
    this.line([x1, y0, z], [x1, y1, z], Math.round((n * h) / per), c, k);
  }
  sphere(
    cx: number,
    cy: number,
    cz: number,
    rad: number,
    n: number,
    c: RGB,
    k = 1,
    shell = true,
  ) {
    for (let j = 0; j < n; j++) {
      const u = this.r() * 2 - 1,
        th = this.r() * Math.PI * 2,
        s = Math.sqrt(1 - u * u);
      const rr = shell
        ? rad * (0.92 + this.r() * 0.08)
        : rad * Math.cbrt(this.r());
      this.push(
        cx + rr * s * Math.cos(th),
        cy + rr * u,
        cz + rr * s * Math.sin(th),
        c,
        k,
      );
    }
  }
  gauss() {
    return (
      Math.sqrt(-2 * Math.log(this.r() + 1e-9)) *
      Math.cos(2 * Math.PI * this.r())
    );
  }
  dust(spread = 4.5) {
    while (this.i < GRAIN_COUNT)
      this.push(
        (this.r() - 0.5) * spread * 2.2,
        (this.r() - 0.5) * spread * 1.3,
        (this.r() - 0.5) * 3,
        ASH,
        0.35,
      );
  }
  done(): Formation {
    this.dust();
    return { data: this.data, anchors: this.anchors };
  }
}

/** Loose cloud the hero assembles from. */
export function cloudFormation(): Formation {
  const b = new Builder(11);
  for (let j = 0; j < GRAIN_COUNT; j++) {
    const u = b.r() * 2 - 1,
      th = b.r() * Math.PI * 2,
      s = Math.sqrt(1 - u * u),
      rr = 3 + b.r() * 3.5;
    b.push(
      rr * s * Math.cos(th),
      rr * u * 0.7,
      rr * s * Math.sin(th) - 1,
      b.r() > 0.8 ? LIME : PAPER,
      0.5,
    );
  }
  return b.done();
}

/** Analyst: a Power BI style report page built from grains, with 3D bars. */
export function dashboardFormation(): Formation {
  const b = new Builder(21);
  const W = 2.8,
    H = 1.75; // half extents
  b.rect(-W, -H, W, H, 0, 2600, PAPER, 0.75);
  // header strip
  b.box(-W + 0.12, H - 0.28, -W + 1.4, H - 0.16, 0, 0.02, 500, PAPER, 0.8);
  // KPI tiles
  const tw = (2 * W - 0.24 - 0.3) / 4;
  for (let t = 0; t < 4; t++) {
    const x0 = -W + 0.12 + t * (tw + 0.1),
      x1 = x0 + tw,
      y1 = H - 0.42,
      y0 = y1 - 0.62;
    b.rect(x0, y0, x1, y1, 0.12, 700, PAPER, 0.85);
    // sparkline
    for (let s = 0; s < 14; s++) {
      const hgt = 0.06 + 0.22 * Math.abs(Math.sin(s * 0.7 + t * 1.9));
      const sx = x0 + 0.1 + s * ((tw - 0.2) / 14);
      b.box(
        sx,
        y0 + 0.08,
        sx + 0.035,
        y0 + 0.08 + hgt,
        0.1,
        0.16,
        55,
        LIME,
        0.9,
      );
    }
    b.anchors.push([x0, y1, 0.12], [x1, y0, 0.12]);
  }
  // bar chart (3D columns)
  const bx0 = -W + 0.15,
    bx1 = 0.35,
    by0 = -H + 0.25,
    by1 = 0.75;
  b.line([bx0, by0, 0], [bx1, by0, 0], 500, PAPER, 0.7);
  b.line([bx0, by0, 0], [bx0, by1, 0], 380, PAPER, 0.7);
  for (let g = 0; g < 4; g++)
    b.line(
      [bx0, by0 + (g + 1) * 0.6, -0.05],
      [bx1, by0 + (g + 1) * 0.6, -0.05],
      140,
      ASH,
      0.5,
      0.004,
    );
  const bars = 12,
    bw = (bx1 - bx0 - 0.2) / bars;
  for (let k = 0; k < bars; k++) {
    const h =
      (0.35 +
        0.65 *
          (0.5 + 0.5 * Math.sin(k * 0.62 + 0.4)) *
          (0.55 + (k / bars) * 0.45)) *
      (by1 - by0 - 0.15);
    const x = bx0 + 0.1 + k * bw;
    b.box(
      x + 0.02,
      by0 + 0.01,
      x + bw - 0.04,
      by0 + h,
      -0.08,
      0.14,
      Math.round(380 + h * 520),
      k === bars - 3 ? PAPER : LIME,
      0.95,
    );
  }
  b.anchors.push([bx0, by1, 0], [bx1, by0, 0]);
  // line + area chart
  const lx0 = 0.6,
    lx1 = W - 0.15,
    ly0 = 0.0,
    ly1 = 0.75;
  const f = (t: number) =>
    ly0 +
    0.12 +
    (ly1 - ly0 - 0.2) *
      (0.45 + 0.35 * Math.sin(t * 5.2) * Math.exp(-t) + t * 0.35);
  for (let j = 0; j < 4200; j++) {
    const t = b.r(),
      x = lx0 + (lx1 - lx0) * t,
      y = f(t);
    if (j < 1800) b.push(x, y + (b.r() - 0.5) * 0.012, 0.06, PAPER, 1);
    else b.push(x, ly0 + (y - ly0) * b.r(), 0.02 + b.r() * 0.02, OLIVE, 1.6);
  }
  b.rect(lx0, ly0, lx1, ly1, 0, 520, ASH, 0.6);
  // donut
  const dcx = (lx0 + lx1) / 2 - 0.45,
    dcy = -0.95,
    dr = 0.55;
  for (let j = 0; j < 5200; j++) {
    const a = b.r() * Math.PI * 2,
      rr = dr * (0.68 + 0.32 * Math.sqrt(b.r()));
    const seg = a < 2.6 ? LIME : a < 4.6 ? PAPER : OLIVE;
    b.push(
      dcx + Math.cos(a) * rr,
      dcy + Math.sin(a) * rr,
      0.08 + (b.r() - 0.5) * 0.06,
      seg,
      seg === OLIVE ? 1.8 : 0.95,
    );
  }
  // table rows
  for (let row = 0; row < 6; row++) {
    const y = -H + 0.32 + row * 0.2;
    b.line([dcx + 0.75, y, 0.02], [lx1 - 0.05, y, 0.02], 150, ASH, 0.7, 0.004);
    b.box(
      dcx + 0.75,
      y + 0.05,
      dcx + 0.75 + 0.25 + (row % 3) * 0.12,
      y + 0.1,
      0.02,
      0.03,
      90,
      row % 2 ? PAPER : LIME,
      0.75,
    );
  }
  return b.done();
}

/** ML engineer: a deep network whose output layer branches into outcomes. */
export function neuralFormation(): Formation {
  const b = new Builder(31);
  const layers = [5, 8, 10, 10, 8, 4];
  const xs = layers.map((_, i) => -2.45 + i * 0.84);
  const nodes: V3[][] = layers.map((n, li) =>
    Array.from({ length: n }, (_, k) => {
      const y = (k - (n - 1) / 2) * (n > 6 ? 0.36 : 0.5);
      return [xs[li]!, y, Math.sin(k * 1.3 + li) * 0.35] as V3;
    }),
  );
  // edges first (dim), then nodes on top
  for (let li = 0; li < layers.length - 1; li++)
    for (const a of nodes[li]!)
      for (const c of nodes[li + 1]!) b.line(a, c, 62, LIME, 0.42, 0.006);
  // recurrent self loops on hidden layers
  for (const li of [2, 3])
    for (const n of nodes[li]!)
      for (let j = 0; j < 70; j++) {
        const a = b.r() * Math.PI * 2;
        b.push(
          n[0] + Math.cos(a) * 0.12,
          n[1] + 0.13 + Math.sin(a) * 0.11,
          n[2] + Math.sin(a) * 0.05,
          LIME,
          0.8,
        );
      }
  for (const layer of nodes)
    for (const n of layer) b.sphere(n[0], n[1], n[2], 0.085, 230, PAPER, 1);
  // recursive branching from output nodes
  const branch = (p: V3, ang: number, len: number, depth: number) => {
    const q: V3 = [
      p[0] + Math.cos(ang) * len,
      p[1] + Math.sin(ang) * len,
      p[2] + (b.r() - 0.5) * 0.2,
    ];
    b.line(p, q, Math.round(220 * len), LIME, 0.95, 0.006);
    if (depth > 0) {
      branch(q, ang + 0.42, len * 0.68, depth - 1);
      branch(q, ang - 0.42, len * 0.68, depth - 1);
    } else b.sphere(q[0], q[1], q[2], 0.035, 40, PAPER, 1);
  };
  nodes[5]!.forEach((n, k) => branch(n, (k - 1.5) * 0.38, 0.36, 3));
  nodes[0]!.forEach((n) => b.anchors.push([n[0], n[1], n[2]]));
  nodes[5]!.forEach((n, k) => {
    const a = (k - 1.5) * 0.38;
    b.anchors.push([
      n[0] + Math.cos(a) * 0.86,
      n[1] + Math.sin(a) * 0.86,
      n[2],
    ]);
  });
  return b.done();
}

/** AI engineer: an embedding space with clusters, a query and retrieval rays. */
export function vectorFormation(): Formation {
  const b = new Builder(41);
  const palette: RGB[] = [LIME, PAPER, LIME, PAPER, LIME, PAPER, LIME, PAPER];
  const centers: V3[] = [];
  for (let k = 0; k < 8; k++) {
    const u = -0.75 + (k % 4) * 0.5 + (b.r() - 0.5) * 0.2,
      th = k * 2.4;
    const s = Math.sqrt(1 - u * u),
      rr = 2.05;
    centers.push([rr * s * Math.cos(th) * 1.25, rr * u, rr * s * Math.sin(th)]);
  }
  // latitude rings of the embedding sphere
  for (let ring = 0; ring < 9; ring++) {
    const lat = -1.2 + ring * 0.3,
      y = Math.sin(lat) * 2.6,
      rr = Math.cos(lat) * 2.6;
    for (let j = 0; j < 520; j++) {
      const a = b.r() * Math.PI * 2;
      b.push(Math.cos(a) * rr * 1.25, y, Math.sin(a) * rr, ASH, 0.55);
    }
  }
  // retrieval rays from the query to the nearest clusters
  centers.forEach((c, k) =>
    b.line([0, 0, 0], c, k < 3 ? 520 : 220, LIME, k < 3 ? 0.9 : 0.4, 0.004),
  );
  b.sphere(0, 0, 0, 0.16, 900, LIME, 1.1, false);
  centers.forEach((c, k) => {
    for (let j = 0; j < 3600; j++) {
      const g = 0.24 + (j % 3) * 0.05;
      b.push(
        c[0] + b.gauss() * g,
        c[1] + b.gauss() * g * 0.8,
        c[2] + b.gauss() * g,
        palette[k]!,
        0.65 + b.r() * 0.5,
      );
    }
    b.anchors.push([c[0], c[1], c[2]]);
  });
  return b.done();
}

/** Decode a pre-sampled artwork into a formation. */
export function imageFormation(
  buf: ArrayBuffer,
  opts: {
    tint?: RGB;
    tintAmount?: number;
    anchors?: [number, number, number][];
    gain?: number;
  } = {},
): Formation {
  const data = new Float32Array(TEX_W * TEX_H * 4);
  const view = new DataView(buf);
  const n = Math.min(GRAIN_COUNT, Math.floor(buf.byteLength / 10));
  const t = opts.tint ?? PAPER,
    ta = opts.tintAmount ?? 0,
    gain = opts.gain ?? 1;
  for (let i = 0; i < n; i++) {
    const o = i * 10;
    data[i * 4] = view.getInt16(o, true) / 4096;
    data[i * 4 + 1] = view.getInt16(o + 2, true) / 4096;
    data[i * 4 + 2] = view.getInt16(o + 4, true) / 4096;
    const c: RGB = [
      view.getUint8(o + 6) / 255,
      view.getUint8(o + 7) / 255,
      view.getUint8(o + 8) / 255,
    ];
    data[i * 4 + 3] = pack(
      [
        c[0] + (t[0] - c[0]) * ta,
        c[1] + (t[1] - c[1]) * ta,
        c[2] + (t[2] - c[2]) * ta,
      ],
      gain,
    );
  }
  return { data, anchors: opts.anchors ?? [] };
}

export const CONTOUR_ANCHORS: [number, number, number][] = [
  [-1.0, 1.6, 0.2],
  [0.9, 0.7, 0.2],
  [-0.7, -0.6, 0.2],
  [0.8, -1.9, 0.2],
];

export async function loadImageFormation(
  url: string,
  opts?: Parameters<typeof imageFormation>[1],
) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return imageFormation(await res.arrayBuffer(), opts);
}

/**
 * Sample a rasterised DOM layer into grains. Pixel coordinates map onto the z=0 plane of a
 * camera at z=8 with a 48° vertical field of view, so grains land exactly where the DOM was.
 */
export function canvasFormation(
  image: ImageData,
  scale: number,
  stageW: number,
  stageH: number,
): Formation {
  const b = new Builder(91);
  const { data, width, height } = image;
  const weights = new Float32Array(width * height);
  let total = 0;
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3]! / 255;
    const l = (data[i * 4]! + data[i * 4 + 1]! + data[i * 4 + 2]!) / 765;
    const w = a * (0.25 + l);
    weights[i] = w;
    total += w;
  }
  if (total <= 0) return dashboardFormation();
  const cdf = new Float32Array(width * height);
  let acc = 0;
  for (let i = 0; i < weights.length; i++) cdf[i] = acc += weights[i]! / total;
  const k = (2 * 8 * Math.tan((24 * Math.PI) / 180)) / stageH; // world units per css px
  for (let n = 0; n < GRAIN_COUNT; n++) {
    const u = b.r();
    let lo = 0,
      hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid]! < u) lo = mid + 1;
      else hi = mid;
    }
    const px = (lo % width) + b.r(),
      py = Math.floor(lo / width) + b.r();
    const o = lo * 4;
    const c: RGB = [data[o]! / 255, data[o + 1]! / 255, data[o + 2]! / 255];
    b.push(
      (px / scale - stageW / 2) * k,
      -(py / scale - stageH / 2) * k,
      (b.r() - 0.5) * 0.04,
      c,
      1.1,
    );
  }
  return b.done();
}

/** Database as a Rubik's cube: 27 glass cubies with bright edges. Twisting happens in the shader. */
export const CUBIE = 0.66;
export const CUBE_GAP = 0.07;
export function cubeFormation(): Formation {
  const b = new Builder(51);
  const step = CUBIE + CUBE_GAP,
    h = CUBIE / 2;
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++)
      for (let k = -1; k <= 1; k++) {
        const cx = i * step,
          cy = j * step,
          cz = k * step;
        // 12 edges
        for (const [a, c] of [
          [
            [-h, -h, -h],
            [h, -h, -h],
          ],
          [
            [-h, h, -h],
            [h, h, -h],
          ],
          [
            [-h, -h, h],
            [h, -h, h],
          ],
          [
            [-h, h, h],
            [h, h, h],
          ],
          [
            [-h, -h, -h],
            [-h, h, -h],
          ],
          [
            [h, -h, -h],
            [h, h, -h],
          ],
          [
            [-h, -h, h],
            [-h, h, h],
          ],
          [
            [h, -h, h],
            [h, h, h],
          ],
          [
            [-h, -h, -h],
            [-h, -h, h],
          ],
          [
            [h, -h, -h],
            [h, -h, h],
          ],
          [
            [-h, h, -h],
            [-h, h, h],
          ],
          [
            [h, h, -h],
            [h, h, h],
          ],
        ] as [V3, V3][])
          b.line(
            [cx + a[0], cy + a[1], cz + a[2]],
            [cx + c[0], cy + c[1], cz + c[2]],
            70,
            PAPER,
            1.05,
            0.003,
          );
        // faces: sparse glass, brighter on the outside of the cube
        for (let f = 0; f < 6; f++) {
          const axis = f >> 1,
            sign = f & 1 ? 1 : -1;
          const outer = [i, j, k][axis] === sign;
          const n = outer ? 175 : 12;
          for (let q = 0; q < n; q++) {
            const p: V3 = [cx, cy, cz];
            const u = (b.r() - 0.5) * CUBIE,
              v = (b.r() - 0.5) * CUBIE;
            const o = [0, 1, 2].filter((x) => x !== axis) as [number, number];
            p[axis] = p[axis]! + sign * h;
            p[o[0]] = p[o[0]]! + u;
            p[o[1]] = p[o[1]]! + v;
            // "data rows": stripes of brighter grains on the outer faces
            // each outer face of the cube carries its own colour, like a Rubik's cube
            const stripe =
              outer && Math.abs((((v / CUBIE + 0.5) * 5) % 1) - 0.5) < 0.12;
            const fc = FACE_COLORS[f]!;
            b.push(
              p[0],
              p[1],
              p[2],
              outer ? fc : OLIVE,
              outer ? (stripe ? 1.2 : 0.95) : 1.6,
            );
          }
        }
      }
  // data streaming through the core
  for (let q = 0; q < 2600; q++) {
    const t = b.r(),
      a = b.r() * Math.PI * 2,
      r = 0.1 + b.r() * 0.5;
    b.push(Math.cos(a) * r, (t - 0.5) * 2.3, Math.sin(a) * r, LIME, 0.75);
  }
  const s = step * 1.5 + 0.05;
  b.anchors.push(
    [0, s, 0],
    [s, 0, 0],
    [0, 0, s],
    [-s, 0, 0],
    [0, 0, -s],
    [0, -s, 0],
  );
  return b.done();
}

/** Embeddings: neurons in clusters, joined to their nearest neighbours. */
export function graphFormation(): Formation {
  const b = new Builder(61);
  const centers: V3[] = [];
  for (let c = 0; c < 6; c++) {
    const a = (c / 6) * Math.PI * 2 + 0.3;
    centers.push([
      Math.cos(a) * 2.1,
      Math.sin(a) * 1.35 + (c % 2 ? 0.25 : -0.25),
      Math.sin(a * 2) * 0.9,
    ]);
  }
  const nodes: V3[] = [];
  const nodeColor: RGB[] = [];
  centers.forEach((c, ci) => {
    for (let n = 0; n < 22; n++)
      nodeColor.push(SPECTRUM[ci % SPECTRUM.length]!);
    for (let n = 0; n < 22; n++)
      nodes.push([
        c[0] + b.gauss() * 0.42,
        c[1] + b.gauss() * 0.34,
        c[2] + b.gauss() * 0.4,
      ]);
  });
  for (let n = 0; n < 18; n++)
    nodes.push([(b.r() - 0.5) * 4, (b.r() - 0.5) * 2.6, (b.r() - 0.5) * 1.5]);
  const d2 = (a: V3, c: V3) =>
    (a[0] - c[0]) ** 2 + (a[1] - c[1]) ** 2 + (a[2] - c[2]) ** 2;
  const seen = new Set<string>();
  nodes.forEach((a, i) => {
    const near = nodes
      .map((c, j) => [d2(a, c), j] as const)
      .filter(([, j]) => j !== i)
      .sort((x, y) => x[0] - y[0])
      .slice(0, 3);
    for (const [, j] of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      b.line(a, nodes[j]!, 55, nodeColor[i] ?? PAPER, 0.5, 0.004);
    }
  });
  // a few long links between clusters
  for (let c = 0; c < 6; c++)
    b.line(centers[c]!, centers[(c + 2) % 6]!, 160, PAPER, 0.35, 0.004);
  nodes.forEach((n, i) =>
    b.sphere(
      n[0],
      n[1],
      n[2],
      i % 9 === 0 ? 0.075 : 0.05,
      i % 9 === 0 ? 150 : 90,
      i % 9 === 0 ? PAPER : (nodeColor[i] ?? PAPER),
      1,
    ),
  );
  centers.forEach((c) => b.anchors.push([c[0], c[1] + 0.55, c[2]]));
  return b.done();
}

/** Deep network; the shader reveals it one layer at a time from left to right. */
export const NETWORK_LAYERS = [5, 8, 11, 11, 8, 5];
export const NETWORK_X0 = -2.1;
export const NETWORK_DX = 0.84;
export function networkFormation(): Formation {
  const b = new Builder(71);
  const nodes: V3[][] = NETWORK_LAYERS.map((n, li) =>
    Array.from(
      { length: n },
      (_, k) =>
        [
          NETWORK_X0 + li * NETWORK_DX,
          (k - (n - 1) / 2) * (n > 8 ? 0.34 : 0.46),
          Math.sin(k * 1.1 + li) * 0.3,
        ] as V3,
    ),
  );
  for (let li = 0; li < nodes.length - 1; li++)
    for (const a of nodes[li]!)
      for (const c of nodes[li + 1]!)
        b.line(a, c, 34, SPECTRUM[li % SPECTRUM.length]!, 0.42, 0.005);
  nodes.forEach((layer, li) =>
    layer.forEach((n) =>
      b.sphere(
        n[0],
        n[1],
        n[2],
        0.085,
        220,
        li === 0 || li === nodes.length - 1
          ? SPECTRUM[li % SPECTRUM.length]!
          : PAPER,
        1,
      ),
    ),
  );
  // anchors: input layer (5), selected hidden nodes (4), output layer (5)
  nodes[0]!.forEach((n) => b.anchors.push(n));
  [nodes[2]![2]!, nodes[2]![8]!, nodes[3]![4]!, nodes[4]![6]!].forEach((n) =>
    b.anchors.push(n),
  );
  nodes[5]!.forEach((n) => b.anchors.push(n));
  return b.done();
}
