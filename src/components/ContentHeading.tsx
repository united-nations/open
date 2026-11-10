import type { HTMLAttributes, ReactNode } from "react";
import { Link as LinkIcon } from "lucide-react";
import { typography } from "@un-eosg/ui/typography";
import { cn } from "@/lib/utils";

/** Peer chart titles share a visual tier; their level follows their nesting. */
export function ChartHeading({
  as: Heading = "h2",
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { as?: "h2" | "h3" }) {
  return (
    <Heading
      {...props}
      data-content-heading="chart"
      className={cn(
        typography.sectionTitle,
        "text-lg font-medium tracking-normal text-gray-900",
        className,
      )}
    />
  );
}

/** Major sections share typography and an optional link to their existing anchor. */
export function SectionHeading({
  anchor,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & {
  anchor?: string;
  children: ReactNode;
}) {
  return (
    <h2
      {...props}
      data-content-heading="section"
      className={cn(
        typography.cardTitle,
        "font-bold text-gray-900",
        anchor && "group",
        className,
      )}
    >
      {anchor ? (
        <a
          href={`#${anchor}`}
          className="underline-offset-4 hover:underline focus-visible:underline"
        >
          {children}
          <LinkIcon
            aria-hidden="true"
            className="ml-2 inline size-5 align-baseline text-gray-400 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          />
        </a>
      ) : (
        children
      )}
    </h2>
  );
}
