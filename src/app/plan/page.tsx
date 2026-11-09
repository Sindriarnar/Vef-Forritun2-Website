import type { Metadata } from "next";
import { PlanView } from "@/components/PlanView";

export const metadata: Metadata = { title: "Planið · Hvað á að gera?" };

// The plan lives in the browser (localStorage), so this page needs no data.
export default function PlanPage() {
  return (
    <div className="page-shell secondary-page">
      <PlanView />
    </div>
  );
}
