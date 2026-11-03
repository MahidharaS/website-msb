import { createFileRoute } from "@tanstack/react-router";
import { Approach } from "@/components/portfolio";
import { pageHead } from "@/data/content";
export const Route = createFileRoute("/approach")({
  head: () =>
    pageHead(
      "The Approach",
      "Observe, diagnose, build, run, measure. How Mahidhara approaches messy business problems.",
    ),
  component: Approach,
});
