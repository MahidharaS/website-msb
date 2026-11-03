import { createFileRoute } from "@tanstack/react-router";
import { Work } from "@/components/portfolio";
import { pageHead } from "@/data/content";
export const Route = createFileRoute("/work/")({
  head: () =>
    pageHead(
      "The Work",
      "Five contribution stories: lead scoring, business reporting, CRM automation, production, and hospital workflows.",
    ),
  component: Work,
});
