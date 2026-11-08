import { useState } from "react";
import {
  Activity,
  BarChart3,
  Brain,
  Check,
  Code2,
  Database,
  FlaskConical,
  Gauge,
  Link2,
  ListChecks,
  Repeat,
  Search,
  Table2,
  Type,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const FALLBACK: Record<string, LucideIcon> = {
  activity: Activity,
  chart: BarChart3,
  brain: Brain,
  check: Check,
  code: Code2,
  database: Database,
  flask: FlaskConical,
  gauge: Gauge,
  link: Link2,
  list: ListChecks,
  repeat: Repeat,
  search: Search,
  table: Table2,
  text: Type,
  users: Users,
  workflow: Workflow,
};

/** Brand logo from Simple Icons when one exists, otherwise a neutral line icon. */
export function ToolIcon({
  slug,
  fallback,
}: {
  slug: string;
  fallback: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "failed">(
    slug ? "loading" : "failed",
  );
  const Icon = FALLBACK[fallback] ?? Code2;
  return (
    <span className="chip-icon" data-logo={state} aria-hidden="true">
      {state !== "ok" && <Icon />}
      {state !== "failed" && (
        <img
          src={`https://cdn.simpleicons.org/${slug}/101113`}
          alt=""
          loading="lazy"
          width={18}
          height={18}
          onLoad={() => setState("ok")}
          onError={() => setState("failed")}
        />
      )}
    </span>
  );
}
