import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storyline } from "@/data/content";
import type { StoryInput } from "./story-scene";

const StoryScene = lazy(() => import("./story-scene"));

/**
 * The storyline: a pinned scene where a small figure with a lantern walks one glowing
 * road. Each act of the career is a bend with a beacon; the copy for the act you are
 * standing at sits beside the road.
 */
export function StoryPath() {
  const root = useRef<HTMLElement>(null);
  const input = useRef<StoryInput>({
    progress: 0,
    reduced: false,
    active: true,
    x: 0,
    y: 0,
  });
  const [act, setAct] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    input.current.reduced = media.matches;
    const update = () => {
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = Math.max(
        0,
        Math.min(1, -r.top / Math.max(1, r.height - window.innerHeight)),
      );
      input.current.progress = p;
      input.current.active = r.bottom > 0 && r.top < window.innerHeight;
      setAct(Math.min(storyline.length - 1, Math.floor(p * storyline.length)));
      el.style.setProperty("--story-p", String(p));
    };
    const move = (e: PointerEvent) => {
      input.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      input.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  const jump = (i: number) => {
    const el = root.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: top + span * ((i + 0.5) / storyline.length),
      behavior: "smooth",
    });
  };

  const current = storyline[act]!;
  return (
    <section
      ref={root}
      className="story-path"
      style={
        {
          height: `${storyline.length * 115}svh`,
          "--act": current.color,
        } as CSSProperties
      }
      aria-label="Career storyline"
    >
      <div className="story-sticky">
        <div className="story-glow" aria-hidden="true" />
        <div className="story-canvas" aria-hidden="true">
          {mounted && (
            <Suspense fallback={null}>
              <StoryScene input={input} />
            </Suspense>
          )}
        </div>
        <div className="story-acts">
          {storyline.map((a, i) => (
            <article
              key={a.id}
              className="story-act"
              data-active={act === i}
              aria-hidden={act !== i}
              style={{ "--c": a.color } as CSSProperties}
            >
              <p className="mono story-meta">
                <span>
                  ACT {String(i + 1).padStart(2, "0")} · {a.role}
                </span>
                <span>
                  {a.years} · {a.place}
                </span>
              </p>
              <h2>{a.line}</h2>
              <p className="story-body">{a.body}</p>
              <p className="story-lesson">
                <span className="mono">WHAT I TOOK FROM IT</span>
                {a.lesson}
              </p>
              <ul className="story-proof mono">
                {a.proof.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              {i === storyline.length - 1 && (
                <div className="story-cta">
                  <Button asChild size="lg">
                    <Link to="/contact">
                      Walk the next part with me <ArrowUpRight />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/lab">
                      Ask my AI first <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
        <nav className="story-rail mono" aria-label="Jump to act">
          {storyline.map((a, i) => (
            <button
              key={a.id}
              type="button"
              data-active={act === i}
              data-done={i < act}
              onClick={() => jump(i)}
              style={{ "--c": a.color } as CSSProperties}
            >
              <i />
              <span>{a.role}</span>
            </button>
          ))}
        </nav>
        <div className="story-progress" aria-hidden="true" />
      </div>
    </section>
  );
}
