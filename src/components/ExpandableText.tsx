"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@un-eosg/ui/components/button";
import { ChevronDown } from "lucide-react";

/** A measured preview that preserves rich text and only offers expansion on overflow. */
export function ExpandableText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const preview = previewRef.current;
    const content = contentRef.current;
    if (!preview || !content) return;

    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(preview).lineHeight);
      setOverflows(content.scrollHeight > lineHeight * 6 + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className}>
      <div
        id={id}
        ref={previewRef}
        className="overflow-hidden"
        style={{ maxHeight: expanded ? undefined : "6lh" }}
        // Keyboard navigation to any clipped link must reveal that link.
        onFocusCapture={() => setExpanded(true)}
      >
        <div ref={contentRef} className="flow-root">
          {children}
        </div>
      </div>
      {overflows && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-1 px-0 has-[>svg]:px-0"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown
            aria-hidden="true"
            className={expanded ? "rotate-180" : undefined}
          />
        </Button>
      )}
    </div>
  );
}
