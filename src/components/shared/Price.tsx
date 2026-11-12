import type { FeedItem } from "@/lib/feed-types";

/** "frá 1.990 kr. ~~3.730 kr.~~" — used on feed posts and in the details dialog. */
export function Price({ item }: { item: FeedItem }) {
  return (
    <span className="price">
      {item.priceNote === "frá" && <small>frá </small>}
      <strong>{item.priceLabel}</strong>
      {item.originalPriceLabel && <del>{item.originalPriceLabel}</del>}
    </span>
  );
}
