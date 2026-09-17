"use client";
import { useEffect, useState } from "react";
import { loadStaticData } from "@/lib/data";
import type { FunctionExpenses } from "@/lib/functions";

let request: Promise<FunctionExpenses> | undefined;
export function useFunctionExpenses() {
  const [data, setData] = useState<FunctionExpenses | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    request ??= loadStaticData<FunctionExpenses>(
      "function-expenses.json",
    ).catch((error: unknown) => {
      request = undefined;
      throw error;
    });
    request
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return { data, error };
}
