import * as cheerio from "cheerio";
import type { Source } from "../types";
import { findAddress, parseWeeklyHours } from "../lib/schedule";
import { absoluteUrl, spacedText } from "../lib/text";

/**
 * Places to go that publish weekly opening hours as text: ice skating,
 * bowling, climbing. Each one is a tiny source built from a config, so
 * adding another such place is a few lines (find the page with the
 * hours, and a word that comes right before them).
 */

interface VenueConfig {
  slug: string;
  name: string; // the source's name, e.g. "Skautahöllin"
  baseUrl: string;
  hoursUrl: string; // page that lists the opening hours
  infoUrl?: string; // where the user goes (defaults to hoursUrl)
  title: string;
  subtitle: string;
  marker: string; // lower-case text right before the hours
  stopAt?: string; // lower-case text where the hours end
  maxLength?: number;
}

function venueSource(config: VenueConfig): Source {
  return {
    slug: config.slug,
    name: config.name,
    baseUrl: config.baseUrl,

    async scrape(http) {
      const html = await http.getText(config.hoursUrl);
      const $ = cheerio.load(html);
      $("script, style, noscript").remove();
      const text = spacedText($("body").get());

      const occurrences = parseWeeklyHours(text, {
        marker: config.marker,
        stopAt: config.stopAt,
        maxLength: config.maxLength,
        now: new Date(),
        venue: config.title,
      });
      if (occurrences.length === 0) {
        throw new Error(`${config.name}: no opening hours found after "${config.marker}" — page changed?`);
      }

      return [
        {
          externalId: config.slug,
          category: "activity",
          title: config.title,
          subtitle: config.subtitle,
          url: config.infoUrl ?? config.hoursUrl,
          imageUrl: absoluteUrl($('meta[property="og:image"]').attr("content"), config.baseUrl),
          provider: config.title,
          venue: config.title,
          venueDetails: { address: findAddress(text) },
          occurrences,
        },
      ];
    },
  };
}

/** Skautahöllin í Laugardal — public skating sessions ("Almennur opnunartími"). */
export const skautaholl = venueSource({
  slug: "skautaholl",
  name: "Skautahöllin",
  baseUrl: "https://www.skautaholl.is",
  hoursUrl: "https://www.skautaholl.is/opnunartimi",
  title: "Skautahöllin í Laugardal",
  subtitle: "Almennir skautatímar",
  marker: "almennur opnunartími",
  maxLength: 900,
});

/**
 * Keiluhöllin Egilshöll — bowling. The hours block reads
 * "Keila Mán - Sun Opið allan daginn Sportbarinn Mán - Mið 17:00 - 22:00 ...":
 * the first "keila" that is followed by days and hours is used, and the
 * sports bar's hours right after it are skipped.
 */
export const keiluhollin = venueSource({
  slug: "keiluhollin",
  name: "Keiluhöllin",
  baseUrl: "https://www.keiluhollin.is",
  hoursUrl: "https://www.keiluhollin.is/about",
  infoUrl: "https://www.keiluhollin.is/",
  title: "Keiluhöllin Egilshöll",
  subtitle: "Keila, pizza og shake",
  marker: "keila",
  stopAt: "sportbarinn",
});

/** Klifurhúsið — climbing and bouldering (hours are in the site footer). */
export const klifurhusid = venueSource({
  slug: "klifurhusid",
  name: "Klifurhúsið",
  baseUrl: "https://klifurhusid.is",
  hoursUrl: "https://klifurhusid.is/",
  title: "Klifurhúsið",
  subtitle: "Klifur og grjótglíma",
  marker: "opnunartímar",
});
