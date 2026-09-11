"use client";

import { useEffect, useState } from "react";

/** Keep quick updates smooth, but obscure stale figures after two seconds. */
export function DelayedChartLoading({
  pending,
  requestKey,
}: {
  pending: boolean;
  requestKey: string | number;
}) {
  const [expiredRequest, setExpiredRequest] = useState<string | number | null>(
    null,
  );
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setExpiredRequest(requestKey), 2000);
    return () => {
      window.clearTimeout(timer);
      setExpiredRequest(null);
    };
  }, [pending, requestKey]);
  if (!pending || expiredRequest !== requestKey) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center bg-white px-4 pt-16 text-sm text-gray-700"
    >
      The selected data is not available yet. Previous figures are temporarily
      hidden.
    </div>
  );
}
