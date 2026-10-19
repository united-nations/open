import { notFound } from "next/navigation";
import { isRouteEnabled } from "@/lib/navigation";

export default function FieldMissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isRouteEnabled("/secretariat/field-missions")) notFound();
  return children;
}
