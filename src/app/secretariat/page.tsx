import type { Metadata } from "next";
import { SecretariatDataTreemap } from "@/components/SecretariatDataTreemap";

export const metadata: Metadata = {
  title: "UN Secretariat Financials",
  description:
    "Explore UN Secretariat expenditure from audited financial statements or the PPB and PKO budget documents.",
};

export default function SecretariatPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
      <SecretariatDataTreemap />
    </section>
  );
}
