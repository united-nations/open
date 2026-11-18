import { notFound } from "next/navigation";
import { isRouteEnabled } from "@/lib/navigation";

export default function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isRouteEnabled("/about")) notFound();
  return children;
}
