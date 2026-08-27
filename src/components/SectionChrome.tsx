import { SectionSubnav } from "@/components/SectionSubnav";
import type { SectionNavItem } from "@/lib/navigation";

export function SectionChrome({
  title,
  intro,
  navLabel,
  items,
  children,
}: {
  title: string;
  intro: string;
  navLabel: string;
  items: readonly SectionNavItem[];
  children: React.ReactNode;
}) {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-6 pt-8 pb-6 md:px-12 lg:px-16">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        <p className="text-base leading-relaxed text-gray-700 md:text-lg">
          {intro}
        </p>
      </section>
      <SectionSubnav items={items} label={navLabel} />
      {children}
    </>
  );
}
