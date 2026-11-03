import { createFileRoute } from "@tanstack/react-router";
import { Story } from "@/components/portfolio";
import { pageHead } from "@/data/content";
export const Route = createFileRoute("/story")({
  head: () =>
    pageHead(
      "The Journey",
      "From mechanical engineering and the shop floor to business analytics and machine learning.",
    ),
  component: Story,
});
