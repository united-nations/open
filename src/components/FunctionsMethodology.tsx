export function FunctionsMethodology() {
  return (
    <div className="space-y-2 text-sm">
      <p>
        Functions are reported by entities under{" "}
        <a
          href="https://unsceb.org/statistics/expenses-by-function/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          CEB Standard II
        </a>
        . These are a separate view of the same expenditure, not amounts to add
        to SDG expenditure.
      </p>
      <p>
        The current four-function classification began in 2018. Earlier years
        retain the separate legacy Other category, so comparisons across 2018
        involve a classification change. Amounts are nominal US dollars. Changes
        in reporting coverage and entities’ allocations can affect comparisons.
        Inter-agency transfers are not eliminated.
      </p>
      <p>
        Function totals use CEB entities without Secretariat sub-entity fusion.
        No function-by-country or function-by-SDG breakdown is inferred from
        separate datasets.
      </p>
      <a
        href="https://unsceb.org/assets/data/FS/expenses_sub_agency.csv"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block underline"
      >
        Download the CEB source data
      </a>
    </div>
  );
}
