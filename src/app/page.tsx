import { Suspense } from "react";
import { Frontpage } from "@/components/home/Frontpage";
import type { Calendar } from "@/components/home/moods";
import { NoData } from "@/components/shared/NoData";
import type { FeedItem } from "@/lib/feed-types";
import { getEventItems, getFeed } from "@/lib/feed";
import { formatDay, formatDayHeading, formatLongDate, formatTime } from "@/lib/format";
import { getLastUpdated } from "@/lib/queries";

export default function Home() {
  return (
    <div className="page-shell">
      {/* Data comes from the database at request time, so it streams in. */}
      <Suspense fallback={<p className="loading">Sæki dagskrá dagsins…</p>}>
        <FrontpageData />
      </Suspense>
    </div>
  );
}

async function FrontpageData() {
  const [feed, events, lastUpdated] = await Promise.all([getFeed(), getEventItems(), getLastUpdated()]);
  if (!lastUpdated) return <NoData />;

  const now = new Date();
  const calendar = makeCalendar(now);
  // The feed only has the next two days of events; add the rest of the weekend's.
  const ids = new Set(feed.map((i) => i.id));
  const weekend = events.filter((e) => e.dayKey && calendar.weekend.includes(e.dayKey) && !ids.has(e.id));
  const items: FeedItem[] = [...feed, ...weekend];

  return (
    <Frontpage
      items={items}
      calendar={calendar}
      todayLabel={formatLongDate(now.toISOString())}
      updatedLabel={`${formatDay(lastUpdated)} kl. ${formatTime(lastUpdated)}`}
    />
  );
}

/**
 * Today, and the weekend days that are not over: on Monday–Friday the
 * coming Friday to Sunday, on Saturday Saturday and Sunday, on Sunday
 * just Sunday. (Iceland is on UTC, so UTC dates are local dates.)
 */
function makeCalendar(now: Date): Calendar {
  const day = now.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const fromToday = day === 0 ? [0] : day === 6 ? [0, 1] : [5 - day, 6 - day, 7 - day];
  const weekend = fromToday.map((offset) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  });
  const headings = Object.fromEntries(weekend.map((d) => [d, formatDayHeading(`${d}T12:00:00Z`, now)]));
  return { today: now.toISOString().slice(0, 10), weekend, headings };
}
