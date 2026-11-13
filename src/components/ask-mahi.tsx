import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Copy, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Glow } from "./glow";
import { assets, email } from "@/data/content";
import {
  CHAT_API_URL,
  chatSessionId,
  checkLive,
  endChatSession,
  liveAnswer,
  offlineAnswer,
  type ChatTurn,
  type Source,
  type StreamEvent,
} from "@/lib/answer-engine";

type Message = ChatTurn & {
  id: string;
  sources?: Source[];
  pending?: boolean;
  nudge?: boolean;
  error?: boolean;
};
type Mode = "checking" | "live" | "offline";

const SUGGESTIONS = [
  { tag: "HIRING", q: "What would Mahidhara bring to a data science team?" },
  {
    tag: "PROOF",
    q: "How did the lead-scoring model reach 94.6% accuracy in production?",
  },
  {
    tag: "LLM",
    q: "What has he done with LLMs, LoRA, LangChain and LangSmith?",
  },
  { tag: "BUSINESS", q: "Which business functions has he worked with?" },
];

const newId = () => Math.random().toString(36).slice(2, 10);

const sessionId = chatSessionId;

// A one-time, optional "who am I talking to?" note. It appears only after an answer has
// landed and the visitor has gone quiet, never while they type, and never if they already
// introduced themselves.
const NUDGE_TEXT =
  "By the way, I'd love to know who I'm talking to. If you're happy to share your name and where you work (or an email), I'll follow up personally. Completely optional; keep asking either way.";
const INTRODUCED = /@|\b(my name is|i am|i'm|im|this is|call me)\s+[a-z]/i;
const NUDGE_KEY = "ask-mahi-nudged";
function nudgedAlready() {
  try {
    return sessionStorage.getItem(NUDGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function AskMahi() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // same first render on server and client; the effect below decides live vs offline
  const [mode, setMode] = useState<Mode>("checking");
  const abort = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!CHAT_API_URL) {
      setMode("offline");
      return;
    }
    const ac = new AbortController();
    // free Spaces sleep; give the wake-up a little time
    const timer = setTimeout(() => ac.abort(), 12000);
    checkLive(ac.signal).then((ok) => setMode(ok ? "live" : "offline"));
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, []);

  // when the visitor leaves, the backend emails Mahidhara a summary of this chat
  const chatted = useRef(false);
  useEffect(() => {
    const leave = () => {
      if (chatted.current) endChatSession(chatSessionId());
    };
    const hidden = () => document.visibilityState === "hidden" && leave();
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      leave();
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  // quiet-moment nudge: 25s after the first answer, 12s after later ones
  const [nudgeOpen, setNudgeOpen] = useState(false);
  useEffect(() => {
    if (busy || draft.trim() || nudgedAlready()) return;
    const asked = messages.filter((m) => m.role === "user");
    if (!asked.length || asked.some((m) => INTRODUCED.test(m.content))) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || last.pending || last.error)
      return;
    const t = window.setTimeout(
      () => {
        if (document.visibilityState !== "visible" || nudgedAlready()) return;
        try {
          sessionStorage.setItem(NUDGE_KEY, "1");
        } catch {
          /* ignore */
        }
        setMessages((m) => [
          ...m,
          { id: newId(), role: "assistant", content: NUDGE_TEXT, nudge: true },
        ]);
        setNudgeOpen(true);
      },
      asked.length === 1 ? 25000 : 12000,
    );
    return () => clearTimeout(t);
  }, [messages, busy, draft]);

  useEffect(() => {
    log.current?.scrollTo({
      top: log.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setDraft("");
    setNudgeOpen(false);
    const history = messages
      .filter((m) => !m.error)
      .map(({ role, content }) => ({ role, content }));
    const reply: Message = {
      id: newId(),
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((m) => [
      ...m,
      { id: newId(), role: "user", content: q },
      reply,
    ]);
    setBusy(true);
    const ac = new AbortController();
    abort.current = ac;
    const patch = (fn: (m: Message) => Message) =>
      setMessages((list) => list.map((m) => (m.id === reply.id ? fn(m) : m)));
    const run = async (stream: AsyncGenerator<StreamEvent>) => {
      for await (const ev of stream) {
        if (ac.signal.aborted) break;
        if (ev.type === "token")
          patch((m) => ({ ...m, content: m.content + ev.content }));
        else if (ev.type === "sources")
          patch((m) => ({ ...m, sources: ev.sources }));
        else if (ev.type === "error") throw new Error(ev.message);
      }
    };
    try {
      if (mode === "live") {
        try {
          chatted.current = true;
          await run(liveAnswer(q, history, sessionId(), ac.signal));
        } catch (e) {
          if (ac.signal.aborted) throw e;
          setMode("offline");
          patch((m) => ({ ...m, content: "" }));
          await run(offlineAnswer(q));
        }
      } else await run(offlineAnswer(q));
    } catch {
      if (!ac.signal.aborted)
        patch((m) => ({
          ...m,
          error: true,
          content:
            m.content ||
            `Something went wrong. You can reach Mahidhara directly at ${email}.`,
        }));
    } finally {
      patch((m) => ({ ...m, pending: false }));
      setBusy(false);
      abort.current = null;
      input.current?.focus();
    }
  }

  const status =
    mode === "live"
      ? "LIVE · RAG ON MY KNOWLEDGE BASE"
      : mode === "checking"
        ? "WAKING THE MODEL…"
        : "OFFLINE MODE · ANSWERS FROM PORTFOLIO FACTS";

  return (
    <div className="ask">
      <aside className="ask-side">
        <p className="mono text-primary">04 / ASK MAHI</p>
        <h1>
          INTERVIEW
          <br />
          <span>MY AI.</span>
        </h1>
        <p>
          A retrieval-augmented assistant grounded in my work history, case
          studies and skills. It answers from what is documented, and says so
          when it doesn’t know.
        </p>
        <div className="ask-status mono" data-mode={mode} role="status">
          <i /> {status}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mono justify-start"
          onClick={() => setMessages([])}
          disabled={busy || !messages.length}
        >
          <RotateCcw /> NEW CHAT
        </Button>
        <div className="ask-stack mono">
          NVIDIA NEMOTRON · TOOL CALLING
          <br />
          MCP SERVER · READ-ONLY TOOLS
          <br />
          KNOWLEDGE CURATED IN GOOGLE DRIVE
          <br />
          LANGCHAIN · LANGSMITH
        </div>
      </aside>
      <section className="ask-main" aria-label="Conversation">
        <div className="ask-log" ref={log} aria-live="polite">
          {!messages.length ? (
            <div className="ask-empty">
              <h2>
                ASK WHAT A RECRUITER
                <br />
                <span>WOULD ASK.</span>
              </h2>
              <div className="ask-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s.q} type="button" onClick={() => send(s.q)}>
                    <small>{s.tag}</small>
                    {s.q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="msg" data-role={m.role}>
                <div className="msg-avatar">
                  {m.role === "assistant" ? (
                    <img src={assets.portrait} alt="" />
                  ) : (
                    "YOU"
                  )}
                </div>
                <div className="msg-body">
                  <div className="msg-name">
                    {m.role === "assistant" ? "MAHI · AI" : "YOU"}
                  </div>
                  {m.pending && !m.content ? (
                    <span className="msg-thinking" aria-label="Thinking">
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : (
                    <div className="msg-text">
                      {m.content}
                      {m.pending && <span className="msg-caret" />}
                    </div>
                  )}
                  {m.sources?.length ? (
                    <div className="msg-sources">
                      {m.sources.map((s) =>
                        s.url?.startsWith("/") && !s.url.includes("#") ? (
                          <Link key={s.title} to={s.url}>
                            ↗ {s.title}
                          </Link>
                        ) : s.url ? (
                          <a
                            key={s.title}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ↗ {s.title}
                          </a>
                        ) : (
                          <span key={s.title}>{s.title}</span>
                        ),
                      )}
                    </div>
                  ) : null}
                  {m.nudge && nudgeOpen && (
                    <div className="msg-nudge">
                      <Button
                        size="sm"
                        onClick={() => {
                          setDraft("Hi, I'm  from ");
                          setNudgeOpen(false);
                          requestAnimationFrame(() => {
                            const el = input.current;
                            if (el) {
                              el.focus();
                              el.setSelectionRange(8, 8);
                            }
                          });
                        }}
                      >
                        Sure, I'll introduce myself
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNudgeOpen(false)}
                      >
                        Maybe later
                      </Button>
                    </div>
                  )}
                  {m.role === "assistant" &&
                    !m.pending &&
                    m.content &&
                    !m.nudge && (
                      <div className="msg-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mono h-7 px-2"
                          onClick={() =>
                            navigator.clipboard?.writeText(m.content)
                          }
                        >
                          <Copy size={12} /> COPY
                        </Button>
                      </div>
                    )}
                </div>
              </div>
            ))
          )}
        </div>
        <form
          className="ask-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <Glow className="ask-input" radius={26}>
            <textarea
              ref={input}
              rows={1}
              value={draft}
              aria-label="Ask a question"
              placeholder="Ask about experience, projects, skills or fit…"
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
            />
            {busy ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Stop"
                onClick={() => abort.current?.abort()}
              >
                <Square size={14} />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                aria-label="Send"
                disabled={!draft.trim()}
              >
                <ArrowUp />
              </Button>
            )}
          </Glow>
          <p className="ask-note">
            AI can be wrong; confirm anything important with Mahidhara at{" "}
            {email}. Conversations are shared with Mahidhara so he can follow
            up, and remembered for next time if you tell me your name.
          </p>
        </form>
      </section>
    </div>
  );
}
