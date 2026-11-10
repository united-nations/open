import { SectionHeading } from "@/components/ContentHeading";
import { HomeChartCards } from "@/components/HomeChartCards";
import { relatedDataGroups } from "@/lib/relatedDataPages";

export function RelatedDataPages({ page }: { page: string }) {
  const groups = relatedDataGroups(page);
  if (!groups.length) return null;
  return (
    <section
      className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16"
      aria-labelledby="related-data-pages-heading"
      data-related-data-pages
    >
      <SectionHeading id="related-data-pages-heading">
        Related pages
      </SectionHeading>
      <div className="mt-4 space-y-8">
        {groups.map((group) => (
          <div
            key={group.heading}
            className="space-y-3"
            data-related-data-group
          >
            <h3 className="text-base font-semibold text-gray-900">
              {group.heading}
            </h3>
            <HomeChartCards links={group.links} layout="related" />
          </div>
        ))}
      </div>
    </section>
  );
}
