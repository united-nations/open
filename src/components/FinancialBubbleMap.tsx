"use client";

import { DotDensityMap } from "@undp/data-viz/DotDensityMap";
import type { PointerEventHandler, ReactNode } from "react";
import { useMapBubbleZoom } from "@/hooks/useMapBubbleZoom";
import { cn } from "@/lib/utils";

interface BubblePoint {
  lat: number;
  long: number;
  radius: number;
  color: string;
}

interface FinancialBubbleMapProps<TPoint extends BubblePoint> {
  data: TPoint[];
  colors: string[];
  colorDomain: string[];
  radius: number;
  height?: number;
  ariaLabel: string;
  className?: string;
  testId?: string;
  highlightedDataPoints?: string[];
  tooltip?: (point: TPoint) => ReactNode;
  onSeriesMouseClick?: (point: TPoint | undefined) => void;
  onSeriesMouseOver?: (point: TPoint | undefined) => void;
  onPointerMoveCapture?: PointerEventHandler<HTMLDivElement>;
}

/** Shared geographic presentation; callers own amounts, size references and selection. */
export function FinancialBubbleMap<TPoint extends BubblePoint>({
  height = 650,
  className,
  testId,
  onPointerMoveCapture,
  ...props
}: FinancialBubbleMapProps<TPoint>) {
  const container = useMapBubbleZoom();
  return (
    <div
      ref={container}
      data-testid={testId}
      className={cn("financial-bubble-map relative w-full bg-white", className)}
      onPointerMoveCapture={onPointerMoveCapture}
    >
      <DotDensityMap
        {...props}
        height={height}
        maxRadiusValue={1}
        mapProjection="equalEarth"
        scale={1.15}
        centerPoint={[0, 6]}
        zoomInteraction="button"
        mapBorderWidth={0.5}
        mapBorderColor="#d1d5db"
        mapNoDataColor="#f3f4f6"
        padding="0px"
        showAntarctica={false}
        isWorldMap
        showColorScale={false}
        showLabels={false}
        footNote=""
        resetSelectionOnDoubleClick={false}
        styles={{
          tooltip: {
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            padding: "8px 12px",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
            maxWidth: "320px",
          },
        }}
      />
    </div>
  );
}
