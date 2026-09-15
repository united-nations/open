import type {
  BudgetNodeSource,
  PeacekeepingContributorsData,
  PeacekeepingMissionAssessment,
} from "@/types";

/** Prefer directly extracted contributor-row pages; retain section evidence for calculated rows. */
export function peacekeepingContributorSources(
  missions: readonly PeacekeepingMissionAssessment[],
  meta: PeacekeepingContributorsData["meta"],
  contributorName?: string,
): BudgetNodeSource[] {
  return missions.flatMap((mission) => {
    const document = meta.source_documents?.find(
      (source) =>
        source.mission_code === mission.code &&
        source.symbol === mission.source_symbol,
    );
    if (document?.sections.length) {
      return document.sections.map((section) => ({
        symbol: document.symbol,
        // Split statements restart their page numbering in each PDF. The
        // enclosing document's URL can be an HTML index in those years.
        url: section.source_url ?? document.url,
        pdfPages:
          contributorName && section.member_pages?.[contributorName]
            ? [section.member_pages[contributorName]]
            : section.pages,
        pdfPageScope:
          contributorName && section.member_pages?.[contributorName]
            ? "row"
            : "section",
        pageStatus:
          contributorName && section.member_pages?.[contributorName]
            ? "extracted_pdf_row"
            : "section",
        label: `${mission.code} · ${section.label}`,
        rowLabel:
          contributorName && section.member_pages?.[contributorName]
            ? contributorName
            : "",
        columnHeader:
          section.kind === "credit"
            ? "Net credit (subtracted)"
            : "Net assessment",
      }));
    }
    return (
      mission.source_statement_urls?.length
        ? mission.source_statement_urls
        : [mission.source_url]
    ).map((url) => ({
      symbol: mission.source_symbol,
      url,
      label: mission.code,
      rowLabel: "",
      columnHeader: "",
    }));
  });
}
