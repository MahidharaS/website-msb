import { createFileRoute } from "@tanstack/react-router";
import { CaseStudy } from "@/components/portfolio";
import { cases, pageHead } from "@/data/content";
export const Route = createFileRoute("/work/$slug")({
  head: ({ params }) => {
    const item = cases.find((c) => c.slug === params.slug);
    return pageHead(
      item?.title ?? "Contribution not found",
      item?.impact ?? "Explore Mahidhara’s contribution stories.",
    );
  },
  component: CasePage,
});
function CasePage() {
  const { slug } = Route.useParams();
  return <CaseStudy slug={slug} />;
}
