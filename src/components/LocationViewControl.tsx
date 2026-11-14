"use client";

import { SegmentedControl } from "@un-eosg/ui/components/segmented-control";

const views = [
  { value: "chart", label: "Chart" },
  { value: "map", label: "Map" },
  { value: "list", label: "List" },
] as const;

export type LocationView = (typeof views)[number]["value"];

export function LocationViewControl({
  view,
  onViewChange,
}: {
  view: LocationView;
  onViewChange: (view: LocationView) => void;
}) {
  return (
    <SegmentedControl
      label="Geographic view"
      options={views}
      value={view}
      onValueChange={(value) => {
        const option = views.find((view) => view.value === value);
        if (option) onViewChange(option.value);
      }}
    />
  );
}
