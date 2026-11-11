"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { YearSliderProps } from "@un-eosg/ui/components/year-slider";

export type { YearSliderProps } from "@un-eosg/ui/components/year-slider";

export function YearSlider({
  years,
  selectedYear,
  onChange,
  disabled = false,
  compact = false,
  formatLabel = String,
  label = "Select year",
}: YearSliderProps) {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  if (sorted.length < 2) return null;

  const displayYear = preview ?? selectedYear;
  const index = sorted.indexOf(displayYear);
  const yearAtPointer = (event: PointerEvent<HTMLDivElement>) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const offset = Math.min(1, Math.max(0, (event.clientX - left) / width));
    return sorted[Math.round(offset * (sorted.length - 1))];
  };

  const finish = (event: PointerEvent<HTMLDivElement>, commit: boolean) => {
    const start = gesture.current;
    if (start?.id !== event.pointerId) return;
    gesture.current = null;
    setPreview(null);
    const vertical = Math.abs(event.clientY - start.y);
    const horizontal = Math.abs(event.clientX - start.x);
    if (
      disabled ||
      !commit ||
      (event.pointerType === "touch" && vertical > 8 && vertical > horizontal)
    )
      return;
    const year = yearAtPointer(event);
    if (year !== selectedYear) onChange(year);
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const current = sorted.indexOf(selectedYear);
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.max(0, current - 1);
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(sorted.length - 1, current + 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = sorted.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (sorted[next] !== selectedYear) onChange(sorted[next]);
  };

  return (
    <div className="flex items-center gap-2">
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled}
        aria-valuemin={sorted[0]}
        aria-valuemax={sorted.at(-1)}
        aria-valuenow={displayYear}
        aria-valuetext={formatLabel(displayYear)}
        onKeyDown={handleKey}
        onPointerDown={(event) => {
          if (disabled || !event.isPrimary || event.button !== 0) return;
          gesture.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          if (event.pointerType !== "touch") setPreview(yearAtPointer(event));
        }}
        onPointerMove={(event) => {
          const start = gesture.current;
          if (start?.id !== event.pointerId) return;
          const dx = Math.abs(event.clientX - start.x);
          const dy = Math.abs(event.clientY - start.y);
          if (event.pointerType !== "touch" || (dx > 8 && dx > dy)) {
            setPreview(yearAtPointer(event));
          }
        }}
        onPointerUp={(event) => finish(event, true)}
        onPointerCancel={(event) => finish(event, false)}
        onLostPointerCapture={(event) => finish(event, false)}
        className={cn(
          "relative flex h-11 w-24 cursor-pointer [touch-action:pan-y_pinch-zoom] items-center focus-visible:outline-2 focus-visible:outline-un-blue sm:w-32",
          compact ? "sm:h-7" : "sm:h-9",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <div className="h-0.5 w-full bg-gray-300" />
        <div
          aria-hidden="true"
          className="absolute h-4 w-0.5 -translate-x-1/2 bg-gray-600"
          style={{
            left: `${index < 0 ? 50 : (index / (sorted.length - 1)) * 100}%`,
          }}
        />
      </div>
      <div className="relative">
        <select
          aria-label={`${label} from list`}
          value={displayYear}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          className={cn(
            "h-11 cursor-pointer appearance-none rounded-sm bg-transparent py-0 pr-6 pl-1 text-sm font-bold focus-visible:outline-2 focus-visible:outline-un-blue disabled:cursor-not-allowed disabled:opacity-50",
            compact ? "sm:h-7" : "sm:h-9",
          )}
        >
          {[...sorted].reverse().map((year) => (
            <option key={year} value={year}>
              {formatLabel(year)}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-1 size-4 -translate-y-1/2"
        />
      </div>
    </div>
  );
}
