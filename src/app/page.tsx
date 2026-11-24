import { Suspense } from "react";
import { Frontpage } from "@/components/home/Frontpage";
import type { Calendar } from "@/components/home/moods";
import { NoData } from "@/components/shared/NoData";
import type { FeedItem } from "@/lib/feed-types";
import { getComingDays, getEventItems, getFeed } from "@/lib/feed";
import { dateParts, formatDay, formatDayHeading, formatLongDate, formatTime } from "@/lib/format";
import { getLastUpdated } from "@/lib/queries";

/** The day picker shows today and this many days after it. */
const DAYS_AHEAD = 6;

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
  const [feed, events, comingDays, lastUpdated] = await Promise.all([
    getFeed(),
    getEventItems(),
    getComingDays(DAYS_AHEAD),
    getLastUpdated(),
  ]);
  if (!lastUpdated) return <NoData />;

  const now = new Date();
  const calendar = makeCalendar(now);
  // The feed only has the next two days of events (and today's movies and
  // places); add the rest of the week's, each once.
  const days = new Set(calendar.days.map((d) => d.key));
  const ids = new Set(feed.map((i) => i.id));
  const extra = [...events.filter((e) => e.dayKey && days.has(e.dayKey)), ...comingDays].filter((i) => {
    if (ids.has(i.id)) return false;
    ids.add(i.id);
    return true;
  });
  const items: FeedItem[] = [...feed, ...extra];

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
 * Today and the next six days (the day picker), and the weekend days that
 * are not over: on Monday–Friday the coming Friday to Sunday, on Saturday
 * Saturday and Sunday, on Sunday just Sunday. (Iceland is on UTC, so UTC
 * dates are local dates.)
 */
function makeCalendar(now: Date): Calendar {
  const dayAfter = (offset: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const keys = Array.from({ length: DAYS_AHEAD + 1 }, (_, offset) => dayAfter(offset));
  const days = keys.map((key, offset) => {
    const iso = `${key}T12:00:00Z`;
    const parts = dateParts(iso);
    return {
      key,
      weekday: parts.weekday,
      note: offset === 0 ? "í dag" : `${parts.day}. ${parts.month}`,
      label: formatDay(iso, now),
    };
  });

  const day = now.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const fromToday = day === 0 ? [0] : day === 6 ? [0, 1] : [5 - day, 6 - day, 7 - day];
  const weekend = fromToday.map(dayAfter);
  const headings = Object.fromEntries(
    [...new Set([...keys, ...weekend])].map((d) => [d, formatDayHeading(`${d}T12:00:00Z`, now)]),
  );
  return { today: keys[0], days, weekend, headings };
}
