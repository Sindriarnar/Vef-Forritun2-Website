import { Suspense } from "react";
import { Feed } from "@/components/home/Feed";
import { NoData } from "@/components/shared/NoData";
import { getFeed } from "@/lib/feed";
import { formatDay, formatLongDate, formatTime } from "@/lib/format";
import { getLastUpdated, getSourceNames } from "@/lib/queries";

export default function Home() {
  return (
    <div className="page-shell">
      {/* Data comes from the database at request time, so it streams in. */}
      <Suspense fallback={<p className="loading">Sæki dagskrá dagsins…</p>}>
        <FeedData />
      </Suspense>
    </div>
  );
}

async function FeedData() {
  const [items, lastUpdated, sources] = await Promise.all([getFeed(), getLastUpdated(), getSourceNames()]);
  if (!lastUpdated) return <NoData />;
  return (
    <Feed
      items={items}
      todayLabel={formatLongDate(new Date().toISOString())}
      updatedLabel={`${formatDay(lastUpdated)} kl. ${formatTime(lastUpdated)}`}
      sources={sources}
    />
  );
}
