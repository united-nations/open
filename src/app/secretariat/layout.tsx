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
        <p className="max-w-3xl text-base leading-relaxed text-gray-700 md:text-lg">
          Explore its regular budget, peacekeeping budget and trust funds,
          including spending by entities and missions and contributions from
          Member States and other funders.
        </p>
      </section>
      {children}
    </>
  );
}
