"use client";

import { useEffect, useId, useRef } from "react";
import { formatPeople } from "@/lib/personnel";

/** Only the rightmost reference is calibrated; each view to its left magnifies a selected subset. */
export function PersonnelScaleLegend({
  total,
  plotWidth,
  plotHeight,
}: {
  total: number;
  plotWidth: number;
  plotHeight: number;
}) {
  const id = useId().replace(/:/g, "");
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const update = () => {
      element.scrollLeft = element.scrollWidth - element.clientWidth;
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [plotWidth, plotHeight, total]);
  if (total <= 0 || plotWidth <= 0 || plotHeight <= 0) return null;
  const availableWidth = Math.min(plotWidth, 720);
  const areaPerPerson = (plotWidth * plotHeight) / total;
  const levels = [
    { count: 1, columns: 1, rows: 1, unit: 1 },
    { count: 10, columns: 5, rows: 2, unit: 1 },
    { count: 100, columns: 10, rows: 10, unit: 1 },
    { count: 1000, columns: 5, rows: 2, unit: 100 },
    { count: 10000, columns: 10, rows: 10, unit: 100 },
  ];
  const calibrated = levels.map((level) => ({
    ...level,
    width: level.columns * Math.sqrt(level.unit * areaPerPerson),
    height: level.rows * Math.sqrt(level.unit * areaPerPerson),
  }));
  const rightIndex = calibrated.findLastIndex(
    (block) =>
      block.count <= total &&
      block.width <= Math.min(280, plotWidth * 0.46) &&
      block.height <= 260,
  );
  if (rightIndex < 0)
    return (
      <p className="mt-3 text-xs text-gray-600">
        The chart represents {formatPeople(total)} staff.
      </p>
    );
  const frames = calibrated.slice(0, rightIndex + 1);
  // A square grid selects five by two cells; a five-by-two grid selects one cell.
  const selection = (frame: {
    count: number;
    width: number;
    height: number;
  }) => {
    const square = frame.count === 100 || frame.count === 10000;
    return {
      x: 0,
      y: frame.height * (square ? 0.8 : 0.5),
      width: frame.width * (square ? 0.5 : 0.2),
      height: frame.height * (square ? 0.2 : 0.5),
    };
  };
  for (let index = rightIndex - 1; index >= 0; index--) {
    const subset = selection(frames[index + 1]);
    const rectangular =
      frames[index].count === 10 || frames[index].count === 1000;
    const minimum =
      frames[index].count === 1
        ? 24
        : frames[index].count === 10
          ? 46
          : frames[index].count === 100
            ? 64
            : 112;
    const width = Math.max(minimum, subset.width * (rectangular ? 1.4 : 2.2));
    frames[index] = {
      ...frames[index],
      width,
      height: rectangular ? width * 0.4 : width,
    };
  }
  const width = Math.max(
    availableWidth,
    frames.reduce((sum, block) => sum + Math.max(40, block.width), 0) +
      (frames.length - 1) * 28 +
      12,
  );
  const maximumHeight = Math.max(...frames.map((frame) => frame.height));
  const height = maximumHeight + 78;
  const centerY = 22 + maximumHeight / 2;
  const gap =
    frames.length > 1
      ? (width -
          12 -
          frames.reduce((sum, frame) => sum + Math.max(40, frame.width), 0)) /
        (frames.length - 1)
      : 0;
  let cursor = 6;
  const placed = frames.map((frame) => {
    const cell = Math.max(40, frame.width);
    const position = {
      ...frame,
      x: cursor + (cell - frame.width) / 2,
      y: centerY - frame.height / 2,
      centerX: cursor + cell / 2,
    };
    cursor += cell + gap;
    return position;
  });
  const rightmost = placed.at(-1)!;
  return (
    <div
      className="mt-4 border-t border-gray-200 pt-3"
      aria-label="Organization chart people scale"
    >
      <p className="mb-2 text-xs text-gray-600">
        The rightmost {formatPeople(rightmost.count)}-person block uses the same
        area per person as the tiles. Follow the marked areas from right to left
        to zoom in; the views on the left are enlarged.
      </p>
      {width > availableWidth + 1 && (
        <p className="mb-2 text-xs text-gray-500">
          Scroll left to follow the enlarged views.
        </p>
      )}
      <div
        ref={scroller}
        className="max-w-full overflow-x-auto pb-1"
        tabIndex={width > availableWidth + 1 ? 0 : undefined}
        role="group"
        aria-label="People scale zoom sequence"
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block max-w-none text-un-blue"
          role="img"
          aria-label={`People scale from right to left: ${[...placed]
            .reverse()
            .map((block) => formatPeople(block.count))
            .join(
              ", ",
            )} staff; only the rightmost block matches the chart scale`}
        >
          <defs>
            <symbol id={`${id}-person`} viewBox="0 0 12 15">
              <circle cx="6" cy="2" r="1.6" fill="currentColor" />
              <path
                d="M6 5v5m-4-3 4-2 4 2m-4 3-3 4m3-4 3 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </symbol>
            <pattern
              id={`${id}-people`}
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <use href={`#${id}-person`} x="1" width="8" height="10" />
            </pattern>
            <pattern
              id={`${id}-hundreds`}
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <rect width="100" height="100" fill={`url(#${id}-people)`} />
            </pattern>
            <marker
              id={`${id}-arrow`}
              markerWidth="5"
              markerHeight="5"
              refX="4"
              refY="2.5"
              orient="auto"
            >
              <path
                d="M0 0 L5 2.5 L0 5"
                fill="none"
                stroke="#64748b"
                strokeWidth="0.8"
              />
            </marker>
          </defs>
          {placed.slice(1).map((frame, index) => {
            const target = placed[index];
            const crop = selection(frame);
            return (
              <g
                key={`zoom-${frame.count}`}
                aria-hidden="true"
                data-zoom-from={frame.count}
                data-zoom-to={target.count}
              >
                <path
                  d={`M${frame.x + crop.x - 2} ${frame.y + crop.y} L${target.x + target.width + 3} ${target.y} M${frame.x + crop.x - 2} ${frame.y + crop.y + crop.height} L${target.x + target.width + 3} ${target.y + target.height}`}
                  stroke="#94a3b8"
                  strokeWidth="0.8"
                  fill="none"
                  markerEnd={`url(#${id}-arrow)`}
                />
              </g>
            );
          })}
          {placed.map((frame, index) => {
            const crop = index > 0 ? selection(frame) : null;
            const units = frame.unit === 100 ? 100 : 10;
            return (
              <g
                key={frame.count}
                data-scale-count={frame.count}
                data-scale-calibrated={index === rightIndex}
                data-scale-width={frame.width}
                data-scale-height={frame.height}
                data-scale-side={
                  frame.width === frame.height ? frame.width : undefined
                }
              >
                <svg
                  x={frame.x}
                  y={frame.y}
                  width={frame.width}
                  height={frame.height}
                  viewBox={`0 0 ${frame.columns * units} ${frame.rows * units}`}
                >
                  <rect width="100%" height="100%" fill="#e0f2f8" />
                  <rect
                    width="100%"
                    height="100%"
                    fill={`url(#${id}-${frame.unit === 100 ? "hundreds" : "people"})`}
                  />
                  <rect
                    width="100%"
                    height="100%"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.6"
                  />
                </svg>
                {crop && (
                  <rect
                    x={frame.x + crop.x}
                    y={frame.y + crop.y}
                    width={crop.width}
                    height={crop.height}
                    fill="#009edb"
                    fillOpacity="0.12"
                    stroke="#334155"
                    strokeWidth="1"
                    data-selected-staff={frame.count / 10}
                  />
                )}
                <text
                  x={frame.centerX}
                  y={height - 25}
                  textAnchor="middle"
                  fill="#374151"
                  fontSize="11"
                >
                  {formatPeople(frame.count)}{" "}
                  {frame.count === 1 ? "person" : "staff"}
                </text>
                <text
                  x={frame.centerX}
                  y={height - 9}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize="10"
                >
                  {index === rightIndex ? "chart scale" : "enlarged"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
