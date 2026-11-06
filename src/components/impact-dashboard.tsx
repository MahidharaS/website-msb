import { useNavigate } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ArrowUpRight } from "lucide-react";
import { cases, dashboard } from "@/data/content";
import { CursorGlyph } from "./swarm-cursors";

type Fn = (typeof dashboard.functions)[number];
const SWARM_NAMES = ["EXCEL", "SQL", "POWER BI", "TABLEAU", "PYTHON", "DAX"];
const SWARM_COLORS = ["lime", "paper", "paper", "paper", "paper", "paper"];
const FN_COLOR: Record<string, string> = {
  ALL: "var(--c-lime)",
  SALES: "var(--c-coral)",
  OPERATIONS: "var(--c-amber)",
  DATA: "var(--c-sky)",
  TECHNOLOGY: "var(--c-violet)",
  PROCESS: "var(--c-mint)",
};
const KPI_COLORS = [
  "var(--c-lime)",
  "var(--c-amber)",
  "var(--c-coral)",
  "var(--c-sky)",
  "var(--c-mint)",
];
const OUTCOME_COLORS = [
  "var(--c-coral)",
  "var(--c-sky)",
  "var(--c-violet)",
  "var(--c-amber)",
];
const RECORD_COLORS = ["var(--c-sky)", "var(--c-pink)", "var(--c-violet)"];
const DONUT_COLORS = ["#C6F432", "#F2F0EA", "#A7A9A0", "#6E716B", "#3F413D"];
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const fmt = (n: number) =>
  n >= 100000 ? `${n / 100000}L` : n >= 1000 ? `${n / 1000}K` : String(n);

/**
 * A Power BI style report of the portfolio's real numbers. Slicers cross-filter every
 * visual, hovering highlights a case across visuals, clicking drills through to it.
 * On first view a swarm of labelled cursors drags each visual into place.
 */
export function ImpactDashboard({
  onBuilt,
}: {
  onBuilt?: (root: HTMLElement) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [fn, setFn] = useState<Fn>("ALL");
  const [hover, setHover] = useState<string | null>(null);
  const built = useRef(onBuilt);
  built.current = onBuilt;

  const match = (tags: readonly string[]) => fn === "ALL" || tags.includes(fn);
  const state = (slug: string | null, tags: readonly string[]) =>
    !match(tags)
      ? "off"
      : hover && slug === hover
        ? "hot"
        : hover
          ? "dim"
          : "on";
  const go = (slug: string | null, fallback = "/lab") =>
    slug
      ? navigate({ to: "/work/$slug", params: { slug } })
      : navigate({ to: fallback });
  const focus =
    cases.find((c) => c.slug === hover) ??
    cases.find((c) => match(c.tags)) ??
    cases[0]!;
  const tableRows = cases.filter((c) => match(c.tags));
  const maxLog = Math.log10(Math.max(...dashboard.records.map((r) => r.value)));
  const donut = useMemo(() => {
    const total = dashboard.people.reduce((s, p) => s + p.value, 0);
    let acc = 0;
    return dashboard.people.map((p) => {
      const start = acc / total;
      acc += p.value;
      return { ...p, start, end: acc / total };
    });
  }, []);

  // swarm build on first view
  useEffect(() => {
    const el = root.current,
      host = layer.current;
    if (!el || !host) return;
    const finish = () => {
      el.setAttribute("data-intro", "done");
      // let layout settle before the grain engine samples the finished report
      requestAnimationFrame(() =>
        requestAnimationFrame(() => built.current?.(el)),
      );
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return finish();
    let raf = 0;
    let started = false;
    const timers: number[] = [];
    const run = () => {
      started = true;
      el.setAttribute("data-intro", "running");
      const base = el.getBoundingClientRect();
      const targets = Array.from(
        el.querySelectorAll<HTMLElement>("[data-swarm]"),
      );
      const cursors = Array.from(
        host.querySelectorAll<HTMLElement>("[data-cursor]"),
      );
      const boxes = Array.from(
        host.querySelectorAll<HTMLElement>("[data-box]"),
      );
      const plans = targets.map((t, i) => {
        const r = t.getBoundingClientRect();
        const box = {
          x0: r.left - base.left,
          y0: r.top - base.top,
          x1: r.right - base.left,
          y1: r.bottom - base.top,
        };
        const from =
          i % 2
            ? { x: base.width + 40, y: box.y0 - 60 }
            : { x: -40, y: box.y1 + 60 };
        return { t, box, from, delay: 0.1 + i * 0.16 };
      });
      const t0 = performance.now();
      const tick = (now: number) => {
        const time = (now - t0) / 1000;
        let busy = false;
        plans.forEach((p, i) => {
          const c = cursors[i],
            b = boxes[i];
          if (!c || !b) return;
          const lt = time - p.delay;
          const fly = clamp01(lt / 0.55),
            drag = clamp01((lt - 0.6) / 0.6),
            leave = clamp01((lt - 1.35) / 0.6);
          if (leave < 1) busy = true;
          let x: number, y: number;
          if (drag <= 0) {
            const e = ease(fly);
            x = p.from.x + (p.box.x0 - p.from.x) * e;
            y = p.from.y + (p.box.y0 - p.from.y) * e;
          } else if (leave <= 0) {
            const e = ease(drag);
            x = p.box.x0 + (p.box.x1 - p.box.x0) * e;
            y = p.box.y0 + (p.box.y1 - p.box.y0) * e;
          } else {
            const e = ease(leave);
            x = p.box.x1 + (p.from.x - p.box.x1) * e;
            y = p.box.y1 + (p.from.y - p.box.y1) * e;
          }
          c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          c.style.opacity = String(lt < 0 ? 0 : 1 - leave);
          const e = ease(drag);
          b.style.transform = `translate3d(${p.box.x0}px, ${p.box.y0}px, 0)`;
          b.style.width = `${(p.box.x1 - p.box.x0) * e}px`;
          b.style.height = `${(p.box.y1 - p.box.y0) * e}px`;
          b.style.opacity = String(drag > 0 ? 1 - leave : 0);
          p.t.style.clipPath =
            drag >= 1
              ? "none"
              : `inset(0 ${100 - e * 100}% ${100 - e * 100}% 0)`;
        });
        if (busy) raf = requestAnimationFrame(tick);
        else {
          plans.forEach((p) => (p.t.style.clipPath = ""));
          // one cursor demonstrates the cross-filter, then hands control to the visitor
          setFn("SALES");
          timers.push(window.setTimeout(() => setFn("ALL"), 1100));
          finish();
        }
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!started && entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      el.querySelectorAll<HTMLElement>("[data-swarm]").forEach(
        (t) => (t.style.clipPath = ""),
      );
    };
  }, []);

  const swarmCount = 13;
  return (
    <div ref={root} className="dash" aria-label="Interactive impact report">
      <div className="dash-bar" data-swarm data-g="frame">
        <span className="dash-logo" data-g="fill" />
        <strong data-g="text">MAHIDHARA S. · IMPACT REPORT</strong>
        <span className="dash-tabs mono">
          <span data-active="true" data-g="text">
            OVERVIEW
          </span>
          <span data-g="text">SALES</span>
          <span data-g="text">OPERATIONS</span>
        </span>
        <span className="mono dash-source" data-g="text">
          SOURCE: CASE STUDIES 2020–2026
        </span>
      </div>

      <div
        className="dash-slicers"
        data-swarm
        data-g="frame"
        role="group"
        aria-label="Filter by business function"
      >
        <span className="mono" data-g="text">
          FUNCTION
        </span>
        {dashboard.functions.map((f) => (
          <button
            key={f}
            type="button"
            className="mono"
            aria-pressed={fn === f}
            style={{ "--c": FN_COLOR[f] } as CSSProperties}
            data-g={fn === f ? "fill" : "frame"}
            onClick={() => setFn(f)}
          >
            <span data-g="text">{f}</span>
          </button>
        ))}
      </div>

      <div className="dash-kpis">
        {dashboard.kpis.map((k, ki) => (
          <button
            key={k.label}
            style={{ "--c": KPI_COLORS[ki] } as CSSProperties}
            type="button"
            className="dash-kpi"
            data-swarm
            data-g="frame"
            data-state={state(k.slug, k.tags)}
            onMouseEnter={() => setHover(k.slug)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(k.slug)}
            onBlur={() => setHover(null)}
            onClick={() => go(k.slug)}
          >
            <span className="dash-kpi-value" data-g="text">
              {k.value}
            </span>
            <span className="dash-kpi-label mono" data-g="text">
              {k.label}
            </span>
          </button>
        ))}
      </div>

      <div className="dash-grid">
        <section className="dash-tile dash-outcomes" data-swarm data-g="frame">
          <h3 className="mono" data-g="text">
            MEASURED OUTCOMES (%)
          </h3>
          <div className="dash-cols">
            {dashboard.outcomes.map((o, oi) => (
              <button
                key={o.label}
                style={{ "--c": OUTCOME_COLORS[oi] } as CSSProperties}
                type="button"
                data-state={state(o.slug, o.tags)}
                onMouseEnter={() => setHover(o.slug)}
                onMouseLeave={() => setHover(null)}
                onClick={() => go(o.slug)}
                aria-label={`${o.label}: ${o.value}${o.unit}`}
              >
                <span className="dash-col-value mono" data-g="text">
                  {o.value}
                  {o.unit}
                </span>
                <span
                  className="dash-col-bar"
                  style={{ "--h": `${o.value}%` } as CSSProperties}
                  data-g="fill"
                />
                <span className="dash-col-label mono" data-g="text">
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="dash-tile dash-records" data-swarm data-g="frame">
          <h3 className="mono" data-g="text">
            RECORDS HANDLED (LOG SCALE)
          </h3>
          {dashboard.records.map((r, ri) => (
            <button
              style={{ "--c": RECORD_COLORS[ri] } as CSSProperties}
              key={r.label}
              type="button"
              data-state={state(r.slug, r.tags)}
              onMouseEnter={() => setHover(r.slug)}
              onMouseLeave={() => setHover(null)}
              onClick={() => go(r.slug)}
            >
              <span className="mono" data-g="text">
                {r.label}
              </span>
              <span
                className="dash-hbar"
                style={
                  {
                    "--w": `${(Math.log10(r.value) / maxLog) * 100}%`,
                  } as CSSProperties
                }
                data-g="fill"
              />
              <span className="mono dash-hval" data-g="text">
                {fmt(r.value)}+
              </span>
            </button>
          ))}
        </section>

        <section className="dash-tile dash-people" data-swarm data-g="frame">
          <h3 className="mono" data-g="text">
            PEOPLE REACHED
          </h3>
          <button
            type="button"
            className="dash-donut"
            onClick={() => navigate({ to: "/multiplier" })}
            aria-label="Open community and training"
          >
            <svg viewBox="0 0 120 120" data-g="svg" aria-hidden="true">
              {donut.map((d, i) => {
                const r = 46,
                  c = 2 * Math.PI * r;
                return (
                  <circle
                    key={d.label}
                    cx="60"
                    cy="60"
                    r={r}
                    fill="none"
                    stroke={DONUT_COLORS[i]}
                    strokeWidth="16"
                    strokeDasharray={`${(d.end - d.start) * c - 2} ${c}`}
                    strokeDashoffset={-d.start * c}
                    transform="rotate(-90 60 60)"
                  />
                );
              })}
              <text
                x="60"
                y="58"
                textAnchor="middle"
                fill="#F2F0EA"
                fontSize="20"
                fontFamily="Anton, Impact, sans-serif"
              >
                425+
              </text>
              <text
                x="60"
                y="74"
                textAnchor="middle"
                fill="#A7A9A0"
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
              >
                PEOPLE
              </text>
            </svg>
            <ul className="mono">
              {dashboard.people.map((p, i) => (
                <li key={p.label}>
                  <i
                    style={{
                      background: DONUT_COLORS[i],
                    }}
                    data-g="fill"
                  />
                  <span data-g="text">
                    {p.value}+ {p.label}
                  </span>
                </li>
              ))}
            </ul>
          </button>
        </section>

        <section className="dash-tile dash-table" data-swarm data-g="frame">
          <h3 className="mono" data-g="text">
            CASE STUDIES · CLICK TO DRILL THROUGH
          </h3>
          <div role="table" aria-label="Case studies">
            <div role="row" className="dash-row dash-head mono">
              <span role="columnheader" data-g="text">
                PROBLEM
              </span>
              <span role="columnheader" data-g="text">
                WHERE
              </span>
              <span role="columnheader" data-g="text">
                RESULT
              </span>
            </div>
            {tableRows.map((c) => (
              <button
                key={c.slug}
                type="button"
                role="row"
                className="dash-row"
                data-state={
                  hover && hover !== c.slug ? "dim" : hover ? "hot" : "on"
                }
                onMouseEnter={() => setHover(c.slug)}
                onMouseLeave={() => setHover(null)}
                onClick={() => go(c.slug)}
              >
                <span role="cell" data-g="text">
                  {c.title}
                </span>
                <span role="cell" className="mono" data-g="text">
                  {c.company.split(" · ")[0]}
                </span>
                <span role="cell" className="mono dash-metric" data-g="text">
                  {c.metric}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section
          className="dash-tile dash-detail"
          data-swarm
          data-g="frame"
          aria-live="polite"
        >
          <h3 className="mono" data-g="text">
            DETAIL · {focus.company}
          </h3>
          <div className="dash-detail-metric" data-g="text">
            {focus.metric}
          </div>
          <p className="mono" data-g="text">
            {focus.metricLabel}
          </p>
          <p data-g="text">{focus.impact}</p>
          <button
            type="button"
            className="mono dash-open"
            onClick={() => go(focus.slug)}
          >
            OPEN CASE STUDY <ArrowUpRight size={12} />
          </button>
        </section>
      </div>

      <div ref={layer} className="swarm-layer" aria-hidden="true">
        {Array.from({ length: swarmCount }, (_, i) => (
          <div
            key={`b${i}`}
            data-box
            className="swarm-box"
            style={
              {
                "--sc": `var(--c-${SWARM_COLORS[i % SWARM_COLORS.length]})`,
              } as CSSProperties
            }
          />
        ))}
        {Array.from({ length: swarmCount }, (_, i) => (
          <div
            key={`c${i}`}
            data-cursor
            className="swarm-cursor"
            style={
              {
                "--sc": `var(--c-${SWARM_COLORS[i % SWARM_COLORS.length]})`,
              } as CSSProperties
            }
          >
            <CursorGlyph />
            <span>{SWARM_NAMES[i % SWARM_NAMES.length]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
