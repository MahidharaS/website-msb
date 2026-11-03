import { createFileRoute } from "@tanstack/react-router";
import { Multiplier } from "@/components/portfolio";
import { pageHead } from "@/data/content";
export const Route = createFileRoute("/multiplier")({
  head: () =>
    pageHead(
      "The Multiplier",
      "Analytics training, community, bootcamps, and Aithon: impact beyond individual output.",
    ),
  component: Multiplier,
});
