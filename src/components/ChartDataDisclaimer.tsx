/** Matches the permanent provenance notice on Transcripts meeting pages. */
export function ChartDataDisclaimer() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16">
      <aside
        aria-label="Data disclaimer"
        className="rounded-lg border border-border bg-muted/30 px-4 py-3"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          The data for these visualizations and downloads has been automatically
          extracted from the source documents and is not authoritative. Official
          financial data is available in the relevant source documents on the
          Official Documents System of the United Nations.
        </p>
      </aside>
    </div>
  );
}
