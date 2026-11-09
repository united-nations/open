import { outstandingFootnotes } from "@/lib/cebAssessmentOutstanding";
import type { CebAssessmentOutstandingData } from "@/types";

export function CebAssessmentOutstandingNotes({
  data,
}: {
  data: CebAssessmentOutstandingData;
}) {
  const notes = outstandingFootnotes(data);
  if (!notes.length) return null;
  return (
    <details key={data.year} className="text-xs leading-relaxed text-gray-600">
      <summary className="w-fit cursor-pointer">
        CEB notes ({data.year})
      </summary>
      <ol className="mt-2 space-y-2">
        {notes.map(({ marker, text, pdfPage }) => (
          <li key={`${pdfPage}:${marker}`} className="flex gap-2">
            <span className="shrink-0">({marker})</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      <a
        href={`${data.source.url}#page=${notes[0].pdfPage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block underline"
      >
        {data.source.symbol}, Table {data.source.table}
      </a>
    </details>
  );
}
