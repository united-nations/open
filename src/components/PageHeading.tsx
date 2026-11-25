import { typography } from "@un-eosg/ui/typography";
import { cn } from "@/lib/utils";

export function PageTitle({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        typography.pageTitle,
        "text-3xl text-gray-900 md:text-4xl",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function PageHeading({
  title,
  description,
  id,
  sources,
}: {
  title: string;
  description: React.ReactNode;
  id?: string;
  sources?: React.ReactNode;
}) {
  return (
    <section id={id} className="w-full scroll-mt-40">
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-4 md:px-12 md:pt-10 md:pb-5 lg:px-16">
        <PageTitle className="mb-2">{title}</PageTitle>
        <p className="max-w-3xl text-base leading-relaxed text-gray-700">
          {description}
        </p>
        {sources && (
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-700 [&_a]:font-semibold">
            {sources}
          </p>
        )}
      </div>
    </section>
  );
}
