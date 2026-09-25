import { formatBudget as sharedFormatBudget } from "@un-eosg/ui/format-budget";
interface UninfoFundingBarProps {
  required: number;
  available: number;
  spent: number;
  showLabels?: boolean;
  color?: string;
  compact?: boolean; // Use fixed width (for tooltips)
}

const formatAmount = sharedFormatBudget;

// Convert hex to rgba for opacity
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// UN Blue from globals.css
const UN_BLUE = "#009edb";

export function UninfoFundingBar({
  required,
  available,
  spent,
  showLabels = true,
  color,
  compact = false,
}: UninfoFundingBarProps) {
  const max = Math.max(1, required, available, spent);
  const requiredPct = Math.max(0, (required / max) * 100);
  const availablePct = Math.max(0, (available / max) * 100);
  const spentPct = Math.max(0, (spent / max) * 100);

  const baseColor = color || UN_BLUE;
  const spentColor = baseColor;
  const availColor = hexToRgba(baseColor, 0.35);

  const bars = [
    {
      label: "Required",
      pct: requiredPct,
      value: required,
      bgColor: "#e5e7eb",
    },
    {
      label: "Available",
      pct: availablePct,
      value: available,
      bgColor: availColor,
    },
    { label: "Spent", pct: spentPct, value: spent, bgColor: spentColor },
  ];

  if (!showLabels) {
    return (
      <div
        className="relative h-2 overflow-hidden rounded-sm bg-gray-100"
        role="img"
        aria-label={`Required ${formatAmount(required)}, available ${formatAmount(available)}, spent ${formatAmount(spent)}`}
      >
        {/* Share one origin and scale. Largest first keeps smaller reported
            amounts visible even when the source violates the usual ordering. */}
        {[...bars]
          .sort((a, b) => b.pct - a.pct)
          .map((b) => (
            <div
              key={b.label}
              data-resource={b.label}
              data-value={b.value}
              className="absolute inset-y-0 start-0 rounded-sm"
              style={{ width: `${b.pct}%`, backgroundColor: b.bgColor }}
            />
          ))}
      </div>
    );
  }

  // Compact mode for tooltips - fixed widths
  if (compact) {
    return (
      <div className="w-56">
        {bars.map((b) => (
          <div
            key={b.label}
            className="mb-1.5 flex items-center gap-2 last:mb-0"
          >
            <span className="w-16 flex-shrink-0 text-xs text-gray-600">
              {b.label}
            </span>
            <div className="h-2 w-20 overflow-hidden rounded-sm bg-gray-100">
              <div
                className="h-full"
                style={{ width: `${b.pct}%`, backgroundColor: b.bgColor }}
              />
            </div>
            <span className="w-16 flex-shrink-0 text-right text-xs text-gray-500">
              {formatAmount(b.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Full width mode for main display - aligned with entity bars (w-20 label, gap-2, w-20 amount)
  return (
    <div className="space-y-2">
      {(available > required ||
        spent > available ||
        Math.min(required, available, spent) < 0) && (
        <p className="text-xs text-gray-500">
          Reported amounts include adjustments or exceed required or available
          resources. Values are shown as reported; negative amounts have no
          positive bar area.
        </p>
      )}
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="w-20 flex-shrink-0 text-xs text-gray-600">
            {b.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-sm bg-gray-100">
            <div
              className="h-full"
              style={{ width: `${b.pct}%`, backgroundColor: b.bgColor }}
            />
          </div>
          <span className="w-20 flex-shrink-0 text-right text-xs text-gray-500">
            {formatAmount(b.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
