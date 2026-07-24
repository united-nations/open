"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * `/` has no content of its own — `/system` is the de-facto home. The site is a
 * static export, so `next.config.ts` redirects are unavailable; the redirect
 * happens in the browser instead. The meta refresh covers the no-JS case, the
 * router call makes it instant when JS is available.
 */
export function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/system");
  }, [router]);

  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${basePath}/system/`} />
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-12 lg:px-16">
        <p className="text-sm text-gray-500">
          Redirecting to{" "}
          <a
            href={`${basePath}/system/`}
            className="underline hover:text-gray-700"
          >
            UN System Financials
          </a>
          …
        </p>
      </section>
    </>
  );
}
