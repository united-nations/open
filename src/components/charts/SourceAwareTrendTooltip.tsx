"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tooltip, type TooltipContentProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type ContentProps = TooltipContentProps<ValueType, NameType>;

/** Keep hovered evidence still and reachable without changing chart hover behavior. */
export function SourceAwareTrendTooltip({
  interactive = false,
  content,
}: {
  interactive?: boolean;
  content: (props: ContentProps) => ReactNode;
}) {
  const [held, setHeld] = useState<ContentProps | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const release = () => {
    cancel();
    timer.current = setTimeout(() => setHeld(null), 180);
  };
  return (
    <Tooltip
      active={held ? true : undefined}
      position={held?.coordinate}
      offset={interactive ? 0 : 10}
      wrapperStyle={
        interactive ? { pointerEvents: "auto", zIndex: 20 } : undefined
      }
      content={(props) => {
        const current = held ?? props;
        if (!interactive) return content(props);
        return (
          <div
            onPointerEnter={() => {
              cancel();
              if (props.active) setHeld(props);
            }}
            onPointerLeave={release}
            onPointerMove={(event) => event.stopPropagation()}
            onFocus={() => {
              cancel();
              if (props.active) setHeld(props);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) release();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                cancel();
                setHeld(null);
              }
            }}
          >
            {content(current)}
          </div>
        );
      }}
    />
  );
}
