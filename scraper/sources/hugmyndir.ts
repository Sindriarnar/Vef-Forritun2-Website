import { IDEAS } from "../content/ideas";
import type { Source } from "../types";

/**
 * Our own ideas (scraper/content/ideas.ts). Not scraped from anywhere:
 * this "source" just loads the list into the database so the website can
 * show ideas next to scraped data. Seasonal ideas are only included in
 * their months, so re-running the scraper keeps the list in season.
 */
export const hugmyndir: Source = {
  slug: "hugmyndir",
  name: "Hugmyndabankinn",
  baseUrl: "",

  async scrape() {
    const month = new Date().getUTCMonth() + 1;
    return IDEAS.filter((idea) => !idea.months || idea.months.includes(month)).map((idea) => ({
      externalId: idea.id,
      category: "idea" as const,
      title: idea.title,
      description: idea.text,
      url: idea.url ?? "",
      tags: idea.tags,
      minAge: null,
      audience: idea.family ? ("fjolskylda" as const) : null,
    }));
  },
};
