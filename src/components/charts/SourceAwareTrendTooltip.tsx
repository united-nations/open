"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Tooltip, type TooltipContentProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type ContentProps = TooltipContentProps<ValueType, NameType>;
type Position = { x: number; y: number };

function ViewportBoundedContent({
  active,
  coordinate,
  label,
  onPosition,
  children,
}: Pick<ContentProps, "active" | "coordinate" | "label"> & {
  onPosition: (position: Position) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    const chart = element?.closest(".recharts-wrapper");
    if (!active || !element || !chart) return;
    const place = () => {
      const box = element.getBoundingClientRect();
      const origin = chart.getBoundingClientRect();
      onPosition({
        x:
          Math.max(
            16,
            Math.min(
              origin.left + (coordinate?.x ?? 0),
              window.innerWidth - box.width - 16,
            ),
          ) - origin.left,
        y:
          Math.max(
            16,
            Math.min(
              origin.top + (coordinate?.y ?? 0),
              window.innerHeight - box.height - 16,
            ),
          ) - origin.top,
      });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [active, coordinate?.x, coordinate?.y, label, onPosition]);
  return (
    <div
      ref={ref}
      className="max-h-[calc(100dvh-2rem)] w-max max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain"
      role="region"
      aria-label="Annual expenditure details"
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// Recharts remounts function-valued content when its identity changes. A stable
// element preserves keyboard focus and scroll position while a tooltip is held.
function TrendTooltipContent({
  held,
  canInteract,
  constrainToViewport,
  renderContent,
  onPosition,
  onHold,
  onCancel,
  onRelease,
  ...injectedProps
}: Partial<ContentProps> & {
  held: ContentProps | null;
  canInteract: boolean;
  constrainToViewport: boolean;
  renderContent: (props: ContentProps) => ReactNode;
  onPosition: (position: Position) => void;
  onHold: (props: ContentProps | null) => void;
  onCancel: () => void;
  onRelease: () => void;
}) {
  // Tooltip supplies these required properties when cloning the content element.
  const props = injectedProps as ContentProps;
  const current = held ?? props;
  const body = constrainToViewport ? (
    <ViewportBoundedContent
      active={current.active}
      coordinate={current.coordinate}
      label={current.label}
      onPosition={onPosition}
    >
      {renderContent(current)}
    </ViewportBoundedContent>
  ) : (
    renderContent(current)
  );
  if (!canInteract) return body;
  const hold = () => {
    onCancel();
    if (props.active) onHold(props);
  };
  return (
    <div
      onPointerEnter={hold}
      onPointerLeave={onRelease}
      onPointerMove={(event) => event.stopPropagation()}
      onFocus={hold}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onRelease();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onCancel();
          onHold(null);
        }
      }}
    >
      {body}
    </div>
  );
}

/** Keep hovered evidence still and reachable without changing chart hover behavior. */
export function SourceAwareTrendTooltip({
  interactive = false,
  constrainToViewport = false,
  content,
}: {
  interactive?: boolean;
  constrainToViewport?: boolean;
  content: (props: ContentProps) => ReactNode;
}) {
  const [held, setHeld] = useState<ContentProps | null>(null);
  const [viewportPosition, setViewportPosition] = useState<Position>();
  const onPosition = useCallback((next: Position) => {
    setViewportPosition((current) =>
      current?.x === next.x && current?.y === next.y ? current : next,
    );
  }, []);
  const canInteract = interactive || constrainToViewport;
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
      position={constrainToViewport ? viewportPosition : held?.coordinate}
      isAnimationActive={constrainToViewport ? false : undefined}
      allowEscapeViewBox={
        constrainToViewport ? { x: true, y: true } : undefined
      }
      offset={canInteract ? 0 : 10}
      wrapperStyle={
        canInteract ? { pointerEvents: "auto", zIndex: 20 } : undefined
      }
      content={
        <TrendTooltipContent
          held={held}
          canInteract={canInteract}
          constrainToViewport={constrainToViewport}
          renderContent={content}
          onPosition={onPosition}
          onHold={setHeld}
          onCancel={cancel}
          onRelease={release}
        />
      }
    />
  );
}
