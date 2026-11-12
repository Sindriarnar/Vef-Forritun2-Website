import type { ReactNode } from "react";

/** A labelled row of filter chips: "ALDUR  [Allir] [0–14 ára] ...". */
export function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="filter-row" role="group" aria-label={label}>
      <span className="filter-row-label" aria-hidden="true">
        {label}
      </span>
      <div className="chips">{children}</div>
    </div>
  );
}
