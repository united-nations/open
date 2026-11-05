import { InteractionHint } from "@un-eosg/ui/components/interaction-hint";

export function ChartFooter({ hint }: { hint: string }) {
  return (
    <div className="space-y-2 text-sm text-gray-600" data-chart-hint>
      <InteractionHint text={hint} />
    </div>
  );
}
