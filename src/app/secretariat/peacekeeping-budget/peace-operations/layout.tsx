import { notFound } from "next/navigation";
import { isRouteEnabled } from "@/lib/navigation";

export default function PeaceOperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isRouteEnabled("/secretariat/peacekeeping-budget/peace-operations"))
    notFound();
  return children;
}
