/** A two-sided Sankey: revenue and expenditure share a scale, not a balance. */
export interface FlowNode {
  id: string;
  label: string;
  fullLabel?: string;
  category?: string;
  note?: string;
  detail?: {
    kind: "entity" | "donor" | "country" | "sdg" | "function";
    value: string;
  };
  members?: Array<{ node: FlowNode; revenue: number; spending: number }>;
  column: 0 | 1 | 2;
  color: string;
  order?: number;
  /** Only the generated top-N remainder is pinned below size-sorted entries. */
  isAggregate?: boolean;
}
export interface FlowLink {
  source: string;
  target: string;
  value: number;
}
export interface FlowGraph {
  nodes: FlowNode[];
  links: FlowLink[];
}

export { layoutSankey as layoutSystemFlows } from "@un-eosg/ui/sankey";
