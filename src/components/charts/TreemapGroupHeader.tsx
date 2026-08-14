import { ReactNode } from "react";

// Inline legend strip drawn directly above a treemap band/group, so the colour
// key sits next to the tiles it explains instead of in a footer legend.
// Height is reserved in pixels by the caller (see TREEMAP_HEADER_PX).

export const TREEMAP_HEADER_PX = 22;

interface TreemapGroupHeaderProps {
  /** Tailwind background class of the group colour, e.g. "bg-un-blue". */
  colorClass: string;
  label: string;
  /** Optional formatted total shown after the label. */
  amount?: string;
  /** Optional extra legend rendered at the right edge (e.g. instrument keys). */
  right?: ReactNode;
  /** Extra opacity/utility classes for the swatch. */
  swatchClassName?: string;
}

export function TreemapGroupHeader({
  colorClass,
  label,
  amount,
  right,
  swatchClassName = "",
}: TreemapGroupHeaderProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 overflow-hidden pb-1 pl-0.5"
      style={{ height: TREEMAP_HEADER_PX }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-sm ${colorClass} ${swatchClassName}`}
        />
        <span className="truncate text-xs font-medium text-gray-700">
          {label}
        </span>
        {amount && (
          <span className="shrink-0 text-xs text-gray-400">{amount}</span>
        )}
      </div>
      {right}
    </div>
  );
}
