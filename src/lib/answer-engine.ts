// Ask Mahi client.
// Live mode: streams from the backend in chatbot/ (deployed on Render) set in
// VITE_CHAT_API_URL (NVIDIA Nemotron + MCP tools). Offline mode: a small BM25 retriever over the portfolio facts in
// content.ts, so the page still answers honestly when the backend is asleep or not configured.
import {
  cases,
  email,
  journeyChapters,
  linkedin,
  pitch,
  seeking,
  sideBuilds,
  steps,
  timeline,
} from "@/data/content";

export type Source = { title: string; url?: string };
export type ChatTurn = { role: "user" | "assistant"; content: string };
export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "sources"; sources: Source[] }
  | { type: "done" }
  | { type: "error"; message: string };

const ENV_CHAT_API_URL = (
  (import.meta.env as Record<string, string | undefined>)[
    "VITE_CHAT_API_URL"
  ] ?? ""
).trim();
const ON_LOCALHOST =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
// On your own machine, talk to the local API (port 7860) without any extra setup.
export const CHAT_API_URL = (
  ENV_CHAT_API_URL || (ON_LOCALHOST ? "http://localhost:7860" : "")
).replace(/\/$/, "");

type Doc = { title: string; url: string; text: string; keys?: string };

function corpus(): Doc[] {
  const docs: Doc[] = [
    {
      title: "Profile",
      url: "/",
      text: `Mahidhara S. is an ML engineer and head of a 10-person unit at Digital Maven, Bangalore. Career path: data analyst, then ML engineer, now moving into data science. Worked across sales, operations, marketing, HR and the shop floor. BE Mechanical Engineering, NIE Mysore. PGDM Business Analytics & Marketing, RIMS Bangalore. KPMG Business Analytics L1 & L2. Email ${email}. LinkedIn ${linkedin}.`,
    },
    { title: "What he is looking for", url: "/", text: seeking },
    ...pitch.map((p) => ({
      title: p.title,
      url: "/#value",
      text: `What he brings to a team or company, value he offers: ${p.title} ${p.text} Proof: ${p.proof}.`,
    })),
    ...journeyChapters.map((c) => ({
      title: `${c.label} chapter`,
      url: "/#complexity",
      text: `${c.title} ${c.text} Tools and skills: ${c.tools.join(", ")}.`,
    })),
    ...cases.map((c) => ({
      title: c.title,
      url: `/work/${c.slug}`,
      keys: `${c.metricLabel} ${c.tags.join(" ")}`,
      text: `${c.title} ${c.company}. ${c.context} Problem: ${c.problem} Diagnosis: ${c.diagnosis} Built: ${c.built} Impact: ${c.impact} Result: ${c.metric} ${c.metricLabel}. Lesson: ${c.lesson}`,
    })),
    ...timeline.map((t) => ({
      title: `${t.year} ${t.title}`,
      url: "/story",
      text: `${t.year}: ${t.company}. ${t.text}`,
    })),
    ...steps.map((s) => ({
      title: `Approach: ${s.name}`,
      url: "/approach",
      text: `${s.name}. ${s.text}`,
    })),
    ...sideBuilds.map((s) => ({
      title: s.title,
      url: "/lab",
      text: `Side build: ${s.title} (${s.metric}). ${s.text}`,
    })),
    {
      title: "Community and training",
      url: "/multiplier",
      text: "Trained 200+ participants across 8+ analytics bootcamps and corporate sessions on SQL, Power BI, Excel and data storytelling. Organised and led the Aithon AI hackathon with 100+ builders. Judged 50+ student analytics teams. Ran a 4-day data analytics bootcamp at two partner colleges.",
    },
    {
      title: "Contact",
      url: "/contact",
      text: `Contact Mahidhara at ${email} or on LinkedIn ${linkedin}. Hiring, interviews, freelance problems and collaborations are welcome.`,
    },
  ];
  return docs;
}

const STOP = new Set(
  "would could should will mahidhara mahi a an the and or of to in on for with is are was were be been at by it its as from that this what which who how do does did i you he his him me my your about can tell".split(
    " ",
  ),
);
const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9%₹.+ ]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/\.$/, ""))
    .filter((w) => w && !STOP.has(w));

let index: {
  docs: Doc[];
  toks: string[][];
  df: Map<string, number>;
  avg: number;
} | null = null;
function getIndex() {
  if (index) return index;
  const docs = corpus();
  const toks = docs.map((d) =>
    tokenize(`${d.title} ${d.keys ?? ""} ${d.keys ?? ""} ${d.text}`),
  );
  const df = new Map<string, number>();
  toks.forEach((t) =>
    new Set(t).forEach((w) => df.set(w, (df.get(w) ?? 0) + 1)),
  );
  index = {
    docs,
    toks,
    df,
    avg: toks.reduce((s, t) => s + t.length, 0) / toks.length,
  };
  return index;
}

export function retrieve(query: string, k = 3) {
  const { docs, toks, df, avg } = getIndex();
  const q = tokenize(query);
  const N = docs.length;
  const scored = toks.map((t, i) => {
    let s = 0;
    for (const w of q) {
      const f = t.filter(
        (x) => x === w || (w.length > 4 && x.startsWith(w.slice(0, -1))),
      ).length;
      if (!f) continue;
      const idf = Math.log(
        1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5),
      );
      s += idf * ((f * 2.2) / (f + 1.2 * (0.5 + 0.5 * (t.length / avg))));
    }
    return { doc: docs[i]!, score: s };
  });
  return scored
    .filter((s) => s.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function firstSentences(text: string, n: number) {
  // split on sentence ends followed by a capital, so "S. is" and emails stay intact
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .slice(0, n)
    .join(" ")
    .trim();
}

/** Offline answer composed only from retrieved portfolio facts. */
export async function* offlineAnswer(
  query: string,
): AsyncGenerator<StreamEvent> {
  const hits = retrieve(query);
  let text: string;
  if (/^(hi|hello|hey|namaskara|yo)\b/i.test(query.trim())) {
    text =
      "Hi! I'm Mahi's portfolio assistant. Ask me about his experience, the lead-scoring model, his dashboards, his LLM work, or what he would bring to your team.";
  } else if (!hits.length) {
    text = `I don't have that in my notes yet. The fastest way to get an answer is to ask Mahidhara directly at ${email}.`;
  } else {
    const [lead, ...rest] = hits;
    text = firstSentences(
      lead!.doc.text.replace(
        /^What he brings to a team or company, value he offers: /,
        "",
      ),
      4,
    );
    for (const h of rest)
      text += `\n\n• ${h.doc.title}: ${firstSentences(h.doc.text.replace(/^What he brings to a team or company, value he offers: /, ""), 2)}`;
  }
  for (const word of text.split(/(\s+)/)) {
    yield { type: "token", content: word };
    await new Promise((r) => setTimeout(r, 12));
  }
  if (hits.length)
    yield {
      type: "sources",
      sources: hits.map((h) => ({ title: h.doc.title, url: h.doc.url })),
    };
  yield { type: "done" };
}

export async function checkLive(signal?: AbortSignal) {
  if (!CHAT_API_URL) return false;
  try {
    const r = await fetch(`${CHAT_API_URL}/health`, signal ? { signal } : {});
    if (!r.ok) return false;
    // a host without the API may answer with an HTML page; only a real API says ok: true
    const j = (await r.json().catch(() => null)) as { ok?: boolean } | null;
    return j?.ok === true;
  } catch {
    return false;
  }
}

/** Stream from the backend: Server-Sent Events, one JSON StreamEvent per data line. */
export async function* liveAnswer(
  message: string,
  history: ChatTurn[],
  sessionId: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${CHAT_API_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message,
      history: history.slice(-8),
      session_id: sessionId,
    }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Assistant returned ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        try {
          yield JSON.parse(line.slice(5).trim()) as StreamEvent;
        } catch {
          /* ignore keep-alives */
        }
      }
    }
  }
}

/** Non-identifying context sent with chats and contact messages (page, referrer, timezone). */
export function visitorMeta(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return {
    page: window.location.pathname,
    referrer: document.referrer || "",
    language: navigator.language || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    screen: `${window.screen.width}x${window.screen.height}`,
  };
}

const SESSION_KEY = "ask-mahi-session";
/** One id per browser tab session, shared by the chat and the contact form. */
export function chatSessionId(): string {
  try {
    let v = sessionStorage.getItem(SESSION_KEY);
    if (!v) {
      v = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      sessionStorage.setItem(SESSION_KEY, v);
    }
    return v;
  } catch {
    return "anonymous";
  }
}

/** Tell the backend the visitor left, so the chat summary is emailed right away. */
export function endChatSession(sessionId: string) {
  if (!CHAT_API_URL || typeof navigator === "undefined") return;
  const body = JSON.stringify({ session_id: sessionId });
  try {
    if (
      !navigator.sendBeacon?.(
        `${CHAT_API_URL}/chat/end`,
        new Blob([body], { type: "text/plain" }),
      )
    )
      void fetch(`${CHAT_API_URL}/chat/end`, {
        method: "POST",
        body,
        keepalive: true,
      });
  } catch {
    /* best effort */
  }
}

export async function sendContact(payload: {
  who: string;
  areas: string[];
  message: string;
  name: string;
  email: string;
  website?: string;
}): Promise<{ delivered: boolean }> {
  if (!CHAT_API_URL) return { delivered: false };
  const r = await fetch(`${CHAT_API_URL}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      session_id: chatSessionId(),
      meta: visitorMeta(),
    }),
  });
  if (!r.ok) return { delivered: false };
  return (await r.json()) as { delivered: boolean };
}
