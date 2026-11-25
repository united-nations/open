import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/PageHeading";
import { PageBody } from "@/components/PageBody";
import { PooledFundsOverview } from "@/components/PooledFundsOverview";
import { RelatedDataPages } from "@/components/RelatedDataPages";
import { isRouteEnabled } from "@/lib/navigation";
import type { PooledFundsIndex } from "@/types";

export const metadata: Metadata = {
  title: "UN Pooled Funds",
  description:
    "Explore deposits, transfers and reported expenditure across the UN Multi-Partner Trust Fund Office portfolio of funds and joint programmes.",
};
export default async function PooledFundsPage() {
  if (!isRouteEnabled("/system/pooled-funds")) notFound();
  const { meta } = JSON.parse(
    await readFile(
      path.join(process.cwd(), "public/data/pooled-funds.json"),
      "utf8",
    ),
  ) as PooledFundsIndex;
  const updatedDate = meta.snapshotAt.slice(0, 10);
  const updatedLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${updatedDate}T00:00:00Z`));
  return (
    <>
      <PageHeading
        id="pooled-funds"
        title="How do pooled funds support joint action?"
        description="Pooled funds bring contributions together to support joint programmes. Explore the UN Multi-Partner Trust Fund Office (MPTF Office) portfolio: who contributes, which organizations receive resources, and where programmes operate."
        sources={
          <>
            Figures come from the{" "}
            <a
              href="https://mptf.undp.org/"
              className="underline underline-offset-2"
            >
              MPTF Office Gateway
            </a>
            . Last updated: <time dateTime={updatedDate}>{updatedLabel}</time>.
          </>
        }
      />
      <PageBody>
        <PooledFundsOverview />
      </PageBody>
      <RelatedDataPages page="/system/pooled-funds" />
      <PageBody className="pt-0">
        <p className="text-sm text-gray-600">
          For humanitarian pooled funding, explore OCHA’s{" "}
          <a className="underline" href="https://pfdata.unocha.org/">
            CERF and Country-based Pooled Funds Data Hub
          </a>
          . Coverage and reporting periods differ from the MPTF Office
          portfolio. See the{" "}
          <Link
            href="/about/#pooled-funds-methodology"
            className="underline underline-offset-2"
          >
            pooled funds methodology
          </Link>
          .
        </p>
      </PageBody>
    </>
  );
}
