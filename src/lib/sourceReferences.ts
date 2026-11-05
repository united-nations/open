import type { BudgetNodeSource } from "@/types";

/** English ODS copies verified against the cited PDFs.
 * Keep unverified variants (including chapter-only supplements) on their source
 * host: changing editions can silently invalidate physical page numbers.
 */
const ODS_PDF_URLS: Record<string, string> = {
  // Both 2023 copies have 466 physical pages. Only p. 90 differs, and its
  // cited SBA expense row agrees. The difference is in the other-revenue row.
  "https://digitallibrary.un.org/record/4060617/files/%28DMSPC_OPPFB%29_FINANCIAL_STATEMENTS_FOR_THE_YEAR_ENDED_31_DECEMBER_2023-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n24/259/18/pdf/n2425918.pdf",
  "https://digitallibrary.un.org/record/1644706/files/%28DM_OPPBA%29FINANCIALSTATEMENTSFORTHEYEARENDED31DECEMBER2017-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n18/278/50/pdf/n1827850.pdf",
  "https://digitallibrary.un.org/record/3930166/files/%28DMSPC_OPPFB%29_FINANCIAL_STATEMENTS_FOR_THE_YEAR_ENDED_31_DECEMBER_2018-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n19/255/35/pdf/n1925535.pdf",
  "https://digitallibrary.un.org/record/3875594/files/%28DMSPC_OPPFB%29_FINANCIAL_STATEMENTS_FOR_THE_YEAR_ENDED_31_DECEMBER_2019-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n20/209/65/pdf/n2020965.pdf",
  "https://digitallibrary.un.org/record/3984139/files/%28DMSPC_OPPFB%29_FINANCIAL_STATEMENTS_FOR_THE_YEAR_ENDED_31_DECEMBER_2021-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n22/461/16/pdf/n2246116.pdf",
  "https://digitallibrary.un.org/record/4017052/files/%28DMSPC_OPPFB%29_FINANCIAL_STATEMENTS_FOR_THE_YEAR_ENDED_31_DECEMBER_2022-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n23/227/63/pdf/n2322763.pdf",
  "https://digitallibrary.un.org/record/4087012/files/%28DMSPC_OPPFB%29_FINANCIAL_STATEMENTS_FOR_THE_YEAR_ENDED_31_DECEMBER_2024-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n25/222/89/pdf/n2522289.pdf",
  "https://digitallibrary.un.org/record/4061466/files/A_79_5_Add.7-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n24/194/53/pdf/n2419453.pdf",
  "https://digitallibrary.un.org/record/4090384/files/A_80_5_Add.7-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n25/180/34/pdf/n2518034.pdf",
  "https://digitallibrary.un.org/record/4061097/files/A_79_5_Add.9-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n24/186/14/pdf/n2418614.pdf",
  "https://digitallibrary.un.org/record/4090387/files/A_80_5_Add.9-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n25/180/52/pdf/n2518052.pdf",
  "https://digitallibrary.un.org/record/4059190/files/A_79_5_Add.10-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n24/139/20/pdf/n2413920.pdf",
  "https://digitallibrary.un.org/record/4090388/files/A_80_5_Add.10-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n25/178/02/pdf/n2517802.pdf",
  "https://digitallibrary.un.org/record/4060838/files/A_79_5_%28Vol._III%29-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n24/184/51/pdf/n2418451.pdf",
  "https://digitallibrary.un.org/record/4090394/files/A_80_5_%28Vol._III%29-EN.pdf":
    "https://documents.un.org/doc/undoc/gen/n25/181/38/pdf/n2518138.pdf",
};

export function sourceDocumentUrl(url: string): string {
  const [base, ...fragment] = url.split("#");
  const preferred = ODS_PDF_URLS[base] ?? base;
  return fragment.length ? `${preferred}#${fragment.join("#")}` : preferred;
}

export function sourceDownloads(url: string): boolean {
  return (
    sourceDocumentUrl(url).startsWith(
      "https://digitallibrary.un.org/record/",
    ) && sourceDocumentUrl(url).includes("/files/")
  );
}

/** Use physical PDF pages only; never infer a page from a table or row number. */
export function sourcePages(source: BudgetNodeSource): number[] {
  const pages = source.pdfPages ?? (source.pdfPage ? [source.pdfPage] : []);
  return [
    ...new Set(pages.filter((page) => Number.isInteger(page) && page > 0)),
  ].sort((a, b) => a - b);
}

export function sourcePageUrl(url: string, page: number): string {
  const [base, fragment = ""] = sourceDocumentUrl(url).split("#", 2);
  const params = new URLSearchParams(fragment);
  params.set("page", String(page));
  return `${base}#${params.toString()}`;
}

export function uniqueSourceReferences(
  references: readonly BudgetNodeSource[],
): BudgetNodeSource[] {
  const seen = new Set<string>();
  return references.filter((source) => {
    const key = JSON.stringify([
      sourceDocumentUrl(source.url).split("#")[0],
      sourcePages(source),
      source.symbol,
      source.label,
      source.budgetItem,
      source.tableTitle,
      source.rowLabel,
      source.columnHeader,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
