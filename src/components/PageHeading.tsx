export function PageHeading({
  title,
  description,
  id,
  children,
  sources,
}: {
  title: string;
  description: React.ReactNode;
  id?: string;
  children?: React.ReactNode;
  sources?: React.ReactNode;
}) {
  return (
    <section id={id} className="w-full scroll-mt-28 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-4 md:px-12 md:pt-10 md:pb-5 lg:px-16">
        <h2 className="mb-2 text-2xl font-bold text-gray-900 lg:text-3xl">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-gray-700 lg:text-base">
          {description}
          {sources && <> {sources}</>}
        </p>
        {children}
      </div>
    </section>
  );
}
