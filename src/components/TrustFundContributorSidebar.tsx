"use client";

import { ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShareButton } from "@/components/ShareButton";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { navigateToSidebar } from "@/hooks/useDeepLink";
import type { TrustFundContributor, TrustFundContributorsData } from "@/types";

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function TrustFundContributorSidebar({
  contributor,
  meta,
  onClose,
}: {
  contributor: TrustFundContributor;
  meta: TrustFundContributorsData["meta"];
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const focusTrapRef = useFocusTrap(true);
  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", escape);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.documentElement.style.overflow = "";
    };
  }, [close]);

  const groups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        entity_id: string | null;
        entity_name: string;
        amount: number;
        funds: TrustFundContributor["destinations"];
      }
    >();
    for (const destination of contributor.destinations) {
      const key = destination.entity_id ?? "unresolved";
      const current = grouped.get(key) ?? {
        entity_id: destination.entity_id,
        entity_name: destination.entity_name ?? "Entity unresolved",
        amount: 0,
        funds: [],
      };
      current.amount += destination.amount_usd;
      current.funds.push(destination);
      grouped.set(key, current);
    }
    return [...grouped.values()].sort((a, b) => b.amount - a.amount);
  }, [contributor]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/50 transition-opacity duration-300 ${visible && !closing ? "opacity-100" : "opacity-0"}`}
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      <aside
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-fund-contributor-title"
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 sm:w-2/3 md:w-1/2 lg:w-1/3 lg:min-w-[500px] ${visible && !closing ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-300 bg-white px-6 py-5 sm:px-8">
          <div>
            <h2
              id="trust-fund-contributor-title"
              className="text-xl leading-tight font-bold text-gray-900 sm:text-2xl"
            >
              {contributor.name}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Recognized voluntary contributions · {meta.year}
            </p>
          </div>
          <div className="flex gap-2">
            <ShareButton
              hash={`trust-fund-contributor=${encodeURIComponent(contributor.name)}`}
            />
            <button
              type="button"
              onClick={close}
              aria-label="Close sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </header>

        <div className="space-y-6 px-6 py-5 sm:px-8">
          <div>
            <p className="text-sm tracking-wide text-gray-600 uppercase">
              Net recognized amount
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {currency(contributor.amount_usd)}
            </p>
            {contributor.negative_amount_usd < 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Gross positive rows {currency(contributor.positive_amount_usd)};
                refunds/transfers {currency(contributor.negative_amount_usd)}.
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-lg tracking-wider text-gray-900 uppercase">
              Destination funds and entities
            </h3>
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.entity_id ?? "unresolved"}>
                  <div className="flex items-baseline justify-between gap-3">
                    {group.entity_id ? (
                      <button
                        type="button"
                        className="text-left text-sm font-semibold text-un-blue hover:underline"
                        onClick={() =>
                          navigateToSidebar(
                            "trust-fund-entity",
                            group.entity_id!,
                          )
                        }
                      >
                        {group.entity_name}
                      </button>
                    ) : (
                      <span className="text-sm font-semibold text-amber-800">
                        {group.entity_name}
                      </span>
                    )}
                    <span className="shrink-0 text-sm text-gray-900">
                      {currency(group.amount)}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 border-l border-gray-200 pl-3">
                    {group.funds
                      .sort((a, b) => b.amount_usd - a.amount_usd)
                      .map((fund) => (
                        <li
                          key={fund.fund_code}
                          className="flex items-baseline justify-between gap-3 text-xs"
                        >
                          <span className="text-gray-600">
                            <span className="mr-1 font-medium text-gray-800">
                              {fund.fund_code}
                            </span>
                            {fund.fund_name}
                          </span>
                          <span className="shrink-0 text-gray-800">
                            {currency(fund.amount_usd)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg tracking-wider text-gray-900 uppercase">
              Method and source
            </h3>
            <p className="text-sm leading-relaxed text-gray-700">
              {meta.method_note} {meta.mapping_note}
            </p>
            <a
              href={meta.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-un-blue hover:underline"
            >
              {meta.source.symbol}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
