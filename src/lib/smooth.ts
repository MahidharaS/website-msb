// Feel layer: inertial wheel scrolling and soft scroll reveals, without a dependency.
// Native scrolling stays the source of truth (sticky sections, anchors, keyboard and touch
// all keep working); we only ease the wheel towards its target, like Lenis does.

export function startSmoothScroll() {
  if (typeof window === "undefined") return () => {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)");
  if (reduce.matches || coarse.matches) return () => {};

  let target = window.scrollY;
  let current = window.scrollY;
  let raf = 0;
  let animating = false;
  const max = () => document.documentElement.scrollHeight - window.innerHeight;

  const scrollableParent = (el: Element | null, dy: number): boolean => {
    while (el && el !== document.body && el !== document.documentElement) {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        const atTop = el.scrollTop <= 0, atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if ((dy < 0 && !atTop) || (dy > 0 && !atEnd)) return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  const tick = () => {
    current += (target - current) * 0.1;
    if (Math.abs(target - current) < 0.4) {
      current = target;
      animating = false;
    }
    window.scrollTo(0, current);
    if (animating) raf = requestAnimationFrame(tick);
  };

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (document.body.style.overflow === "hidden" || document.querySelector("[role=dialog]")) return;
    if (scrollableParent(e.target as Element, e.deltaY)) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? window.innerHeight : 1;
    if (!animating) current = target = window.scrollY;
    target = Math.max(0, Math.min(max(), target + e.deltaY * unit));
    if (!animating) {
      animating = true;
      raf = requestAnimationFrame(tick);
    }
  };
  // keyboard, scrollbar drag, anchors: follow the native position
  const onScroll = () => {
    if (!animating) current = target = window.scrollY;
  };
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("scroll", onScroll);
  };
}

const REVEAL =
  ".page-heading, .section-top, .metric, .path, .work-card, .chapter, .value-item, .seeking, .community-item, .manifesto, .case-section, .story-intro > *, .dash-flow > *, .bento, .tool-marquee, .footer h2";

/** Fade, lift and un-blur content as it enters the viewport. */
export function startReveal() {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const root = document.documentElement;
  root.classList.add("reveal-ready");
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  const scan = () => {
    document.querySelectorAll<HTMLElement>(REVEAL).forEach((el, i) => {
      if (el.dataset["revealed"]) return;
      el.dataset["revealed"] = "1";
      el.style.setProperty("--reveal-delay", `${(i % 4) * 70}ms`);
      // anything already on screen stays put; only content below the fold animates in
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      el.classList.add("reveal");
      io.observe(el);
    });
  };
  // wait until React has hydrated lazy pages before touching their DOM, and batch mutations
  let t = 0;
  const later = () => {
    clearTimeout(t);
    t = window.setTimeout(scan, 450);
  };
  later();
  const mo = new MutationObserver(later);
  mo.observe(document.body, { childList: true, subtree: true });
  return () => {
    clearTimeout(t);
    io.disconnect();
    mo.disconnect();
  };
}
