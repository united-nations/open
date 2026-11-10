import { cn } from "@/lib/utils";

export function DataExtractionNotice({
  text = "The data for these visualizations and downloads has been automatically extracted from the source documents and is not authoritative. Official financial data is available in the relevant source documents on the Official Documents System of the United Nations.",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mt-2 text-sm leading-relaxed text-muted-foreground",
        className,
      )}
      data-extraction-disclaimer
    >
      {text}
    </p>
  );
}

export function ChartDataDisclaimer() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 md:px-12 lg:px-16">
      <aside
        aria-label="Data disclaimer"
        className="rounded-lg border border-border bg-muted/30 px-4 py-3"
      >
        <DataExtractionNotice />
      </aside>
    </div>
  );
}
