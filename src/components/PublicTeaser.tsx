import { Download } from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const datasets = [
  {
    file: "un-system-revenues.zip",
    title: "UN System revenue",
    years: "2013–2022",
  },
  {
    file: "un-system-expenses.zip",
    title: "UN System expenses",
    years: "2013–2022",
  },
  {
    file: "un-secretariat-expenses.zip",
    title: "UN Secretariat expenses",
    years: "2019–2023",
  },
];

export function PublicTeaser() {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-12 pb-12 md:px-12 md:pt-20 lg:px-16">
      <section
        aria-labelledby="teaser-heading"
        className="max-w-3xl border-l-4 border-un-blue pl-6 md:pl-8"
      >
        <p className="mb-4 text-sm font-medium tracking-wide text-un-blue">
          Launching December 2026
        </p>
        <h1
          id="teaser-heading"
          className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl"
        >
          A new window into UN financing.
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-700">
          We are preparing a new UN Transparency Portal to make financial
          information across the UN System and UN Secretariat easier to explore
          and understand.
        </p>
        <p className="mt-4 text-base leading-7 text-gray-700">
          The new portal will launch in December 2026. In the meantime, datasets
          from the previous portal remain available to download below.
        </p>
      </section>
      <section aria-labelledby="downloads-heading" className="mt-14">
        <h2 id="downloads-heading" className="text-2xl font-bold text-gray-900">
          Download existing datasets
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Data from the previous open.un.org dashboards, preserved on 18
          November 2026. Each ZIP includes CSV files and the original dashboard
          data in JSON format, with source notes and reference tables.
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          You can also explore the{" "}
          <a
            href="https://united-nations.github.io/open-legacy-website/"
            className="text-un-blue underline underline-offset-4 hover:no-underline"
          >
            archived portal
          </a>
          , including its interactive dashboards.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {datasets.map((dataset) => (
            <a
              key={dataset.file}
              href={`${basePath}/downloads/legacy/${dataset.file}`}
              download
              className="group flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-6 hover:border-un-blue hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-un-blue"
            >
              <div>
                <h3 className="font-medium text-gray-900 group-hover:text-un-blue">
                  {dataset.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {dataset.years} · ZIP (CSV and JSON)
                </p>
              </div>
              <Download
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-un-blue"
              />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
