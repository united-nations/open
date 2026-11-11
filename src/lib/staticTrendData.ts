import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  BudgetData,
  BudgetFundingSource,
  BudgetMetricKey,
  SecretariatOverviewData,
} from "@/types";
import manifest from "../../public/data/manifest.json";

async function readData<T>(dataset: string, year: number): Promise<T> {
  const file = path.join(
    process.cwd(),
    "public",
    "data",
    `${dataset}-${year}.json`,
  );
  return JSON.parse(await readFile(file, "utf8")) as T;
}

const BUDGET_YEARS = {
  proposed: manifest.budgetPpbProposed.years,
  approved: manifest.budgetPpbApproved.years,
  expenditure: manifest.budgetPpb.years,
};

export type ProgrammeBudgetTrendRow = {
  metric: BudgetMetricKey;
  year: number;
  items: Record<
    string,
    {
      label: string;
      code: string | null;
      amount: number | null;
    }
  >;
};

export async function programmeBudgetTrendRows(): Promise<
  ProgrammeBudgetTrendRow[]
> {
  const metrics: BudgetMetricKey[] = ["proposed", "approved", "expenditure"];
  return Promise.all(
    metrics.flatMap((metric) =>
      BUDGET_YEARS[metric].map(async (year) => {
        const { nodes } = await readData<BudgetData>(
          `budget-ppb-${metric}`,
          year,
        );
        const items = Object.fromEntries(
          nodes
            .filter((node) => node.id === "whole" || node.tier === "part")
            .map((node) => [
              node.id,
              {
                label: node.label,
                code: node.code,
                amount: node.values?.regular_budget ?? null,
              },
            ]),
        );
        return { metric, year, items };
      }),
    ),
  );
}

export type SecretariatTrendRow = {
  year: number;
  priorities: Record<string, number>;
  funding: Record<BudgetFundingSource, number>;
};

export async function secretariatTrendRows(): Promise<SecretariatTrendRow[]> {
  return Promise.all(
    manifest.secretariatOverview.years.map(async (year) => {
      const { meta, entities } = await readData<SecretariatOverviewData>(
        "secretariat-overview",
        year,
      );
      const priorities = new Map(meta.priorities.map((name) => [name, 0]));
      const funding: SecretariatTrendRow["funding"] = {
        regular_budget: 0,
        other_assessed: 0,
        extrabudgetary: 0,
      };
      for (const entity of entities) {
        for (const cell of entity.cells) {
          priorities.set(
            cell.priority_area,
            (priorities.get(cell.priority_area) ?? 0) + cell.amount,
          );
          funding[cell.funding_source] += cell.amount;
        }
      }
      return {
        year: meta.year,
        priorities: Object.fromEntries(priorities),
        funding,
      };
    }),
  );
}
