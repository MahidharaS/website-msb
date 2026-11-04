import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { journeyChapters } from "@/data/content";
import { canvasFormation } from "@/lib/grain-targets";
import { rasterizeDashboard } from "@/lib/dashboard-raster";
import {
  createMotionInput,
  journeyTimeline,
  type MotionInput,
  type SceneMode,
} from "./motion-input";
import { ImpactDashboard } from "./impact-dashboard";

const MotionScene = lazy(() => import("./motion-scene"));
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const STAGE_QUERY = "(min-width: 1100px) and (min-height: 700px)";

/** Desktop pins the dashboard inside the particle stage; small screens show it in flow. */
export function useDashboardInStage() {
  const [inStage, setInStage] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(STAGE_QUERY);
    const set = () => setInStage(m.matches);
    set();
    m.addEventListener("change", set);
    return () => m.removeEventListener("change", set);
  }, []);
  return inStage;
}

function useStageInput(
  root: MutableRefObject<HTMLElement | null>,
  journey: boolean,
  onProgress?: (p: number) => void,
) {
  const input = useRef<MotionInput>(createMotionInput());
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  const progressCb = useRef(onProgress);
  progressCb.current = onProgress;
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
      el.style.setProperty("--scroll-progress", String(p));
      progressCb.current?.(p);
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
  return { input, mounted, paused, setPaused };
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

export function MotionHero() {
  const photo = useRef<HTMLDivElement>(null);
  return (
    <section
      className="motion-hero"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        photo.current?.style.setProperty(
          "--px",
          String((e.clientX - r.left) / r.width - 0.5),
        );
        photo.current?.style.setProperty(
          "--py",
          String((e.clientY - r.top) / r.height - 0.5),
        );
      }}
    >
      <div className="motion-stage">
        <div className="motion-top mono">
          <span>
            <span className="status-dot" /> ANALYST → ML ENGINEER → DATA
            SCIENTIST
          </span>
          <span>BANGALORE, INDIA ↗</span>
        </div>
        <div className="motion-hero-copy">
          <p className="mono text-primary">MAHIDHARA S.</p>
          <p className="motion-kicker">I DON'T JUST ANALYSE PROBLEMS.</p>
          <h1 className="display">
            I WORK
            <br />
            <span>ON THEM.</span>
          </h1>
          <p className="motion-sub">
            I connect data, people, and processes to turn messy business
            problems into measurable outcomes.
          </p>
          <div className="hero-actions">
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
        <div className="hero-portrait" ref={photo}>
          <img
            src="/me-standing.jpg"
            alt="Mahidhara S., arms crossed, in a navy suit"
            width={900}
            height={1350}
            fetchPriority="high"
          />
        </div>
        <div className="motion-bottom mono">
          <span>DATA / PEOPLE / PROCESS</span>
          <a href="#impact">
            SCROLL: THE NUMBERS FIRST <ArrowDown size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- journey */

/** Labels pinned to projected anchor points of the formation on screen. */
function AnchorLayer({ input }: { input: MutableRefObject<MotionInput> }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const labels = Array.from(el.querySelectorAll<HTMLElement>("[data-pin]"));
    const byKey = Object.fromEntries(
      journeyChapters.map((c) => [c.key, c.anchors as readonly string[]]),
    );
    let key = "";
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const s = input.current;
      if (!s.active) return;
      if (s.anchorKey !== key) {
        key = s.anchorKey;
        const texts = byKey[key] ?? [];
        labels.forEach((l, i) => {
          const span = l.querySelector("span");
          if (span) span.textContent = texts[i] ?? "";
          l.dataset["side"] = key === "network" && i < 5 ? "left" : "right";
          l.dataset["tone"] = key === "network" && i >= 9 ? "result" : "plain";
        });
      }
      const texts = byKey[key] ?? [];
      labels.forEach((l, i) => {
        const show = i < s.anchorCount && i < texts.length;
        l.style.opacity = show
          ? String(s.anchorAlpha * (s.anchorVis[i] ?? 1))
          : "0";
        if (show)
          l.style.transform = `translate3d(${s.anchors[i * 2]}px, ${s.anchors[i * 2 + 1]}px, 0)`;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [input]);
  return (
    <div ref={host} className="anchor-layer" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <div key={i} data-pin className="anchor-pin">
          <i />
          <span />
        </div>
      ))}
    </div>
  );
}

const TRACK = ["DASHBOARD", ...journeyChapters.map((c) => c.label)];

export function MotionJourney() {
  const root = useRef<HTMLElement | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const dashHost = useRef<HTMLDivElement>(null);
  const inStage = useDashboardInStage();
  const [chapter, setChapter] = useState(0);
  const sampled = useRef(false);
  const dashRoot = useRef<HTMLElement | null>(null);

  const sample = useCallback(async () => {
    const el = dashRoot.current,
      st = stage.current;
    if (!el || !st) return;
    const r = await rasterizeDashboard(el, st);
    if (!r) return;
    input.current.dash = canvasFormation(r.image, r.scale, r.width, r.height);
    input.current.dashVersion++;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onProgress = useCallback(
    (p: number) => {
      const tl = journeyTimeline(p, inStage);
      setChapter(tl.chapter);
      if (dashHost.current) {
        dashHost.current.style.opacity = String(tl.dom);
        dashHost.current.style.visibility =
          tl.dom < 0.02 ? "hidden" : "visible";
        dashHost.current.dataset["live"] = String(tl.dom > 0.6);
      }
      // re-sample just before the report dissolves so filters and hover state carry over
      if (inStage && p > 0.06 && !sampled.current) {
        sampled.current = true;
        void sample();
      } else if (p < 0.03) sampled.current = false;
    },
    [inStage, sample],
  );
  const { input, mounted, paused, setPaused } = useStageInput(
    root,
    true,
    onProgress,
  );
  useEffect(() => {
    input.current.dashInStage = inStage;
    if (!inStage) input.current.dash = null;
  }, [inStage, input]);
  useEffect(() => {
    if (!inStage) return;
    let t = 0;
    const re = () => {
      clearTimeout(t);
      t = window.setTimeout(() => void sample(), 250);
    };
    window.addEventListener("resize", re);
    return () => {
      window.removeEventListener("resize", re);
      clearTimeout(t);
    };
  }, [inStage, sample]);

  return (
    <div id="impact">
      {!inStage && (
        <section className="dash-flow" aria-labelledby="impact-title">
          <p className="mono section-index">01 / THE NUMBERS</p>
          <h2 className="section-heading" id="impact-title">
            MY WORK, AS A REPORT.
          </h2>
          <ImpactDashboard />
        </section>
      )}
      <section
        ref={root}
        className="motion-journey"
        data-chapter={chapter}
        data-stage-dash={inStage}
        style={{ height: inStage ? "640svh" : "460svh" }}
      >
        <div className="motion-sticky" ref={stage}>
          <SceneCanvas input={input} mounted={mounted} mode="journey">
            {mounted && <AnchorLayer input={input} />}
          </SceneCanvas>
          {inStage && (
            <div className="dash-stage" ref={dashHost}>
              <ImpactDashboard
                onBuilt={(el) => {
                  dashRoot.current = el;
                  void sample();
                }}
              />
            </div>
          )}
          <div className="journey-heading mono">
            {chapter === 0 ? "" : "02 / FROM REPORT TO MODEL"}
          </div>
          <div className="journey-copy">
            {journeyChapters.map((item, i) => (
              <div
                key={item.key}
                className="journey-chapter"
                data-active={chapter === i + 1}
                aria-hidden={chapter !== i + 1}
              >
                <span className="mono text-primary">
                  0{i + 2} / {item.label}
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
          <div
            className="journey-track mono"
            data-hidden={chapter === 0 && inStage}
          >
            {TRACK.map((c, i) => (
              <span key={c} data-active={chapter === i}>
                0{i + 1} {c}
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
