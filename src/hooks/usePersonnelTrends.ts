"use client";

import { useState } from "react";
import { useYearResource } from "@/hooks/useYearResource";
import { loadStaticData } from "@/lib/data";
import type { PersonnelTrendsData } from "@/lib/personnel";

const loadTrends = () =>
  loadStaticData<PersonnelTrendsData>("personnel-trends.json");

export function usePersonnelTrends() {
  const [attempt, setAttempt] = useState(0);
  const { value, loading, error } = useYearResource<PersonnelTrendsData | null>(
    `personnel-trends-${attempt}`,
    null,
    false,
    loadTrends,
    null,
  );
  return {
    data: value,
    organizations: [
      ...new Set(
        value?.years.flatMap((row) => Object.keys(row.organizations)) ?? [],
      ),
    ],
    loading,
    error,
    retry: () => setAttempt((current) => current + 1),
  };
}

export type PersonnelTrendsResource = ReturnType<typeof usePersonnelTrends>;
