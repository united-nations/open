import { SectionHeading, SubsectionHeading } from "@/components/ContentHeading";
import { HomeChartCards } from "@/components/HomeChartCards";
import { PageBody } from "@/components/PageBody";
import { relatedDataGroups } from "@/lib/relatedDataPages";

export function RelatedDataPages({ page }: { page: string }) {
  const groups = relatedDataGroups(page);
  if (!groups.length) return null;
  return (
    <PageBody
      className="pt-0"
      aria-labelledby="related-data-pages-heading"
      data-related-data-pages
    >
      <SectionHeading id="related-data-pages-heading">
        Related pages
      </SectionHeading>
      <div className="mt-3 space-y-8">
        {groups.map((group) => (
          <div
            key={group.heading}
            className="space-y-3"
            data-related-data-group
          >
            <SubsectionHeading>{group.heading}</SubsectionHeading>
            <HomeChartCards links={group.links} layout="related" />
          </div>
        ))}
      </div>
    </PageBody>
  );
}
