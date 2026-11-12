import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsView } from "@/components/subpages/EventsView";
import { getEventItems } from "@/lib/feed";

export const metadata: Metadata = { title: "Viðburðir · Hvað á að gera?" };

type SearchParams = PageProps<"/events">["searchParams"];

export default function EventsPage({ searchParams }: PageProps<"/events">) {
  return (
    <div className="page-shell secondary-page events-page">
      <Suspense fallback={<p className="loading">Sæki viðburði…</p>}>
        <EventsData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** /events shows everything; /events?tegund=tonlist opens with only music. */
async function EventsData({ searchParams }: { searchParams: SearchParams }) {
  const [events, query] = await Promise.all([getEventItems(), searchParams]);
  const type = query.tegund === "tonlist" ? "tonlist" : "all";
  // The key gives the list a fresh start when the address changes between the two.
  return <EventsView key={type} events={events} initialType={type} />;
}
