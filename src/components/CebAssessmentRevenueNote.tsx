import Link from "next/link";

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
      <Link href="/system/assessments" className="underline underline-offset-2">
        Assessments
      </Link>{" "}
      for assessments payable, payments received and reported outstanding
      balances.
    </p>
  );
}
