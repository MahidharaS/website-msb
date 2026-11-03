import portrait from "@/assets/portrait.asset.json";
import resume from "@/assets/resume.asset.json";
export const assets = { portrait: portrait.url, resume: resume.url };
export const motionChapters = [
  { label: "OBSERVE", title: "START WITH THE MESS.", text: "Scattered signals. Different people. Competing priorities. The first job is to understand what is actually happening." },
  { label: "CONNECT", title: "FIND THE CONNECTION.", text: "Bring data, people, and process into the same picture. Find the cause, not just the symptom." },
  { label: "CHANGE", title: "MAKE IT WORK.", text: "Turn the insight into a working system. Put it in people's hands. Measure what changes." },
];
export const email = "mahidhara.s@outlook.com";
export const linkedin = "https://www.linkedin.com/in/mahidhara-s/";
export const navigation = [
  { to: "/", name: "The Brief" },
  { to: "/story", name: "The Journey" },
  { to: "/work", name: "The Work" },
  { to: "/approach", name: "The Approach" },
  { to: "/lab", name: "The Lab" },
  { to: "/multiplier", name: "The Multiplier" },
  { to: "/contact", name: "Let’s Talk" },
] as const;
export const metrics = [
  { value: "94.6%", label: "Lead-scoring model accuracy", slug: "lead-engine" },
  { value: "~₹50L", label: "Revenue of the unit I support through operations", slug: "kpi-system" },
  { value: "10", label: "People currently managed", slug: null },
  { value: "65", label: "People previously managed on the shop floor", slug: "shop-floor" },
];
export const cases = [
  {
    slug: "lead-engine",
    title: "Sales was guessing who to call.",
    tags: ["DATA", "SALES", "TECHNOLOGY"],
    metric: "94.6%",
    metricLabel: "Lead-scoring model accuracy",
    company: "DIGITAL MAVEN · 2024–PRESENT",
    context:
      "Thousands of leads, multiple sources, and a sales team deciding who to call first. At Digital Maven, I connect the data pipeline to the live sales workflow.",
    problem:
      "High-intent leads and low-probability enquiries looked alike. CRM attributes alone missed the intent and objections inside salesperson remarks.",
    diagnosis:
      "The useful signals were spread across lead qualifications, interaction history, CRM attributes, and unstructured remarks. The problem needed both reliable ingestion and better prioritisation.",
    built:
      "An automated pipeline brings Meta Lead Ads, website and email leads into the CRM via API, processing approximately 1 lakh records without manual handling. NLP and deep learning surface conversion signals. MLflow supports experiment tracking, versioning, and serving. Scores are integrated into the sales workflow.",
    impact:
      "Representatives prioritise high-probability leads and focus follow-up effort where conversion likelihood is highest.",
    lesson:
      "A model is only useful when its output changes a real decision. Model internals are confidential; only outcomes are presented.",
  },
  {
    slug: "kpi-system",
    title: "Four functions. No single truth.",
    tags: ["DATA", "OPERATIONS"],
    metric: "~40%",
    metricLabel: "Faster reporting turnaround",
    company: "DIGITAL MAVEN · 2024–PRESENT",
    context:
      "As head of a 10-person unit, I support operations generating approximately ₹50 lakhs in revenue to date.",
    problem:
      "Conflicting local spreadsheets across four business functions made reporting slow and inconsistent.",
    diagnosis:
      "Before building a dashboard, the team needed agreed definitions and a clear path from source data to each metric.",
    built:
      "Defined and documented 12+ cross-functional KPIs with agreed definitions and data lineage. Built 6+ Power BI dashboards for lead conversion, productivity, and program delivery.",
    impact:
      "Reporting turnaround reduced by approximately 40%, replacing conflicting spreadsheets with shared measures.",
    lesson: "A single source of truth starts with a shared definition, not a new chart.",
  },
  {
    slug: "crm-automation",
    title: "Follow-ups were manual and leaky.",
    tags: ["SALES", "TECHNOLOGY", "PROCESS"],
    metric: "~30%",
    metricLabel: "Less manual follow-up effort",
    company: "DIGITAL MAVEN · 2024–PRESENT",
    context: "CRM follow-up work sat between sales requirements and day-to-day execution.",
    problem: "Manual follow-up effort took time away from higher-value sales conversations.",
    diagnosis:
      "Requirements needed to become clear, testable behaviours before workflow automation could be trusted.",
    built:
      "Gathered CRM automation requirements, authored acceptance criteria, and ran user acceptance testing.",
    impact: "Manual follow-up effort reduced by approximately 30%.",
    lesson: "Automation is not finished when it runs. It is finished when people can rely on it.",
  },
  {
    slug: "shop-floor",
    title: "Idle machines. Invisible lost time.",
    tags: ["OPERATIONS", "DATA", "PROCESS"],
    metric: "+10%",
    metricLabel: "Shift output efficiency",
    company: "TRITON VALVES · 2020–2021",
    context: "A 65-member shift operation at Triton Valves in Mysore.",
    problem:
      "Machine idle time and throughput gaps needed a quantitative baseline for continuous-improvement reviews.",
    diagnosis:
      "Production decisions needed real-time visibility, alongside statistical process control and visual management.",
    built:
      "Built real-time production dashboards exposing idle time and throughput gaps. Applied SPC and visual management to identify, escalate, and resolve recurring quality bottlenecks.",
    impact:
      "Shift output efficiency improved by over 10%, and continuous-improvement reviews gained their first quantitative baseline.",
    lesson: "Data only matters when someone acts on it.",
  },
  {
    slug: "hospital-workflows",
    title: "Complex workflows. Make them clear.",
    tags: ["PROCESS", "TECHNOLOGY"],
    metric: "15+",
    metricLabel: "User workflows documented",
    company: "PEPINO TECHNOLOGY · 2023",
    context:
      "A business analyst internship supporting three Azure-hosted hospital management modules.",
    problem:
      "Dataflows and user workflows needed to be mapped and validated across hospital management modules.",
    diagnosis:
      "Understanding how users move through a system is essential before deciding what to measure.",
    built:
      "Mapped dataflows, prototyped analytics for three modules, documented 15+ user workflows, and supported UAT cycles.",
    impact:
      "Documented workflows and analytics prototypes supported user acceptance testing across the modules.",
    lesson: "Understand the workflow before designing the solution.",
  },
];
export const timeline = [
  {
    year: "2015–2019",
    title: "THE ENGINEER.",
    company: "BE MECHANICAL ENGINEERING · NIE MYSORE",
    text: "Engineer by training. A foundation in systems, constraints, and understanding how things work.",
  },
  {
    year: "2019–2020",
    title: "FIRST CONTACT.",
    company: "SERVICE ADVISOR · URS CARS",
    text: "Straight out of college into live operations — customers, vehicles, deadlines. Then COVID-19 delayed joining my next role by four months.",
  },
  {
    year: "2020–2021",
    title: "THE SHOP FLOOR.",
    company: "GRADUATE ENGINEER TRAINEE · TRITON VALVES",
    text: "A 65-member shift. Real-time dashboards. Over 10% improvement in shift output efficiency. The lesson: data only matters when someone acts on it.",
  },
  {
    year: "2022–2024",
    title: "THE PIVOT.",
    company: "PGDM · RIMS BANGALORE / KPMG BA L1 & L2",
    text: "Business Analytics & Marketing brought the business lens. A 2023 internship at Pepino Technology brought dataflow mapping, hospital workflows, and UAT.",
  },
  {
    year: "2024–NOW",
    title: "THE ENGINE.",
    company: "ML ENGINEER & HEAD OF UNIT · DIGITAL MAVEN",
    text: "From automated ingestion and NLP-based lead scoring to cross-functional KPIs and running a 10-person unit. Analyst by choice. Operator by nature.",
  },
];
export const steps = [
  {
    name: "OBSERVE",
    text: "Understand the people, the workflow, and the actual problem. At Pepino, that meant mapping 15+ hospital user workflows.",
    slug: "hospital-workflows",
  },
  {
    name: "DIAGNOSE",
    text: "Find the root cause, not just the visible symptom. On the shop floor, dashboards exposed machine idle time and throughput gaps.",
    slug: "shop-floor",
  },
  {
    name: "BUILD",
    text: "Choose the right combination of data, process, and technology. The lead engine connects automated ingestion to NLP-based scoring.",
    slug: "lead-engine",
  },
  {
    name: "RUN",
    text: "Put the solution into the real workflow. CRM acceptance criteria and UAT made automation usable by the team.",
    slug: "crm-automation",
  },
  {
    name: "MEASURE",
    text: "Agree on what success means and keep improving. Twelve-plus shared KPIs made four functions speak the same language.",
    slug: "kpi-system",
  },
];
export const sideBuilds = [
  {
    title: "Supply Chain KPI Automation",
    metric: "2 days",
    text: "SQL ETL into Power BI and Tableau, with data-quality checks and validation rules. Replaced a manual reporting cycle that took two days.",
  },
  {
    title: "Car Price Prediction",
    metric: "8,000+",
    text: "An artificial neural network on CarDekho listings. Feature engineering and model comparison in Python; the ANN outperformed linear regression on RMSE.",
  },
  {
    title: "Social Media Revenue Mapping",
    metric: "10,000+",
    text: "Data points across four social channels. Python and Excel analysis of engagement-to-revenue correlation, with segmented performance dashboards.",
  },
];
export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — Mahidhara S.` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — Mahidhara S.` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
