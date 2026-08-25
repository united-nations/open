"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatBudget } from "@/lib/entities";
import type { SecretariatGroup, SecretariatGroupDefinition } from "@/types";

export const SECRETARIAT_GROUP_GRAYS = [
  "#4b5563",
  "#737b86",
  "#9ca3af",
  "#d1d5db",
];

export interface SecretariatStackedBarSegment {
  key: string;
  label: string;
  shortLabel?: string;
  amount: number;
  color: string;
  textColor?: string;
}

export function SecretariatStackedBar({
  label,
  info,
  segments,
  selected = null,
  onSelect,
}: {
  label: string;
  info?: string;
  segments: SecretariatStackedBarSegment[];
  selected?: string | null;
  onSelect?: (key: string | null) => void;
}) {
  const positiveTotal = segments.reduce(
    (sum, segment) => sum + Math.max(0, segment.amount),
    0,
  );

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
            {label}
          </h3>
          {info && (
            <Tooltip delayDuration={75}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${label.toLowerCase()}`}
                  className="rounded-full text-gray-400 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none"
                >
                  <Info className="size-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={8}
                collisionPadding={12}
                className="max-w-sm border border-slate-200 bg-white text-left leading-relaxed text-slate-600 shadow-lg"
              >
                {info}
              </TooltipContent>
            </Tooltip>
          )}
          {onSelect && (
            <span className="text-[10px] text-gray-400">
              · click a segment to filter
            </span>
          )}
        </div>
        {onSelect && selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-un-blue hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div
        className="flex h-9 w-full overflow-hidden rounded-sm bg-gray-100"
        role={onSelect ? "group" : "img"}
        aria-label={`${label}: proportional amounts by segment`}
      >
        {segments
          .filter((segment) => segment.amount > 0)
          .map((segment) => {
            const share =
              positiveTotal > 0 ? (segment.amount / positiveTotal) * 100 : 0;
            const active = !selected || selected === segment.key;
            const description = `${segment.label}: ${formatBudget(segment.amount)} (${share.toFixed(1)}%)`;
            const visibleLabel =
              share >= 12
                ? segment.label
                : share >= 3
                  ? segment.shortLabel
                  : undefined;
            const content = visibleLabel && (
              <span
                className="block w-full truncate px-2 text-[11px] leading-none font-semibold drop-shadow-sm"
                style={{ color: segment.textColor ?? "#ffffff" }}
              >
                {visibleLabel}
              </span>
            );
            const className =
              "relative flex min-w-[2px] items-center overflow-hidden border-r border-white/70 text-left transition-opacity last:border-r-0 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset";
            const style = {
              width: `${share}%`,
              backgroundColor: segment.color,
              opacity: active ? 1 : 0.22,
            };

            return (
              <Tooltip key={segment.key} delayDuration={75}>
                <TooltipTrigger asChild>
                  {onSelect ? (
                    <button
                      type="button"
                      aria-label={description}
                      aria-pressed={selected === segment.key}
                      onClick={() =>
                        onSelect(selected === segment.key ? null : segment.key)
                      }
                      className={className}
                      style={style}
                    >
                      {content}
                    </button>
                  ) : (
                    <div
                      aria-label={description}
                      className={className}
                      style={style}
                    >
                      {content}
                    </div>
                  )}
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  collisionPadding={12}
                  hideWhenDetached
                  className="border border-slate-200 bg-white text-slate-800 shadow-lg"
                >
                  <p className="font-medium">{segment.label}</p>
                  <p className="mt-0.5 text-slate-500">
                    {formatBudget(segment.amount)} · {share.toFixed(1)}%
                  </p>
                  {onSelect && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Click to {selected === segment.key ? "clear" : "filter"}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
      </div>
    </div>
  );
}

export function SecretariatGroupBar({
  groups,
  amounts,
  selected = null,
  onSelect,
}: {
  groups: Record<SecretariatGroup, SecretariatGroupDefinition>;
  amounts: Record<SecretariatGroup, number>;
  selected?: SecretariatGroup | null;
  onSelect?: (key: SecretariatGroup | null) => void;
}) {
  const segments = (
    Object.entries(groups) as Array<
      [SecretariatGroup, SecretariatGroupDefinition]
    >
  )
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, definition], index) => ({
      key,
      label: definition.label,
      shortLabel: key === "spm" ? "SPM" : undefined,
      amount: amounts[key],
      color: SECRETARIAT_GROUP_GRAYS[index % SECRETARIAT_GROUP_GRAYS.length],
      textColor: index < 2 ? "#ffffff" : "#1f2937",
    }));

  return (
    <SecretariatStackedBar
      label="By group"
      segments={segments}
      selected={selected}
      onSelect={
        onSelect ? (key) => onSelect(key as SecretariatGroup | null) : undefined
      }
    />
  );
}
