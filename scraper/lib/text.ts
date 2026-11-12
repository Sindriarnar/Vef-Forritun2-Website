/** Collapse whitespace and remove soft hyphens / zero-width characters from scraped text. */
export function clean(text: string | undefined | null): string {
  return (text ?? "").replace(/[­​-‍﻿]/g, "").replace(/\s+/g, " ").trim();
}

/** Minimal shape of a cheerio/domhandler node, enough to walk the tree. */
interface DomNode {
  type: string;
  data?: string;
  children?: DomNode[];
}

/**
 * All text under the given nodes in reading order, with a space at every
 * element boundary. Unlike cheerio's .text(), "<p>Opið:</p><p>12:00</p>"
 * becomes "Opið: 12:00" instead of "Opið:12:00".
 */
export function spacedText(nodes: DomNode[]): string {
  const parts: string[] = [];
  const walk = (node: DomNode) => {
    if (node.type === "text") {
      parts.push(node.data ?? "");
    } else if (node.type === "tag" && node.children) {
      parts.push(" ");
      node.children.forEach(walk);
      parts.push(" ");
    }
  };
  nodes.forEach(walk);
  return clean(parts.join(""));
}

/** Make a possibly-relative URL absolute. */
export function absoluteUrl(href: string | undefined | null, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/**
 * Icelandic local time -> ISO-8601 UTC. Iceland is UTC+0 all year, so
 * "2026-11-09 14:20:00" simply becomes "2026-11-09T14:20:00Z".
 * Returns null for anything that does not look like a date.
 */
export function icelandTimeToIso(local: string | undefined | null): string | null {
  const m = (local ?? "").match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return `${m[1]}T${m[2]}:${m[3]}:${m[4] ?? "00"}Z`;
}

// The key that recognises the same movie across sites lives in
// src/lib/match.ts, because the website uses it too.
export { matchKey } from "../../src/lib/match";

/** Normalise any ISO date string to the "YYYY-MM-DDTHH:MM:SSZ" format. */
export function normaliseIso(value: string | undefined | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
