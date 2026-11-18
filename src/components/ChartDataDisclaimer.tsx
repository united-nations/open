import { cn } from "@/lib/utils";

export function DataExtractionNotice({
  text = "This page includes figures automatically extracted from the cited source documents. The portal’s figures are not authoritative. Consult the original documents for official figures.",
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
