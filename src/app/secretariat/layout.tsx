import { SecretariatSubnav } from "@/components/SecretariatSubnav";

export default function SecretariatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SecretariatSubnav />
      <section className="mx-auto w-full max-w-6xl px-6 pt-8 pb-6 md:px-12 lg:px-16">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">
          Understand the financing of the UN Secretariat.
        </h1>
        <p className="text-base leading-relaxed text-gray-700 md:text-lg lg:whitespace-nowrap">
          Get an overview of entities and priority areas, and dive into the
          details of the regular budget and the peacekeeping budget.
        </p>
      </section>
      {children}
    </>
  );
}
