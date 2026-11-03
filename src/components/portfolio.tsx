import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Check,
  Layers,
  List,
  FlaskConical,
  Users,
  BriefcaseBusiness,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotionHero, MotionJourney } from "@/components/motion-experience";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  assets,
  cases,
  metrics,
  timeline,
  steps,
  sideBuilds,
  email,
  linkedin,
} from "@/data/content";
export function PageHeading({
  index,
  title,
  children,
}: {
  index: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading reveal">
      <div className="eyebrow mono">
        <span className="status-dot" />
        {index}
      </div>
      <h1 className="display">{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}
export function WorkCard({ item }: { item: (typeof cases)[number] }) {
  return (
    <Link to="/work/$slug" params={{ slug: item.slug }} className="work-card">
      <div className={`work-art work-art-${item.slug}`}>
        <svg className="work-signal" viewBox="0 0 400 200" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => <path key={i} d={item.slug === 'lead-engine'
            ? `M ${i * 23} 0 Q ${200 + (i - 9) * 6} 100 200 200`
            : item.slug === 'kpi-system' ? `M 0 ${i * 12} C 100 ${i * 12} 260 ${200 - i * 12} 400 ${200 - i * 12}`
            : `M ${i * 24} 200 L ${i * 24} ${120 - Math.sin(i) * 35} L ${i * 24 + 40} ${120 - Math.sin(i) * 35} L ${i * 24 + 40} 0`} />)}
        </svg>
        <span className="art-number">{item.metric}</span>
        <span className="art-label mono">{item.metricLabel}</span>
        <ArrowUpRight className="absolute right-4 top-4 text-primary" size={18} />
      </div>
      <h3>{item.title}</h3>
      <div>
        {item.tags.map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
export function Home() {
  return (
    <main>
      <MotionHero />
      <MotionJourney />
      <section className="metrics" aria-label="Headline contributions">
        {metrics.map((m) =>
          m.slug ? (
            <Link key={m.value} to="/work/$slug" params={{ slug: m.slug }} className="metric">
              <div className="display">{m.value}</div>
              <p>{m.label}</p>
            </Link>
          ) : (
            <Link key={m.value} to="/approach" className="metric">
              <div className="display">{m.value}</div>
              <p>{m.label}</p>
            </Link>
          ),
        )}
      </section>
      <section className="section">
        <div className="section-top">
          <div>
            <p className="mono section-index">01 / FIND YOUR STARTING POINT</p>
            <h2 className="section-heading">WHAT BRINGS YOU HERE?</h2>
          </div>
          <span className="mono text-muted-foreground hidden sm:block">
            DIFFERENT PATHS. SAME CONTEXT.
          </span>
        </div>
        <div className="paths">
          <Button
            variant="ghost"
            className="path h-auto whitespace-normal"
            onClick={() => window.dispatchEvent(new Event("open-recruiter"))}
          >
            <BriefcaseBusiness size={19} className="text-muted-foreground" />
            <ArrowUpRight className="arrow" />
            <h3>I'M HIRING.</h3>
            <p>The 30-second brief. Proof, fit, and resume.</p>
          </Button>
          <Link to="/contact" className="path">
            <Layers size={19} className="text-muted-foreground" />
            <ArrowUpRight className="arrow" />
            <h3>I HAVE A PROBLEM.</h3>
            <p>A messy challenge? That's a good start.</p>
          </Link>
          <Link to="/story" className="path">
            <Users size={19} className="text-muted-foreground" />
            <ArrowUpRight className="arrow" />
            <h3>SHOW ME THE STORY.</h3>
            <p>From the shop floor to machine learning.</p>
          </Link>
        </div>
      </section>
      <section className="section border-t border-border">
        <div className="section-top">
          <div>
            <p className="mono section-index">02 / SELECTED CONTRIBUTIONS</p>
            <h2 className="section-heading">THE PROBLEM. THEN THE PROOF.</h2>
          </div>
          <Button asChild variant="ghost" className="mono px-0">
            <Link to="/work">
              ALL WORK <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="featured-grid">
          {cases.slice(0, 3).map((c) => (
            <WorkCard item={c} key={c.slug} />
          ))}
        </div>
      </section>
      <section className="manifesto">
        <span className="mono text-primary">
          03 / NOT THE TOOL.
          <br />
          THE PROBLEM.
        </span>
        <p>
          Sometimes the answer is <strong>analytics.</strong> Sometimes it's{" "}
          <strong>strategy, psychology, process, technology</strong> — or a combination.
        </p>
      </section>
    </main>
  );
}
export function Story() {
  return (
    <main>
      <PageHeading
        index="01 / THE JOURNEY"
        title={
          <>
            DIFFERENT ENVIRONMENTS.
            <br />
            <span>SAME APPROACH.</span>
          </>
        }
      >
        Engineer by training. Analyst by choice. Operator by nature.
      </PageHeading>
      <div className="timeline">
        {timeline.map((t) => (
          <section key={t.year} className="chapter">
            <div className="display chapter-year">{t.year}</div>
            <div>
              <div className="mono text-muted-foreground">{t.company}</div>
              <h2 className="display">{t.title}</h2>
              <p>{t.text}</p>
            </div>
          </section>
        ))}
      </div>
      <section className="section">
        <Button asChild size="lg">
          <Link to="/work">
            See what I built <ArrowUpRight />
          </Link>
        </Button>
      </section>
    </main>
  );
}
export function Work() {
  const [filter, setFilter] = useState("ALL");
  const [grid, setGrid] = useState(false);
  const shown = cases.filter((c) => filter === "ALL" || c.tags.includes(filter));
  return (
    <main>
      <PageHeading
        index="02 / THE CONTRIBUTION INDEX"
        title={
          <>
            5 PROBLEMS.
            <br />
            <span>WHAT CHANGED.</span>
          </>
        }
      >
        Not a list of tools. A record of what got better.
      </PageHeading>
      <div className="flex justify-between items-start gap-4">
        <div className="filters">
          {["ALL", "DATA", "OPERATIONS", "SALES", "TECHNOLOGY", "PROCESS"].map((f) => (
            <Button
              key={f}
              variant={f === filter ? "default" : "outline"}
              size="sm"
              className="mono"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label={grid ? "Show list" : "Show grid"}
          onClick={() => setGrid(!grid)}
        >
          {grid ? <List /> : <Layers />}
        </Button>
      </div>
      <div className={grid ? "featured-grid section" : ""}>
        {shown.map((c) =>
          grid ? (
            <WorkCard key={c.slug} item={c} />
          ) : (
            <Link key={c.slug} to="/work/$slug" params={{ slug: c.slug }} className="work-row">
              <span className="mono text-muted-foreground">0{cases.indexOf(c) + 1}</span>
              <div>
                <h3 className="display">{c.title}</h3>
                {c.tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <span className="display row-metric">{c.metric}</span>
              <ArrowUpRight size={21} className="text-primary" />
            </Link>
          ),
        )}
      </div>
    </main>
  );
}
export function CaseStudy({ slug }: { slug: string }) {
  const item = cases.find((c) => c.slug === slug);
  const [node, setNode] = useState(0);
  if (!item)
    return (
      <main>
        <PageHeading index="NOT FOUND" title="THIS PROBLEM DOESN'T EXIST. YET." />
        <Button asChild>
          <Link to="/work">Back to work</Link>
        </Button>
      </main>
    );
  const names = ["Context", "The problem", "Diagnosis", "What I built", "Impact", "What I learned"];
  const paragraphs = [
    item.context,
    item.problem,
    item.diagnosis,
    item.built,
    item.impact,
    item.lesson,
  ];
  const pipeline = ["Sources", "Ingestion", "CRM", "Scoring", "Routing", "Enrolments"];
  const details = [
    "Meta Lead Ads, website, and email sources.",
    "Automated API ingestion of approximately 1 lakh lead records.",
    "CRM attributes, lead qualifications, and interaction history.",
    "NLP and deep learning surface intent, objections, and purchase signals. Model internals are confidential.",
    "Scores integrated into the live sales workflow.",
    "Representatives focus follow-up on higher-probability prospects.",
  ];
  const next = cases[(cases.indexOf(item) + 1) % cases.length];
  return (
    <main>
      <PageHeading index={item.company} title={item.title}>
        <span className="text-primary">{item.metric}</span> — {item.metricLabel}
      </PageHeading>
      <div className="case-layout">
        <nav className="case-toc mono text-muted-foreground" aria-label="Case study sections">
          {names.map((n, i) => (
            <a key={n} href={`#step-${i}`}>
              0{i + 1} / {n}
            </a>
          ))}
        </nav>
        <div>
          {names.map((n, i) => (
            <section id={`step-${i}`} key={n} className="case-section">
              <span className="mono text-primary">
                0{i + 1} / {n}
              </span>
              <h2 className="display">{n}.</h2>
              <p>{paragraphs[i]}</p>
              {i === 3 && slug === "lead-engine" && (
                <>
                  <div className="pipeline">
                    {pipeline.map((n, j) => (
                      <Button
                        key={n}
                        variant={j === node ? "default" : "outline"}
                        onClick={() => setNode(j)}
                      >
                        {n}
                        {j < 5 && <ArrowRight />}
                      </Button>
                    ))}
                  </div>
                  <div className="detail-box">{details[node]}</div>
                </>
              )}
              {i === 4 && <div className="display impact-number">{item.metric}</div>}
            </section>
          ))}
          <section className="section">
            <p className="mono text-muted-foreground mb-4">NEXT CONTRIBUTION</p>
            <Button asChild variant="outline">
              <Link to="/work/$slug" params={{ slug: next?.slug ?? item.slug }}>
                {next?.title ?? item.title}
                <ArrowUpRight />
              </Link>
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}
export function Approach() {
  const [step, setStep] = useState(0);
  return (
    <main>
      <PageHeading
        index="03 / HOW I WORK"
        title={
          <>
            I START WITH THE PROBLEM.
            <br />
            <span>NOT THE TOOL.</span>
          </>
        }
      >
        Understand the context. Find the root cause. Build something useful. Then keep making it
        better.
      </PageHeading>
      <section className="section border-t border-border">
        <div className="section-top">
          <h2 className="section-heading">THE LOOP.</h2>
          <span className="mono text-muted-foreground">REPEAT ↻</span>
        </div>
        <div className="loop">
          {steps.map((s, i) => (
            <Button
              key={s.name}
              variant={i === step ? "default" : "outline"}
              onClick={() => setStep(i)}
            >
              <span className="mono">0{i + 1}</span>
              {s.name}
              <ArrowRight />
            </Button>
          ))}
        </div>
        <div className="detail-box">
          {steps[step]?.text}
          <div className="mt-4">
            <Link
              to="/work/$slug"
              params={{ slug: steps[step]?.slug ?? "lead-engine" }}
              className="mono text-primary"
            >
              SEE IT IN PRACTICE ↗
            </Link>
          </div>
        </div>
      </section>
      <section className="section border-t border-border">
        <p className="mono section-index">THE LENSES</p>
        <h2 className="section-heading mb-7">ONE PROBLEM. MULTIPLE PERSPECTIVES.</h2>
        <div className="paths">
          {["Analytics", "Strategy", "Psychology", "Process", "Technology", "People"].map(
            (n, i) => (
              <Link
                to="/work/$slug"
                params={{ slug: cases[i % 5]?.slug ?? "lead-engine" }}
                className="path"
                key={n}
              >
                <span className="mono text-primary">0{i + 1}</span>
                <h3>{n.toUpperCase()}</h3>
                <ArrowUpRight className="arrow" />
              </Link>
            ),
          )}
        </div>
      </section>
      <section className="section border-t border-border">
        <p className="mono section-index">THE LEAST INTERESTING PART</p>
        <h2 className="section-heading mb-6">THE TOOLBOX.</h2>
        <p className="toolbox">
          Python · SQL · R · NLP · Deep Learning · MLflow · LangChain · LangSmith · CrewAI · Dify ·
          LangFlow · n8n · RAG
          <br />
          Power BI · Tableau · Excel + VBA · ETL · Requirements · UAT · KPI Design · Process Mapping
          · Agile · Lean · ClickUp · CRM
        </p>
        <div className="mt-7 flex gap-2 flex-wrap">
          {[
            "KPMG BA L1 & L2",
            "EXCELR DATA ANALYST",
            "HOCH TECH PYTHON & MYSQL",
            "JPMORGAN CHASE EXCEL",
            "CISCO DATA SCIENCE",
            "SEMRUSH SMM",
          ].map((n) => (
            <span className="tag" key={n}>
              {n}
            </span>
          ))}
        </div>
      </section>
      <Button asChild size="lg">
        <Link to="/contact">
          Try it on my problem <ArrowUpRight />
        </Link>
      </Button>
    </main>
  );
}
export function Lab() {
  const [signals, setSignals] = useState<boolean[]>([false, false, false, false, false]);
  const [project, setProject] = useState<(typeof sideBuilds)[number] | null>(null);
  const labels = [
    "Asked about fees",
    "Requested callback",
    "Mentioned job switch",
    "No response ×3",
    "Price objection in remarks",
  ];
  const weights = [20, 25, 15, -25, -15];
  const score = Math.max(
    0,
    Math.min(100, 35 + signals.reduce((s, v, i) => s + (v ? (weights[i] ?? 0) : 0), 0)),
  );
  return (
    <main>
      <PageHeading
        index="04 / THE LAB"
        title={
          <>
            CURIOSITY.
            <br />
            <span>PUT TO WORK.</span>
          </>
        }
      >
        Side builds, experiments, and things I made to understand a problem better.
      </PageHeading>
      <div className="section-top">
        <h2 className="section-heading">LEAD SCORE PLAYGROUND.</h2>
        <FlaskConical className="text-primary" />
      </div>
      <p className="mono text-muted-foreground mb-5">
        ILLUSTRATIVE DEMO — NOT REAL DATA OR THE PRODUCTION MODEL
      </p>
      <div className="lab-layout">
        <div className="signals">
          {labels.map((l, i) => (
            <label className="signal" key={l}>
              <input
                type="checkbox"
                checked={signals[i]}
                onChange={() => setSignals((v) => v.map((s, j) => (j === i ? !s : s)))}
              />
              {l}
            </label>
          ))}
        </div>
        <div>
          <div className="gauge">
            <span className="display">{score}</span>
            <span className="mono">{score >= 70 ? "HOT" : score >= 40 ? "WARM" : "COLD"} LEAD</span>
          </div>
          <div className="detail-box mono">
            {signals.some(Boolean)
              ? labels
                  .filter((_, i) => signals[i])
                  .map((l) => (
                    <span key={l} className="text-primary block">
                      {l}
                    </span>
                  ))
              : "NO INTENT SIGNALS SELECTED"}
          </div>
        </div>
      </div>
      <section className="section">
        <p className="mono section-index">SIDE BUILDS</p>
        <div className="paths">
          {sideBuilds.map((p) => (
            <Button
              key={p.title}
              variant="ghost"
              className="path h-auto whitespace-normal"
              onClick={() => setProject(p)}
            >
              <span className="mono text-primary">{p.metric}</span>
              <h3>{p.title}</h3>
              <ArrowUpRight className="arrow" />
            </Button>
          ))}
        </div>
      </section>
      <Dialog
        open={!!project}
        onOpenChange={(v) => {
          if (!v) setProject(null);
        }}
      >
        <DialogContent className="dialog-panel">
          <DialogTitle className="display text-3xl">{project?.title}</DialogTitle>
          <DialogDescription className="leading-8 text-muted-foreground">
            {project?.text}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </main>
  );
}
export function Multiplier() {
  const items = [
    {
      number: "200+",
      title: "PARTICIPANTS TRAINED.",
      text: "8+ analytics bootcamps and corporate training sessions on SQL, Power BI, Excel, and data storytelling.",
    },
    {
      number: "100+",
      title: "BUILDERS AT AITHON.",
      text: "Organised and led the Aithon AI hackathon, bringing participants together to build and explore.",
    },
    {
      number: "50+",
      title: "STUDENT TEAMS JUDGED.",
      text: "Evaluated analytics competition teams across partner institutions.",
    },
    {
      number: "4 DAYS",
      title: "TWO PARTNER COLLEGES.",
      text: "A data analytics bootcamp designed to turn concepts into practical experience.",
    },
  ];
  return (
    <main>
      <PageHeading
        index="05 / THE MULTIPLIER"
        title={
          <>
            I DON'T KEEP IT
            <br />
            <span>TO MYSELF.</span>
          </>
        }
      >
        Good work matters. Helping other people do good work multiplies it.
      </PageHeading>
      <div className="community-grid">
        {items.map((i) => (
          <section key={i.title} className="community-item">
            <div className="display">{i.number}</div>
            <h3 className="display">{i.title}</h3>
            <p>{i.text}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
export function Contact() {
  const [step, setStep] = useState(0);
  const [who, setWho] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [problem, setProblem] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [copied, setCopied] = useState(false);
  const subject = encodeURIComponent(`Portfolio inquiry: ${who}`);
  const body = encodeURIComponent(
    `Hi Mahi,\n\nI'm ${name} (${address}).\nI'm reaching out as: ${who}.\nAreas: ${domains.join(", ")}\n\n${problem}\n\nThanks,\n${name}`,
  );
  return (
    <main>
      <PageHeading
        index="06 / LET'S TALK"
        title={
          <>
            BRING ME A<br />
            <span>MESSY PROBLEM.</span>
          </>
        }
      >
        I'll figure out where to start.
      </PageHeading>
      <div className="contact-layout">
        <form
          className="contact-form"
          onSubmit={(e) => {
            e.preventDefault();
            setPrepared(true);
          }}
        >
          <div className="progress">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i <= step ? "active" : ""} />
            ))}
          </div>
          <span className="mono text-primary">0{step + 1} / 03</span>
          {prepared ? (
            <>
              <h2 className="display">LET'S GET IT TO MY INBOX.</h2>
              <p className="text-muted-foreground leading-7">
                Your message is ready. Open your email app to send it directly to me.
              </p>
              <Button asChild className="mt-6">
                <a href={`mailto:${email}?subject=${subject}&body=${body}`}>
                  Open email to send <ArrowUpRight />
                </a>
              </Button>
            </>
          ) : (
            <>
              {step === 0 && (
                <>
                  <h2 className="display">WHO ARE YOU?</h2>
                  <div className="filters">
                    {["Hiring", "Founder / Business", "Student", "Other"].map((v) => (
                      <Button
                        key={v}
                        type="button"
                        variant={who === v ? "default" : "outline"}
                        onClick={() => setWho(v)}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <h2 className="display">WHAT'S MESSY?</h2>
                  <div className="filters">
                    {["Data", "Sales", "Marketing", "Operations", "Process", "Tech"].map((d) => (
                      <Button
                        type="button"
                        key={d}
                        variant={domains.includes(d) ? "default" : "outline"}
                        onClick={() =>
                          setDomains((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d]))
                        }
                      >
                        {domains.includes(d) && <Check />}
                        {d}
                      </Button>
                    ))}
                  </div>
                  <label>
                    Tell me a little about the problem
                    <textarea
                      aria-label="Tell me about the problem"
                      required
                      rows={5}
                      value={problem}
                      onChange={(e) => setProblem(e.target.value)}
                      placeholder="What's happening? What would better look like?"
                    />
                  </label>
                </>
              )}
              {step === 2 && (
                <>
                  <h2 className="display">AND WHO SHOULD I REPLY TO?</h2>
                  <label>
                    Your name
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    Your email
                    <input
                      type="email"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      autoComplete="email"
                    />
                  </label>
                </>
              )}
              <div className="form-actions">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={step === 0}
                  onClick={() => setStep((v) => v - 1)}
                >
                  Back
                </Button>
                {step < 2 ? (
                  <Button
                    type="button"
                    disabled={step === 0 ? !who : !problem.trim()}
                    onClick={() => setStep((v) => v + 1)}
                  >
                    Continue <ArrowRight />
                  </Button>
                ) : (
                  <Button type="submit">
                    Prepare email <ArrowUpRight />
                  </Button>
                )}
              </div>
            </>
          )}
        </form>
        <aside className="contact-aside">
          <p className="mono text-muted-foreground mb-5">PREFER THE DIRECT ROUTE?</p>
          <a href={`mailto:${email}`} className="text-foreground break-all">
            {email}
          </a>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(email);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              <Copy />
              {copied ? "Copied" : "Copy email"}
            </Button>
          </div>
          <a
            href={linkedin}
            target="_blank"
            rel="noreferrer"
            className="flex gap-2 items-center mt-6"
          >
            Find me on LinkedIn <ExternalLink size={14} />
          </a>
          <p className="mono text-muted-foreground mt-12">
            BANGALORE, INDIA
            <br />
            WILLING TO RELOCATE
          </p>
        </aside>
      </div>
    </main>
  );
}
