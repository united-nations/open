import { formatBudget } from "@/lib/entities";

export interface SignedAmount {
  label: string;
  amount: number;
  group?: string;
}

/** Entries must describe one non-overlapping level, never parents and children together. */
export function NegativeAmounts({ entries }: { entries: SignedAmount[] }) {
  const negative = entries.filter((item) => item.amount < 0);
  if (!negative.length) return null;
  const groups = new Map<string, SignedAmount[]>();
  for (const item of negative) {
    const key = item.group || "Other";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return (
    <div className="space-y-2 text-sm">
      <p>
        Negative amounts included in the total:{" "}
        {formatBudget(negative.reduce((sum, item) => sum + item.amount, 0))}.
        Treemap areas show positive amounts only.
      </p>
      <details>
        <summary className="cursor-pointer">Show negative amounts</summary>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          {[...groups].map(([group, items]) => (
            <li key={group}>
              {group}
              <ul className="list-disc pl-5">
                {items.map((item, index) => (
                  <li key={`${item.label}-${index}`}>
                    {item.label}: {formatBudget(item.amount)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
