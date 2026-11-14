import Link from "next/link";
import { SYSTEM_ASSESSMENTS_PATH } from "@/lib/navigation";

export function CebAssessmentRevenueNote({
  className = "mt-3 max-w-3xl text-sm leading-relaxed text-gray-600",
}: {
  className?: string;
}) {
  return (
    <p className={className}>
      Assessed contributions here are revenue recognized in organizations’
      accounts, which can include unpaid amounts and differ from amounts billed;
      see{" "}
      <Link
        href={SYSTEM_ASSESSMENTS_PATH}
        className="underline underline-offset-2"
      >
        Assessed Contributions
      </Link>{" "}
      for assessments payable, payments received and reported outstanding
      balances.
    </p>
  );
}
