"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keep function links shared before the Functions tab was split working. */
export function FunctionDeepLinkRedirect() {
  const router = useRouter();
  useEffect(() => {
    const redirect = () => {
      if (window.location.hash.startsWith("#function=")) {
        router.replace(
          `/system/functions/${window.location.search}${window.location.hash}`,
        );
      }
    };
    redirect();
    window.addEventListener("hashchange", redirect);
    window.addEventListener("popstate", redirect);
    return () => {
      window.removeEventListener("hashchange", redirect);
      window.removeEventListener("popstate", redirect);
    };
  }, [router]);
  return null;
}
