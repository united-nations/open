"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { SubsectionHeading } from "@/components/ContentHeading";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ExpandableCardProps {
  id?: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: "default" | "filled";
}

export function ExpandableCard({
  id,
  title,
  children,
  defaultOpen = false,
  variant = "default",
}: ExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Open the card when navigating to it via hash link
  useEffect(() => {
    if (id && typeof window !== "undefined") {
      const handleHashChange = () => {
        if (window.location.hash === `#${id}`) {
          setIsOpen(true);
          // Scroll to the element after a brief delay to allow expansion
          setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      };

      // Check on mount
      handleHashChange();

      // Listen for hash changes
      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, [id]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SubsectionHeading>
        <CollapsibleTrigger
          id={id}
          className={`flex w-full scroll-mt-20 items-center justify-between gap-3 py-3 text-left transition-colors ${
            variant === "filled"
              ? "bg-gray-50 px-4 hover:bg-gray-100"
              : "border-b border-gray-200 hover:bg-gray-50"
          }`}
        >
          {title}
          <ChevronDown
            aria-hidden="true"
            className={`size-5 shrink-0 text-gray-500 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
      </SubsectionHeading>
      <CollapsibleContent className="data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down overflow-hidden">
        <div className="py-4 text-sm leading-relaxed text-gray-600">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
