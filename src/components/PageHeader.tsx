import Image from "next/image";
import Link from "next/link";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function PageHeader() {
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      {/* Skip link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue"
      >
        Skip to main content
      </a>
      {/* Gap matches the logo's internal "United"–"Nations" word-space (22.83 viewBox
          units = 18% of logo height), minus the title's left side-bearing, so
          "United Nations Transparency Portal" reads as one phrase. Scales with logo:
          h-12 → 8.06px, h-14 → 9.41px. */}
      <div className="mx-auto max-w-6xl px-6 py-4 md:px-12 lg:px-16">
        <Link
          href="/"
          aria-label="UN Transparency Portal — home"
          className="inline-flex items-center gap-[8.06px] rounded focus:outline-none focus:ring-2 focus:ring-un-blue md:gap-[9.41px]"
        >
          <Image
            src={`${basePath}/images/UN_Logo_Horizontal_Colour_English.svg`}
            alt="United Nations"
            width={160}
            height={60}
            className="h-12 w-auto select-none md:h-14"
            draggable={false}
          />
          {/* Sized & baseline-aligned to the logo's "United Nations" wordmark:
              cap-height = 53.75/126.89 of the logo height, so font-size = 0.596 × logo height
              (h-12 → 28.6px, h-14 → 33.37px). leading-none + items-center aligns the baseline. */}
          <h1 className="text-[28.6px] font-light leading-none tracking-tight text-gray-900 md:text-[33.37px]">
            Transparency Portal
          </h1>
        </Link>
      </div>
    </header>
  );
}
