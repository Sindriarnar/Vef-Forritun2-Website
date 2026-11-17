import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanView } from "@/components/subpages/PlanView";
import type { FeedItem } from "@/lib/feed-types";
import { getEventItems, getFeed } from "@/lib/feed";

export const metadata: Metadata = { title: "Planið · Hvað á að gera?" };

// Your plan lives in the browser (localStorage). The page also loads
// today's feed and tomorrow's events to put together ready-made outings.
export default function PlanPage() {
  return (
    <div className="page-shell secondary-page plan-page">
      <Suspense fallback={<p className="loading">Sæki planið…</p>}>
        <PlanData />
      </Suspense>
    </div>
  );
}

async function PlanData() {
  const [feed, events] = await Promise.all([getFeed(), getEventItems()]);
  const now = new Date(); // Iceland is on UTC all year, so UTC times are local
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const ids = new Set(feed.map((i) => i.id));
  const items: FeedItem[] = [...feed, ...events.filter((e) => e.dayKey === tomorrow && !ids.has(e.id))];
  return (
    <PlanView items={items} today={today} tomorrow={tomorrow} now={now.getUTCHours() * 60 + now.getUTCMinutes()} />
  );
}
