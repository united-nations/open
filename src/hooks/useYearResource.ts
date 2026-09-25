"use client";

import { useEffect, useState } from "react";

/** Match results to the request that produced them; ignore superseded responses. */
export function useYearResource<T>(
  key: string,
  initial: T,
  useInitial: boolean,
  load: () => Promise<T>,
  fallback: T,
) {
  const [result, setResult] = useState<{
    key: string;
    value: T;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (useInitial) return;
    let active = true;
    load().then(
      (value) => {
        if (active) setResult({ key, value, error: false });
      },
      () => {
        if (active) setResult({ key, value: fallback, error: true });
      },
    );
    return () => {
      active = false;
    };
  }, [key, useInitial, load, fallback]);
  return {
    value: useInitial ? initial : result?.key === key ? result.value : fallback,
    error: !useInitial && result?.key === key && result.error,
    loading: !useInitial && result?.key !== key,
  };
}
