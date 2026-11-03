import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { assets, journeyChapters } from "@/data/content";
import {
  createMotionInput,
  type MotionInput,
  type SceneMode,
} from "./motion-input";
import { CursorGlyph } from "./swarm-cursors";

const MotionScene = lazy(() => import("./motion-scene"));

const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

function useStageInput(
  root: MutableRefObject<HTMLElement | null>,
  journey: boolean,
) {
  const input = useRef<MotionInput>(createMotionInput());
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = () => {
      input.current.reduced = media.matches;
      setPaused(media.matches);
    };
    reduced();
    media.addEventListener("change", reduced);
    const update = () => {
      const el = root.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = clamp01(
        -rect.top / Math.max(1, rect.height - window.innerHeight),
      );
      input.current.progress = journey ? p : clamp01(-rect.top / rect.height);
      input.current.active = rect.bottom > 0 && rect.top < window.innerHeight;
      setChapter(
        Math.min(
          journeyChapters.length - 1,
          Math.floor(p * journeyChapters.length),
        ),
      );
      el.style.setProperty("--scroll-progress", String(p));
    };
    const move = (e: PointerEvent) => {
      const s = input.current;
      s.clientX = e.clientX;
      s.clientY = e.clientY;
      s.pointer = e.pointerType !== "touch" || e.buttons > 0;
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      s.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      s.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const leave = () => {
      input.current.pointer = false;
      input.current.x = 0;
      input.current.y = 0;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      media.removeEventListener("change", reduced);
    };
  }, [journey, root]);
  return { input, mounted, paused, setPaused, chapter };
}

function PauseButton({
  input,
  paused,
  setPaused,
}: {
  input: MutableRefObject<MotionInput>;
  paused: boolean;
  setPaused: (v: boolean) => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="motion-pause"
      aria-label={paused ? "Play motion" : "Pause motion"}
      title={paused ? "Play motion" : "Pause motion"}
      onClick={() => {
        input.current.reduced = !paused;
        setPaused(!paused);
      }}
    >
      {paused ? <Play size={15} /> : <Pause size={15} />}
    </Button>
  );
}

function SceneCanvas({
  input,
  mounted,
  mode,
  children,
}: {
  input: MutableRefObject<MotionInput>;
  mounted: boolean;
  mode: SceneMode;
  children?: ReactNode;
}) {
  return (
    <div className="motion-canvas" aria-hidden="true">
      {mounted && (
        <Suspense fallback={<div className="motion-fallback" />}>
          <MotionScene input={input} mode={mode} />
        </Suspense>
      )}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- hero */

const HERO_CURSORS = [
  { name: "EXCEL", target: "kicker" },
  { name: "POWER BI", target: "title" },
  { name: "TABLEAU", target: "sub" },
  { name: "SQL", target: "actions" },
  { name: "PYTHON", target: "canvas" },
];

/** Cursors fly in, drag selection boxes and the copy is drawn into place behind them. */
function HeroSwarm({ stage }: { stage: MutableRefObject<HTMLElement | null> }) {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = stage.current;
    const host = layer.current;
    if (!root || !host) return;
    const done = () => root.setAttribute("data-intro", "done");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return done();
    const base = root.getBoundingClientRect();
    const cursors = Array.from(
      host.querySelectorAll<HTMLElement>("[data-cursor]"),
    );
    const boxes = Array.from(host.querySelectorAll<HTMLElement>("[data-box]"));
    const plans = HERO_CURSORS.map((c, k) => {
      const el = root.querySelector<HTMLElement>(`[data-swarm="${c.target}"]`);
      const r =
        el?.getBoundingClientRect() ??
        new DOMRect(base.width / 2, base.height / 2, 120, 80);
      const x0 = r.left - base.left,
        y0 = r.top - base.top;
      const box =
        c.target === "canvas"
          ? {
              x0: x0 + r.width * 0.3,
              y0: y0 + r.height * 0.18,
              x1: x0 + r.width * 0.72,
              y1: y0 + r.height * 0.82,
            }
          : {
              x0: x0 - 8,
              y0: y0 - 6,
              x1: x0 + r.width + 8,
              y1: y0 + r.height + 6,
            };
      const side = k % 2 ? 1 : -1;
      return {
        el,
        box,
        start: {
          x: side > 0 ? base.width + 60 : -60,
          y: base.height * (0.15 + k * 0.17),
        },
        exit: {
          x: side > 0 ? base.width + 80 : -80,
          y: base.height * (0.95 - k * 0.12),
        },
        delay: 0.15 + k * 0.32,
      };
    });
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      let alive = false;
      plans.forEach((p, k) => {
        const c = cursors[k]!,
          b = boxes[k]!;
        const lt = t - p.delay;
        const fly = clamp01(lt / 0.7),
          drag = clamp01((lt - 0.75) / 0.85),
          leave = clamp01((lt - 1.95) / 0.8);
        if (leave < 1) alive = true;
        let x: number, y: number;
        if (drag <= 0) {
          const e = ease(fly);
          x = p.start.x + (p.box.x0 - p.start.x) * e;
          y = p.start.y + (p.box.y0 - p.start.y) * e;
        } else if (leave <= 0) {
          const e = ease(drag);
          x = p.box.x0 + (p.box.x1 - p.box.x0) * e;
          y = p.box.y0 + (p.box.y1 - p.box.y0) * e;
        } else {
          const e = ease(leave);
          x = p.box.x1 + (p.exit.x - p.box.x1) * e;
          y = p.box.y1 + (p.exit.y - p.box.y1) * e;
        }
        c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        c.style.opacity = String(lt < 0 ? 0 : 1 - leave);
        const e = ease(drag);
        b.style.transform = `translate3d(${p.box.x0}px, ${p.box.y0}px, 0)`;
        b.style.width = `${(p.box.x1 - p.box.x0) * e}px`;
        b.style.height = `${(p.box.y1 - p.box.y0) * e}px`;
        b.style.opacity = String(drag > 0 ? 1 - leave : 0);
        if (p.el && p.el.dataset["swarm"] !== "canvas")
          p.el.style.clipPath =
            drag >= 1 ? "none" : `inset(-10px ${100 - e * 100}% -10px -10px)`;
      });
      if (alive) raf = requestAnimationFrame(tick);
      else {
        plans.forEach((p) => p.el && (p.el.style.clipPath = ""));
        done();
      }
    };
    root.setAttribute("data-intro", "running");
    raf = requestAnimationFrame(tick);
    const safety = window.setTimeout(done, 6000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      plans.forEach((p) => p.el && (p.el.style.clipPath = ""));
      done();
    };
  }, [stage]);
  return (
    <div ref={layer} className="swarm-layer" aria-hidden="true">
      {HERO_CURSORS.map((c, k) => (
        <div
          key={c.name}
          data-box
          className="swarm-box"
          data-tone={k % 2 ? "paper" : "lime"}
        />
      ))}
      {HERO_CURSORS.map((c, k) => (
        <div
          key={c.name}
          data-cursor
          className="swarm-cursor"
          data-tone={k % 2 ? "paper" : "lime"}
        >
          <CursorGlyph />
          <span>{c.name}</span>
        </div>
      ))}
    </div>
  );
}

export function MotionHero() {
  const root = useRef<HTMLElement | null>(null);
  const { input, mounted, paused, setPaused } = useStageInput(root, false);
  return (
    <section ref={root} className="motion-hero">
      <div className="motion-stage">
        <SceneCanvas input={input} mounted={mounted} mode="hero">
          <span data-swarm="canvas" className="swarm-target-canvas" />
        </SceneCanvas>
        <div className="motion-top mono">
          <span>
            <span className="status-dot" /> ANALYST → ML ENGINEER → DATA
            SCIENTIST
          </span>
          <span>BANGALORE, INDIA ↗</span>
        </div>
        <div className="motion-hero-copy">
          <p className="mono text-primary">MAHIDHARA S.</p>
          <p className="motion-kicker" data-swarm="kicker">
            I DON'T JUST ANALYSE PROBLEMS.
          </p>
          <h1 className="display" data-swarm="title">
            I WORK
            <br />
            <span>ON THEM.</span>
          </h1>
          <p className="motion-sub" data-swarm="sub">
            I connect data, people, and processes to turn messy business
            problems into measurable outcomes. Move your cursor through the
            grains.
          </p>
          <div className="hero-actions" data-swarm="actions">
            <Button asChild size="lg">
              <Link to="/work">
                See the work <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/lab">
                Ask my AI <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
        {mounted && <HeroSwarm stage={root} />}
        <Link to="/story" className="motion-signature">
          <img src={assets.portrait} alt="Mahidhara S." />
          <span className="mono">
            NOT THE TOOL.
            <br />
            THE PROBLEM.
          </span>
          <ArrowUpRight size={16} />
        </Link>
        <div className="motion-bottom mono">
          <span>DATA / PEOPLE / PROCESS</span>
          <a href="#complexity">
            SCROLL THROUGH THE CAREER <ArrowDown size={14} />
          </a>
        </div>
        <PauseButton input={input} paused={paused} setPaused={setPaused} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- journey */

const TILE_CURSORS = ["EXCEL", "SQL", "POWER BI", "TABLEAU"];

/** Labels pinned to projected anchor points, plus the dashboard-building cursors. */
function AnchorLayer({ input }: { input: MutableRefObject<MotionInput> }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const labels = Array.from(el.querySelectorAll<HTMLElement>("[data-pin]"));
    const cursors = Array.from(
      el.querySelectorAll<HTMLElement>("[data-tile-cursor]"),
    );
    const boxes = Array.from(
      el.querySelectorAll<HTMLElement>("[data-tile-box]"),
    );
    const byKey = Object.fromEntries(
      journeyChapters.map((c) => [c.key, c.anchors as readonly string[]]),
    );
    let key = "";
    let since = 0;
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const s = input.current;
      if (!s.active) return;
      if (s.anchorKey !== key || s.anchorAlpha < 0.05) {
        if (s.anchorKey !== key) {
          key = s.anchorKey;
          const texts = byKey[key] ?? [];
          labels.forEach((l, i) => {
            const span = l.querySelector("span");
            if (span)
              span.textContent = key === "dashboard" ? "" : (texts[i] ?? "");
            l.dataset["side"] =
              key === "neural" ? (i < 5 ? "left" : "right") : "right";
          });
        }
        since = now;
      }
      const a = s.anchorAlpha;
      const texts = byKey[key] ?? [];
      // pinned labels
      labels.forEach((l, i) => {
        const show =
          key !== "dashboard" && i < s.anchorCount && i < texts.length;
        l.style.opacity = show ? String(a) : "0";
        if (show)
          l.style.transform = `translate3d(${s.anchors[i * 2]}px, ${s.anchors[i * 2 + 1]}px, 0)`;
      });
      // dashboard: four cursors drag out the KPI tiles and type the values
      const t = s.reduced ? 10 : (now - since) / 1000;
      cursors.forEach((c, k) => {
        const b = boxes[k]!;
        if (key !== "dashboard" || s.anchorCount < 8) {
          c.style.opacity = "0";
          b.style.opacity = "0";
          return;
        }
        const ax = s.anchors[k * 4]!,
          ay = s.anchors[k * 4 + 1]!,
          bx = s.anchors[k * 4 + 2]!,
          by = s.anchors[k * 4 + 3]!;
        const lt = t - k * 0.35;
        const fly = clamp01(lt / 0.6),
          drag = clamp01((lt - 0.65) / 0.8),
          rest = clamp01((lt - 1.6) / 0.6);
        let x = ax,
          y = ay;
        if (drag <= 0) {
          const e = ease(fly);
          x = ax + (k % 2 ? 140 : -140) * (1 - e);
          y = ay - 120 * (1 - e);
        } else {
          const e = ease(drag);
          x = ax + (bx - ax) * e;
          y = ay + (by - ay) * e;
        }
        x += rest * 10 * Math.sin(now / 700 + k);
        y += rest * 6 * Math.cos(now / 900 + k);
        c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        c.style.opacity = String(a * (lt > 0 ? 1 : 0));
        const e = ease(drag);
        b.style.transform = `translate3d(${Math.min(ax, bx)}px, ${Math.min(ay, by)}px, 0)`;
        b.style.width = `${Math.abs(bx - ax) * e}px`;
        b.style.height = `${Math.abs(by - ay) * e}px`;
        b.style.opacity = String(a * (drag > 0 ? 1 : 0));
        const label = b.querySelector("span");
        const full = texts[k] ?? "";
        if (label)
          label.textContent = full.slice(
            0,
            Math.round(full.length * clamp01((lt - 1.4) / 0.6)),
          );
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [input]);
  return (
    <div ref={host} className="anchor-layer" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} data-pin className="anchor-pin">
          <i />
          <span />
        </div>
      ))}
      {TILE_CURSORS.map((n, k) => (
        <div
          key={n}
          data-tile-box
          className="swarm-box tile"
          data-tone={k % 2 ? "paper" : "lime"}
        >
          <span />
        </div>
      ))}
      {TILE_CURSORS.map((n, k) => (
        <div
          key={n}
          data-tile-cursor
          className="swarm-cursor"
          data-tone={k % 2 ? "paper" : "lime"}
        >
          <CursorGlyph />
          <span>{n}</span>
        </div>
      ))}
    </div>
  );
}

export function MotionJourney() {
  const root = useRef<HTMLElement | null>(null);
  const { input, mounted, paused, setPaused, chapter } = useStageInput(
    root,
    true,
  );
  return (
    <div id="complexity">
      <section
        ref={root}
        className="motion-journey"
        data-chapter={chapter}
        style={{ height: `${journeyChapters.length * 90}svh` }}
      >
        <div className="motion-sticky">
          <SceneCanvas input={input} mounted={mounted} mode="journey">
            {mounted && <AnchorLayer input={input} />}
          </SceneCanvas>
          <div className="journey-heading mono">
            01 / ONE CAREER, FIVE FORMATIONS
          </div>
          <div className="journey-copy">
            {journeyChapters.map((item, i) => (
              <div
                key={item.key}
                className="journey-chapter"
                data-active={chapter === i}
                aria-hidden={chapter !== i}
              >
                <span className="mono text-primary">
                  0{i + 1} / {item.label}
                </span>
                <h2 className="display">{item.title}</h2>
                <p>{item.text}</p>
                <ul className="journey-tools mono">
                  {item.tools.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {i === journeyChapters.length - 1 && (
                  <Button asChild variant="outline">
                    <a href="#value">
                      What you get <ArrowDown />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="journey-track mono">
            {journeyChapters.map((c, i) => (
              <span key={c.key} data-active={chapter === i}>
                0{i + 1} {c.label}
              </span>
            ))}
            <div className="journey-progress" />
          </div>
          <PauseButton input={input} paused={paused} setPaused={setPaused} />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------- terrain */

/** Quiet mountain-grain backdrop for the assistant page. */
export function TerrainBackdrop() {
  const root = useRef<HTMLElement | null>(null);
  const { input, mounted } = useStageInput(root, false);
  return (
    <section ref={root} className="terrain-backdrop" aria-hidden="true">
      <SceneCanvas input={input} mounted={mounted} mode="terrain" />
    </section>
  );
}
