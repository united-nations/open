import type { ReactNode } from "react";
import { Info } from "lucide-react";

export function MapBoundaryDisclaimer({ children }: { children?: ReactNode }) {
  return (
    <details
      className="max-w-2xl text-xs leading-relaxed text-gray-500"
      data-map-boundary-disclaimer
    >
      <summary className="flex min-h-11 w-11 cursor-pointer list-none items-center justify-center rounded-sm hover:text-un-blue-dark focus-visible:outline-2 focus-visible:outline-un-blue [&::-webkit-details-marker]:hidden">
        <Info className="size-4" aria-hidden="true" />
        <span className="sr-only">Map boundary disclaimer</span>
      </summary>
      <p>
        The boundaries and names shown and the designations used on this map do
        not imply official endorsement or acceptance by the United Nations.
        Dotted line represents approximately the Line of Control in Jammu and
        Kashmir agreed upon by India and Pakistan. The final status of Jammu and
        Kashmir has not yet been agreed upon by the parties. Final boundary
        between the Republic of Sudan and the Republic of South Sudan has not
        yet been determined. A dispute exists between the Governments of
        Argentina and the United Kingdom of Great Britain and Northern Ireland
        concerning sovereignty over the Falkland Islands (Malvinas).
      </p>
      {children}
    </details>
  );
}
