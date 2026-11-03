import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/components/portfolio";
import { pageHead } from "@/data/content";
export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "The Brief",
      "Mahidhara S. connects data, people, and processes to solve real business problems.",
    ),
  component: Home,
});
