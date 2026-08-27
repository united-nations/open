import { cn } from "@/lib/utils";

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16",
        className,
      )}
    >
      {children}
    </section>
  );
}
