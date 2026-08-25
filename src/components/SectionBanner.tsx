"use client";

import { Link as LinkIcon } from "lucide-react";
import Image from "next/image";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const EXTEND_BANNER_BACKGROUNDS = false;

const BANNER_BACKGROUND_COLORS: Record<string, string> = {
  "/images/banners/hero-banner-homepage.png": "#ecf4f7",
  "/images/banners/hero-banner-president.png": "#f7f7f7",
  "/images/banners/hero-banner-secretariat-expenses.png": "#f5f3f2",
  "/images/banners/hero-banner-system-expenses.png": "#f5f3f2",
  "/images/banners/hero-banner-system-revenue.png": "#f2f4f4",
};

interface SectionBannerProps {
  imageSrc?: string;
  title: string;
  description: string;
  id?: string;
  underSecretariatNav?: boolean;
}

export function SectionBanner({
  imageSrc,
  title,
  description,
  id,
  underSecretariatNav = false,
}: SectionBannerProps) {
  if (!imageSrc) {
    return (
      <section
        id={id}
        className={`w-full bg-gray-50 ${underSecretariatNav ? "scroll-mt-40" : "scroll-mt-28"}`}
      >
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-12 md:py-10 lg:px-16">
          <h2 className="group mb-2 text-2xl font-bold text-gray-900 lg:text-3xl">
            {id ? (
              <a href={`#${id}`} className="hover:underline">
                {title}
                <LinkIcon className="ml-2 inline h-5 w-5 align-baseline text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            ) : (
              title
            )}
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-700 lg:text-base">
            {description}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      className={`relative w-full ${underSecretariatNav ? "scroll-mt-40" : "scroll-mt-28"}`}
      style={
        EXTEND_BANNER_BACKGROUNDS
          ? {
              backgroundColor: BANNER_BACKGROUND_COLORS[imageSrc] ?? "#f3f4f6",
            }
          : undefined
      }
    >
      {/* Mobile: text only; banner imagery is reserved for desktop. */}
      <div className="md:hidden">
        <div className="bg-gray-50 px-6 py-6">
          <h2 className="group mb-2 text-xl font-bold text-gray-900">
            {id ? (
              <a href={`#${id}`} className="hover:underline">
                {title}
                <LinkIcon className="ml-2 inline h-4 w-4 align-baseline text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            ) : (
              title
            )}
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">{description}</p>
        </div>
      </div>

      {/* Desktop: Overlay layout - width-constrained, centered, full aspect ratio */}
      <div className="hidden w-full md:block">
        <div className="mx-auto max-w-[1440px]">
          <div className="relative aspect-[18/5] w-full overflow-hidden bg-gray-100">
            <Image
              src={`${basePath}${imageSrc}`}
              alt=""
              fill
              className="object-cover"
              priority
            />
            {/* Text overlay - constrained to left half of banner */}
            <div className="absolute inset-0 flex items-center">
              <div className="mx-auto w-full max-w-6xl px-12 lg:px-16">
                <div className="max-w-[50%]">
                  <h2 className="group mb-3 text-2xl font-bold text-gray-900 lg:text-3xl">
                    {id ? (
                      <a href={`#${id}`} className="hover:underline">
                        {title}
                        <LinkIcon className="ml-2 inline h-5 w-5 align-baseline text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                      </a>
                    ) : (
                      title
                    )}
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-700 lg:text-base">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
