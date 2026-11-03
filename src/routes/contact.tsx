import { createFileRoute } from "@tanstack/react-router";
import { Contact } from "@/components/portfolio";
import { pageHead } from "@/data/content";
export const Route = createFileRoute("/contact")({
  head: () =>
    pageHead(
      "Let’s Talk",
      "Bring Mahidhara a messy business problem. Start a conversation about data, operations, sales, or technology.",
    ),
  component: Contact,
});
