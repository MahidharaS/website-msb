import { createFileRoute } from "@tanstack/react-router";
import { Lab } from "@/components/portfolio";
import { pageHead } from "@/data/content";
export const Route = createFileRoute("/lab")({
  head: () =>
    pageHead(
      "Ask Mahi",
      "Interview an AI assistant grounded in Mahidhara's work history, case studies and skills.",
    ),
  component: Lab,
});
