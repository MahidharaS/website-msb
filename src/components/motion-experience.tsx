import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUpRight, Pause, Play } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { assets, motionChapters } from '@/data/content';
import type { MotionInput } from './motion-scene';

const MotionScene = lazy(() => import('./motion-scene'));

function Stage({ children, journey = false }: { children: ReactNode; journey?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const input = useRef<MotionInput>({ progress: 0, x: 0, y: 0, reduced: false, active: true });
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => { input.current.reduced = media.matches; setPaused(media.matches); };
    reduced();
    media.addEventListener('change', reduced);
    const update = () => {
      const el = root.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - window.innerHeight)));
      input.current.progress = journey ? p : Math.max(0, Math.min(1, -rect.top / rect.height));
      input.current.active = rect.bottom > 0 && rect.top < window.innerHeight;
      setChapter(Math.min(2, Math.floor(p * 3)));
      el.style.setProperty('--scroll-progress', String(p));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); media.removeEventListener('change', reduced); };
  }, [journey]);
  return <section ref={root} className={journey ? 'motion-journey' : 'motion-hero'} data-chapter={chapter}
    onPointerMove={e => {
      const rect = e.currentTarget.getBoundingClientRect();
      input.current.x = (e.clientX - rect.left) / rect.width * 2 - 1;
      input.current.y = -(e.clientY / window.innerHeight * 2 - 1);
    }} onPointerLeave={() => { input.current.x = 0; input.current.y = 0; }}>
    <div className={journey ? 'motion-sticky' : 'motion-stage'}>
      <div className="motion-canvas" aria-hidden="true">
        {mounted && <Suspense fallback={<div className="motion-fallback" />}><MotionScene input={input} /></Suspense>}
      </div>
      {journey ? <>
        <div className="journey-heading mono">01 / FROM COMPLEXITY TO CLARITY</div>
        <div className="journey-copy">
          {motionChapters.map((item, i) => <div key={item.title} className="journey-chapter" data-active={chapter === i} aria-hidden={chapter !== i}>
            <span className="mono text-primary">0{i + 1} / {item.label}</span>
            <h2 className="display">{item.title}</h2>
            <p>{item.text}</p>
            {i === 2 && <Button asChild variant="outline"><Link to="/work">The proof <ArrowUpRight /></Link></Button>}
          </div>)}
        </div>
        <div className="journey-track mono">{motionChapters.map((c, i) => <span key={c.label} data-active={chapter === i}>0{i + 1} {c.label}</span>)}<div className="journey-progress" /></div>
      </> : children}
      <Button variant="ghost" size="icon" className="motion-pause" aria-label={paused ? 'Play motion' : 'Pause motion'} title={paused ? 'Play motion' : 'Pause motion'} onClick={() => { input.current.reduced = !paused; setPaused(!paused); }}>{paused ? <Play size={15} /> : <Pause size={15} />}</Button>
    </div>
  </section>;
}

export function MotionHero() {
  return <Stage>
    <div className="motion-top mono"><span><span className="status-dot" /> ENGINEER · ANALYST · OPERATOR</span><span>BANGALORE, INDIA ↗</span></div>
    <div className="motion-hero-copy">
      <p className="mono text-primary">MAHIDHARA S.</p>
      <p className="motion-kicker">I DON'T JUST ANALYSE PROBLEMS.</p>
      <h1 className="display">I WORK<br /><span>ON THEM.</span></h1>
      <p className="motion-sub">I connect data, people, and processes to turn messy business problems into measurable outcomes.</p>
      <div className="hero-actions"><Button asChild size="lg"><Link to="/work">See the work <ArrowUpRight /></Link></Button><Button asChild variant="ghost"><Link to="/story">My story <ArrowUpRight /></Link></Button></div>
    </div>
    <Link to="/story" className="motion-signature"><img src={assets.portrait} alt="Mahidhara S." /><span className="mono">NOT THE TOOL.<br />THE PROBLEM.</span><ArrowUpRight size={16} /></Link>
    <div className="motion-bottom mono"><span>DATA / PEOPLE / PROCESS</span><a href="#complexity">SCROLL INTO THE CONTEXT <ArrowDown size={14} /></a></div>
  </Stage>;
}
export function MotionJourney() { return <div id="complexity"><Stage journey>{null}</Stage></div>; }