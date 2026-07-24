import type { Metadata } from "next";
import { RootRedirect } from "@/components/RootRedirect";

export const metadata: Metadata = {
  title: "UN Transparency Portal",
  robots: { index: false, follow: true },
};

export default function RootPage() {
  return <RootRedirect />;
}
