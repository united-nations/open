import type { FlowGraph, FlowLink, FlowNode } from "./systemFlowLayout";
export type FlowSelection =
  | { kind: "node"; id: string }
  | { kind: "edge"; source: string; target: string };
export const flowSelectionKey = (selection: FlowSelection) =>
  selection.kind === "node"
    ? `node:${selection.id}`
    : JSON.stringify([selection.source, selection.target]);
export function getFlowDetails(graph: FlowGraph, selection: FlowSelection) {
  const sum = (links: FlowLink[]) =>
    links.reduce((total, link) => total + link.value, 0);
  const incoming = (node: FlowNode) =>
    graph.links.filter((link) => link.target === node.id);
  const outgoing = (node: FlowNode) =>
    graph.links.filter((link) => link.source === node.id);
  const name = (node: FlowNode) => node.fullLabel || node.label;
  const breakdown = (
    label: string,
    links: FlowLink[],
    side: "source" | "target",
  ) => {
    const total = sum(links),
      hasNegative = links.some((link) => link.value < 0);
    const canonical =
      links.length > 0 &&
      links.every(
        (link) =>
          graph.nodes.find((node) => node.id === link[side])?.order !==
          undefined,
      );
    return {
      label,
      canonical,
      rows: [...links]
        .sort((a, b) =>
          canonical
            ? graph.nodes.find((node) => node.id === a[side])!.order! -
              graph.nodes.find((node) => node.id === b[side])!.order!
            : b.value - a.value,
        )
        .map((link) => {
          const other = graph.nodes.find((node) => node.id === link[side])!;
          return {
            label: name(other),
            amount: link.value,
            color: other.color,
            share: !hasNegative && total > 0 ? link.value / total : undefined,
          };
        }),
    };
  };
  if (selection.kind === "node") {
    const node = graph.nodes.find((node) => node.id === selection.id);
    if (!node) return null;
    const before = incoming(node),
      after = outgoing(node);
    const totals =
      node.column === 1
        ? [
            { label: "Revenue", amount: sum(before) },
            { label: "Expenditure", amount: sum(after) },
          ]
        : [
            {
              label: node.column === 0 ? "Funding" : "Expenditure",
              amount: sum(node.column === 0 ? after : before),
            },
          ];
    const sections =
      node.column === 1
        ? [
            breakdown("Funding from", before, "source"),
            breakdown("Spending by", after, "target"),
          ]
        : [
            breakdown(
              node.column === 0
                ? "Recipient organizations"
                : "Spending organizations",
              node.column === 0 ? after : before,
              node.column === 0 ? "target" : "source",
            ),
          ];
    const adjustments = sections.flatMap((section) => {
      const amount = section.rows
        .filter((row) => row.amount < 0)
        .reduce((value, row) => value + row.amount, 0);
      return amount < 0
        ? [
            {
              label:
                node.column === 0 || section.label === "Funding from"
                  ? "Revenue adjustments (included)"
                  : "Expenditure adjustments (included)",
              amount,
            },
          ]
        : [];
    });
    return {
      title: name(node),
      category: node.category,
      color: node.color,
      totals,
      sections,
      adjustments,
      percentages: [] as { label: string; share: number }[],
      note: node.note,
      nodes: [node],
    };
  }
  const link = graph.links.find(
    (link) =>
      link.source === selection.source && link.target === selection.target,
  );
  if (!link) return null;
  const source = graph.nodes.find((node) => node.id === link.source)!,
    target = graph.nodes.find((node) => node.id === link.target)!;
  const from = outgoing(source),
    to = incoming(target);
  // A percentage is not a meaningful composition share if either denominator includes corrections.
  const percentages =
    link.value > 0 &&
    !from.some((row) => row.value < 0) &&
    !to.some((row) => row.value < 0)
      ? [
          {
            label: `Share of ${name(source)} ${source.column === 0 ? "funding" : "expenditure"}`,
            share: link.value / sum(from),
          },
          {
            label: `Share of ${name(target)} ${source.column === 0 ? "revenue" : "expenditure"}`,
            share: link.value / sum(to),
          },
        ]
      : [];
  return {
    title: `${name(source)} → ${name(target)}`,
    category:
      source.column === 0 ? "Funding connection" : "Expenditure connection",
    color: source.color,
    totals: [
      {
        label: source.column === 0 ? "Funding" : "Expenditure",
        amount: link.value,
      },
    ],
    sections: [],
    adjustments: [],
    percentages,
    note: percentages.length
      ? undefined
      : "Shares are omitted because this connection or its totals include signed adjustments.",
    nodes: [source, target],
  };
}
