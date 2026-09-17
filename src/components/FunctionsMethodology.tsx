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
        to SDG spending.
      </p>
      <p>
        Trends start in 2018, when the current four-function classification
        began. Earlier categories are not joined to this series. Amounts are
        nominal US dollars; changes in reporting coverage and entities’
        allocations can affect comparisons. Inter-agency transfers are not
        eliminated.
      </p>
      <p>
        Function totals use CEB entities without Secretariat sub-entity fusion.
        No function-by-country or function-by-SDG breakdown is inferred from
        separate datasets.
      </p>
      <a
        href="https://unsceb.org/sites/default/files/statistic_files/Financial/expenses_sub_agency.csv"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block underline"
      >
        Download the CEB source data
      </a>
    </div>
  );
}
