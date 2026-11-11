import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function PageBody({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={cn(
        "mx-auto max-w-6xl px-6 pt-5 pb-12 md:px-12 lg:px-16",
        className,
      )}
    >
      {children}
    </section>
  );
}
