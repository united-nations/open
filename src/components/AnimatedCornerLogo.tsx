"use client";

import { AnimatedCornerLogo as UiAnimatedCornerLogo } from "@un-eosg/ui/components/animated-corner-logo";
import { usePathname } from "next/navigation";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function AnimatedCornerLogo() {
  const pathname = usePathname();
  // The corner logo belongs only on Open's root homepage.
  const isHome = pathname === "/";

  if (!isHome) return null;

  return (
    <UiAnimatedCornerLogo
      label="Visit UN 2.0 Network"
      href="https://un-two-zero.network/"
      src={`${basePath}/images/un-two-zero-corner.svg`}
    />
  );
}
