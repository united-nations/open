export function PageHeading({
  title,
  description,
  id,
}: {
  title: string;
  description: string;
  id?: string;
}) {
  return (
    <section id={id} className="w-full scroll-mt-28 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-12 md:py-10 lg:px-16">
        <h2 className="mb-2 text-2xl font-bold text-gray-900 lg:text-3xl">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-gray-700 lg:text-base">
          {description}
        </p>
      </div>
    </section>
  );
}
