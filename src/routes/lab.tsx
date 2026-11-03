import { createFileRoute } from "@tanstack/react-router";
import { Lab } from "@/components/portfolio";
import { pageHead } from "@/data/content";
export const Route = createFileRoute("/lab")({
  head: () =>
    pageHead(
      "The Lab",
      "Explore practical experiments, side projects, and an illustrative lead-scoring playground.",
    ),
  component: Lab,
});
