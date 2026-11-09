import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsView } from "@/components/EventsView";
import { getEventItems } from "@/lib/feed";

export const metadata: Metadata = { title: "Viðburðir · Hvað á að gera?" };

export default function EventsPage() {
  return (
    <div className="page-shell secondary-page events-page">
      <Suspense fallback={<p className="loading">Hleð inn viðburðum…</p>}>
        <EventsData />
      </Suspense>
    </div>
  );
}

async function EventsData() {
  return <EventsView events={await getEventItems()} />;
}
