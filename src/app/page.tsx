import { Suspense } from "react";
import { Feed } from "@/components/Feed";
import { NoData } from "@/components/NoData";
import { getFeed } from "@/lib/feed";
import { formatDay, formatTime } from "@/lib/format";
import { getLastUpdated, getSourceNames } from "@/lib/queries";

export default function Home() {
  return (
    <div className="page-shell">
      {/* Data comes from the database at request time, so it streams in. */}
      <Suspense fallback={<p className="loading">Hleð inn hugmyndum…</p>}>
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
      updatedLabel={`${formatDay(lastUpdated)} kl. ${formatTime(lastUpdated)}`}
      sources={sources}
    />
  );
}
