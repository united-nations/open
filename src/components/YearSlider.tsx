"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface YearSliderProps {
  years: number[];
  selectedYear: number;
  onChange: (year: number) => void;
  disabled?: boolean;
  /** Caption for a year. Peacekeeping runs July-June, so 2024 reads "2024/25". */
  formatLabel?: (year: number) => string;
}

export function YearSlider({
  years,
  selectedYear,
  onChange,
  disabled = false,
  formatLabel,
}: YearSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  // Track the visual position during drag (only commits on release)
  const [dragYear, setDragYear] = useState<number | null>(null);

  const sortedYears = [...years].sort((a, b) => a - b);
  const minYear = sortedYears[0];
  const maxYear = sortedYears[sortedYears.length - 1];

  // The displayed year: during drag show dragYear, otherwise selectedYear
  const displayYear = dragYear ?? selectedYear;

  const getPositionFromYear = (year: number): number => {
    if (sortedYears.length <= 1) return 50;
    const index = sortedYears.indexOf(year);
    if (index === -1) return 50;
    return (index / (sortedYears.length - 1)) * 100;
  };

  const getYearFromPosition = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || sortedYears.length <= 1) return selectedYear;

      const rect = trackRef.current.getBoundingClientRect();
      const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const index = Math.round(position * (sortedYears.length - 1));
      return sortedYears[index];
    },
    [sortedYears, selectedYear]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsPlaying(false);
      setIsDragging(true);
      const year = getYearFromPosition(e.clientX);
      setDragYear(year);
    },
    [disabled, getYearFromPosition]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || disabled) return;
      const year = getYearFromPosition(e.clientX);
      setDragYear(year);
    },
    [isDragging, disabled, getYearFromPosition]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragYear !== null && dragYear !== selectedYear) {
      onChange(dragYear);
    }
    setIsDragging(false);
    setDragYear(null);
  }, [isDragging, dragYear, selectedYear, onChange]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault(); // Prevent page scroll from interfering
      setIsPlaying(false);
      setIsDragging(true);
      const touch = e.touches[0];
      const year = getYearFromPosition(touch.clientX);
      setDragYear(year);
    },
    [disabled, getYearFromPosition]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || disabled) return;
      e.preventDefault(); // Prevent page scroll during drag
      const touch = e.touches[0];
      const year = getYearFromPosition(touch.clientX);
      setDragYear(year);
    },
    [isDragging, disabled, getYearFromPosition]
  );

  const handleTouchEnd = useCallback(() => {
    if (isDragging && dragYear !== null && dragYear !== selectedYear) {
      onChange(dragYear);
    }
    setIsDragging(false);
    setDragYear(null);
  }, [isDragging, dragYear, selectedYear, onChange]);

  useEffect(() => {
    if (isDragging) {
      // Use passive: false to allow preventDefault in touch handlers
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      return () => {
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  // Keyboard support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      const currentIndex = sortedYears.indexOf(selectedYear);
      let newIndex = currentIndex;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          setIsPlaying(false);
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          setIsPlaying(false);
          newIndex = Math.min(sortedYears.length - 1, currentIndex + 1);
          break;
        case "Home":
          e.preventDefault();
          setIsPlaying(false);
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          setIsPlaying(false);
          newIndex = sortedYears.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        onChange(sortedYears[newIndex]);
      }
    },
    [disabled, sortedYears, selectedYear, onChange]
  );

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying) return;
    const currentIndex = sortedYears.indexOf(selectedYear);
    if (currentIndex >= sortedYears.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      onChange(sortedYears[currentIndex + 1]);
    }, 2400);
    return () => clearTimeout(timer);
  }, [isPlaying, selectedYear, sortedYears, onChange]);

  const handlePlayClick = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      const currentIndex = sortedYears.indexOf(selectedYear);
      if (currentIndex >= sortedYears.length - 1) {
        onChange(sortedYears[0]);
      }
      setIsPlaying(true);
    }
  };

  const thumbPosition = getPositionFromYear(displayYear);

  if (sortedYears.length <= 1) {
    return null;
  }

  return (
    <div className="flex h-9 items-center gap-2">
      <button
        type="button"
        onClick={handlePlayClick}
        disabled={disabled}
        aria-label={isPlaying ? "Pause" : "Play"}
        className={`flex h-6 w-6 items-center justify-center text-gray-400 transition-colors hover:text-gray-900 focus:outline-none focus-visible:text-gray-900 ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={minYear}
        aria-valuemax={maxYear}
        aria-valuenow={displayYear}
        aria-label="Select year"
        aria-disabled={disabled}
        className={`relative flex h-9 w-24 cursor-pointer touch-none items-center sm:w-32 focus:outline-none focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-2 ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
      >
        {/* Visual track line */}
        <div className="h-0.5 w-full bg-gray-300" />
        {/* Thumb - larger touch target */}
        <div
          className={`absolute top-1/2 flex h-9 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center`}
          style={{ left: `${thumbPosition}%` }}
        >
          <div
            className={`h-4 w-0.5 ${isDragging ? "bg-un-blue" : "bg-gray-600"} ${disabled ? "" : "group-hover:bg-un-blue"}`}
          />
        </div>
      </div>
      <span className="min-w-[3ch] whitespace-nowrap text-sm font-medium text-gray-900">
        {formatLabel ? formatLabel(displayYear) : displayYear}
      </span>
    </div>
  );
}
