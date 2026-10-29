"use client";
import { ChartFooter as SharedChartFooter } from "@un-eosg/ui/components/chart-footer";
import { InteractionHint } from "@un-eosg/ui/components/interaction-hint";
import { NegativeAmounts, type SignedAmount } from "./NegativeAmounts";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useChartSource } from "@/components/ChartSource";

const serverTarget = () => null;

export function ChartFooter({
  hint,
  details,
  sourceSuffix,
  signedAmounts,
}: {
  hint: string;
  details?: ReactNode;
  sourceSuffix?: string;
  signedAmounts?: SignedAmount[];
}) {
  const source = useChartSource();
  const targetId =
    source?.placement === "page" ? source.pageDetailsTargetId : undefined;
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!targetId) return () => {};
      const observer = new MutationObserver(notify);
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    },
    [targetId],
  );
  const snapshot = useCallback(
    () => (targetId ? document.getElementById(targetId) : null),
    [targetId],
  );
  const pageDetailsTarget = useSyncExternalStore(
    subscribe,
    snapshot,
    serverTarget,
  );
  if (source?.placement === "page") {
    return (
      <>
        <div className="space-y-2 text-sm text-gray-600" data-chart-hint>
          <InteractionHint text={hint} />
          {signedAmounts && <NegativeAmounts entries={signedAmounts} />}
        </div>
        {pageDetailsTarget &&
          details &&
          createPortal(
            <section className="mt-5 space-y-3" data-chart-source-notes>
              {sourceSuffix && (
                <h4 className="font-medium text-gray-900">{sourceSuffix}</h4>
              )}
              {details}
            </section>,
            pageDetailsTarget,
          )}
      </>
    );
  }
  return (
    <SharedChartFooter
      hint={hint}
      sourceLabel={
        source
          ? `Source: ${source.label}${sourceSuffix ? " · " + sourceSuffix : ""}`
          : "Source: to be confirmed"
      }
      sourceDetails={
        <div className="space-y-4">
          {signedAmounts && <NegativeAmounts entries={signedAmounts} />}
          {details}
          {source?.details ?? (
            <p>Source information and methodology will appear here.</p>
          )}
        </div>
      }
    />
  );
}
