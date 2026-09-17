import type { FlowGraph, FlowNode } from "./systemFlowLayout";

export type FundingDimension = "contributor" | "category" | "instrument";
export type OrganizationDimension = "organization" | "category";
export type SpendingDimension = "region" | "country" | "function" | "goal";
export interface FlowSpendingData {
  meta: { years: number[]; sourceUrls: unknown };
  data: {
    year: number;
    entities: Record<
      string,
      {
        total: number | null;
        geography: {
          key: string;
          label: string;
          region: string;
          kind: string;
          amount: number;
        }[];
        goals: { key: string; label: string; amount: number }[];
        geographyDifference: number | null;
        goalsDifference: number | null;
      }
    >;
  }[];
}
export interface SystemFlowInput {
  countries?: Record<string, string>;
  revenue: Record<string, { total: number; by_type: Record<string, number> }>;
  contributors: Record<
    string,
    {
      is_other?: boolean;
      group: "Government" | "Non-Government" | "Unattributed";
      contributions: Record<string, Record<string, number>>;
    }
  >;
  spending: FlowSpendingData["data"][number];
  functions: Record<string, Partial<Record<string, number>>>;
  entities: Record<string, { label: string; category: string; color: string }>;
}
export interface FlowChoices {
  funding: FundingDimension;
  organization: OrganizationDimension;
  spending: SpendingDimension;
  limit: number;
}
export function buildSystemFlows(
  input: SystemFlowInput,
  choices: FlowChoices,
  describe: (
    column: 0 | 2,
    key: string,
  ) => { label: string; color: string; order?: number; fullLabel?: string },
): FlowGraph {
  const nodes = new Map<string, FlowNode>();
  const amounts = new Map<
    string,
    { source: string; target: string; value: number }
  >();
  const addNode = (node: FlowNode) => {
    nodes.set(node.id, node);
    return node.id;
  };
  const add = (source: string, target: string, value: number) => {
    if (!Number.isFinite(value)) throw new Error("Invalid flow amount");
    if (Math.abs(value) < 0.005) return;
    const key = JSON.stringify([source, target]);
    const previous = amounts.get(key);
    amounts.set(key, { source, target, value: (previous?.value ?? 0) + value });
  };
  const entityKeys = new Set([
    ...Object.keys(input.revenue),
    ...Object.keys(input.spending.entities),
    ...Object.values(input.contributors).flatMap((item) =>
      Object.keys(item.contributions),
    ),
  ]);
  for (const entity of entityKeys) {
    const metadata = input.entities[entity] ?? {
      label: entity,
      category: "Uncategorized",
      color: "#6b7280",
    };
    const category = choices.organization === "category";
    const middle = addNode({
      id: `1:${category ? metadata.category : entity}`,
      column: 1,
      label: category ? metadata.category : entity,
      fullLabel: category ? metadata.category : metadata.label,
      color: metadata.color,
      category: category ? "Organization category" : metadata.category,
      detail: category ? undefined : { kind: "entity", value: entity },
    });
    let funding = 0;
    const addFunding = (
      key: string,
      value: number,
      contributor?: SystemFlowInput["contributors"][string],
    ) => {
      const source = addNode({
        id: `0:${key}`,
        column: 0,
        ...describe(0, key),
        category:
          choices.funding === "instrument"
            ? "Financing instrument"
            : choices.funding === "category"
              ? "Contributor category"
              : contributor?.group,
        detail:
          choices.funding === "contributor" &&
          contributor &&
          !contributor.is_other &&
          key !== "Unattributed"
            ? { kind: "donor", value: key }
            : undefined,
        note:
          key === "Revenue from Activities"
            ? "Revenue reported without a contributor, including income from activities. This is not a named contributor."
            : key === "Revenue reconciliation difference"
              ? "Calculated difference between reported revenue and its contributor breakdown."
              : key === "Unattributed"
                ? "Revenue for which the source does not identify the contributor."
                : choices.funding === "contributor" && contributor?.is_other
                  ? "Source aggregate or calculated category remainder; individual contributors are not identified here."
                  : undefined,
      });
      add(source, middle, value);
      funding += value;
    };
    if (choices.funding === "instrument") {
      for (const [instrument, amount] of Object.entries(
        input.revenue[entity]?.by_type ?? {},
      ))
        addFunding(instrument, amount);
    } else {
      for (const [name, item] of Object.entries(input.contributors)) {
        const value = Object.values(item.contributions[entity] ?? {}).reduce(
          (sum, amount) => sum + amount,
          0,
        );
        if (value)
          addFunding(
            choices.funding === "category" ? item.group : name,
            value,
            item,
          );
      }
    }
    addFunding(
      "Revenue reconciliation difference",
      (input.revenue[entity]?.total ?? 0) - funding,
    );
    const expense = input.spending.entities[entity];
    let spent = 0;
    const addSpending = (
      key: string,
      label: string,
      value: number,
      country?: string,
    ) => {
      const description = describe(2, key);
      const target = addNode({
        id: `2:${key}`,
        column: 2,
        label: label || description.label,
        fullLabel: description.fullLabel,
        color: description.color,
        category:
          choices.spending === "goal"
            ? "Sustainable Development Goal"
            : choices.spending === "function"
              ? "UN system function"
              : choices.spending === "country"
                ? "Country / area"
                : "Region",
        detail: country
          ? { kind: "country", value: country }
          : choices.spending === "goal" && /^([1-9]|1[0-7])$/.test(key)
            ? { kind: "sdg", value: key }
            : choices.spending === "function" && key !== "coverage-difference"
              ? { kind: "function", value: key }
              : undefined,
        note:
          key === "coverage-difference"
            ? "Calculated reporting difference, not an assigned spending destination."
            : key === "unallocated"
              ? "Spending reported without allocation to a Sustainable Development Goal."
              : undefined,
      });
      add(middle, target, value);
      spent += value;
    };
    if (choices.spending === "function") {
      for (const [key, amount] of Object.entries(input.functions[entity] ?? {}))
        addSpending(key, "", amount ?? 0);
    } else if (choices.spending === "goal") {
      for (const goal of expense?.goals ?? [])
        addSpending(goal.key, goal.label, goal.amount);
    } else {
      for (const location of expense?.geography ?? []) {
        // Country mode retains regional/subregional records as explicitly named nodes.
        const key =
          choices.spending === "region"
            ? location.region ||
              (location.kind === "region"
                ? location.label
                : "Region unspecified")
            : `${location.kind}:${location.key}`;
        const label =
          choices.spending === "region"
            ? key
            : location.kind === "country"
              ? location.label
              : `${location.label} (${location.kind})`;
        addSpending(
          key,
          label,
          location.amount,
          choices.spending === "country" && location.kind === "country"
            ? input.countries?.[location.label.toLowerCase()]
            : undefined,
        );
      }
    }
    if (expense?.total !== null)
      addSpending(
        "coverage-difference",
        "Breakdown / total difference",
        (expense?.total ?? 0) - spent,
      );
  }
  const used = new Set(
    [...amounts.values()].flatMap((link) => [link.source, link.target]),
  );
  let graph: FlowGraph = {
    nodes: [...nodes.values()].filter((node) => used.has(node.id)),
    links: [...amounts.values()].filter(
      (link) => Math.abs(link.value) >= 0.005,
    ),
  };
  // Aggregate tails, never discard their amounts. Category dimensions stay complete.
  for (const column of [0, 1, 2] as const) {
    const detailed =
      column === 0
        ? choices.funding === "contributor"
        : column === 1
          ? choices.organization === "organization"
          : choices.spending === "country";
    if (!detailed || !Number.isFinite(choices.limit)) continue;
    const ranked = graph.nodes
      .filter((node) => node.column === column)
      .sort((a, b) => {
        const size = (id: string) =>
          graph.links
            .filter((link) => link.source === id || link.target === id)
            .reduce((sum, link) => sum + Math.abs(link.value), 0);
        return size(b.id) - size(a.id) || a.label.localeCompare(b.label);
      });
    if (ranked.length <= choices.limit) continue;
    const tail = new Set(ranked.slice(choices.limit).map((node) => node.id));
    const id = `${column}:remaining`,
      label = `${tail.size} other ${column === 0 ? "contributors" : column === 1 ? "organizations" : "locations"}`;
    const grouped = new Map<string, FlowGraph["links"][number]>();
    for (const link of graph.links) {
      const source = tail.has(link.source) ? id : link.source,
        target = tail.has(link.target) ? id : link.target;
      const key = JSON.stringify([source, target]);
      grouped.set(key, {
        source,
        target,
        value: (grouped.get(key)?.value ?? 0) + link.value,
      });
    }
    const members = graph.nodes
      .filter((node) => tail.has(node.id))
      .map((node) => {
        const sum = (side: "source" | "target") =>
          graph.links
            .filter((link) => link[side] === node.id)
            .reduce((total, link) => total + link.value, 0);
        return {
          node,
          revenue: sum(column === 0 ? "source" : "target"),
          spending: sum(column === 2 ? "target" : "source"),
        };
      });
    graph = {
      nodes: [
        ...graph.nodes.filter((node) => !tail.has(node.id)),
        {
          id,
          label,
          column,
          color: "#6b7280",
          isAggregate: true,
          members,
          note: `Combines ${tail.size} entries outside the largest ${choices.limit}. These can include named items and source aggregates; no amounts are omitted.`,
        },
      ],
      links: [...grouped.values()],
    };
  }
  return graph;
}
