import robotsParser from "robots-parser";

type Robots = ReturnType<typeof robotsParser>;

/**
 * A small "polite" HTTP client for the scraper:
 *  - identifies itself with SCRAPER_USER_AGENT
 *  - respects each site's robots.txt
 *  - waits SCRAPER_DELAY_MS between two requests to the same host
 *    (a source can ask for a shorter wait for its own site, see
 *    Source.requestDelayMs); requests made at the same time take turns
 *  - gives up after SCRAPER_TIMEOUT_MS
 */
export class PoliteHttp {
  private readonly userAgent: string;
  private readonly delayMs: number;
  private readonly timeoutMs: number;
  /** When the next request to each host may start (reserved slots, so parallel requests still take turns). */
  private readonly nextSlot = new Map<string, number>();
  private readonly hostDelays = new Map<string, number>();
  private readonly robotsCache = new Map<string, Robots | null>();

  constructor() {
    this.userAgent =
      process.env.SCRAPER_USER_AGENT ?? "HvadAdGeraBot/0.1 (student project)";
    this.delayMs = Number(process.env.SCRAPER_DELAY_MS ?? 2000);
    this.timeoutMs = Number(process.env.SCRAPER_TIMEOUT_MS ?? 20000);
  }

  /**
   * Use a different wait between requests for one site (e.g. a CDN-hosted
   * site whose own pages make the browser fetch dozens of pages at once).
   * Never less than 250 ms.
   */
  setHostDelay(baseUrl: string, delayMs: number) {
    this.hostDelays.set(new URL(baseUrl).host, Math.max(250, delayMs));
  }

  async getText(url: string): Promise<string> {
    const target = new URL(url);

    if (!(await this.isAllowed(target))) {
      throw new Error(`robots.txt disallows ${url}`);
    }

    await this.waitForTurn(target.host);

    const res = await fetch(target, {
      headers: {
        "user-agent": this.userAgent,
        // Plain browser-style Accept. (Offering application/json makes some
        // CMSs, e.g. keiluhollin.is, answer with a partial page.)
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "accept-language": "is,en;q=0.8",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    return res.text();
  }

  /** Whether a URL exists (HEAD request, same politeness rules as getText). */
  async exists(url: string): Promise<boolean> {
    const target = new URL(url);
    if (!(await this.isAllowed(target))) return false;
    await this.waitForTurn(target.host);
    try {
      const res = await fetch(target, {
        method: "HEAD",
        headers: { "user-agent": this.userAgent },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async isAllowed(url: URL): Promise<boolean> {
    const robots = await this.getRobots(url);
    if (!robots) return true;
    // robots-parser returns undefined when the URL is for another host.
    return robots.isAllowed(url.href, this.botName()) ?? true;
  }

  private async getRobots(url: URL): Promise<Robots | null> {
    if (this.robotsCache.has(url.origin)) {
      return this.robotsCache.get(url.origin) ?? null;
    }

    const robotsUrl = `${url.origin}/robots.txt`;
    let robots: Robots | null = null;
    try {
      await this.waitForTurn(url.host);
      const res = await fetch(robotsUrl, {
        headers: { "user-agent": this.userAgent },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const type = res.headers.get("content-type") ?? "";
      // No robots.txt (or an HTML error page instead of one) = no rules.
      if (res.ok && !type.includes("text/html")) {
        robots = robotsParser(robotsUrl, await res.text());
      }
    } catch {
      // Network problem fetching robots.txt: treat as no rules, the real
      // request will fail loudly anyway if the site is down.
    }

    this.robotsCache.set(url.origin, robots);
    return robots;
  }

  /** Our bot's name for robots.txt rules, e.g. "HvadAdGeraBot". */
  private botName(): string {
    return this.userAgent.match(/[A-Za-z]+Bot/)?.[0] ?? (this.userAgent.split(/[\s/]/)[0] || "*");
  }

  /**
   * Wait until this host's next free slot, and reserve it. Reserving
   * before waiting means requests started together (Promise.all) are
   * spaced out one delay apart instead of all going at once.
   */
  private async waitForTurn(host: string) {
    const now = Date.now();
    const slot = Math.max(now, this.nextSlot.get(host) ?? now);
    this.nextSlot.set(host, slot + (this.hostDelays.get(host) ?? this.delayMs));
    if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
  }
}
