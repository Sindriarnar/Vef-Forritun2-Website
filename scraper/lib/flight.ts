/**
 * Helpers for sites built with Next.js (App Router). Those pages embed
 * their data in the React Server Components payload: a series of
 * `self.__next_f.push([1, "..."])` scripts. The strings are JSON-escaped
 * and together form a text blob in which the original data objects appear
 * as plain JSON, e.g. `"boxOfficeData":{...}` or `"initialEvents":[...]`.
 */

/** Concatenates the strings pushed into `self.__next_f` (the RSC payload). */
export function readFlightData(html: string): string {
  const pattern = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let text = "";
  for (const match of html.matchAll(pattern)) {
    try {
      text += JSON.parse(match[1]);
    } catch {
      // Skip a chunk we cannot decode rather than failing the whole page.
    }
  }
  return text;
}

/** Every `"key":{...}` (or `"key":[...]` with bracket "[") in the text, JSON-parsed. */
export function* findJsonValues<T>(text: string, key: string, bracket: "{" | "[" = "{"): Generator<T> {
  const needle = `"${key}":${bracket}`;
  let from = 0;
  while (true) {
    const at = text.indexOf(needle, from);
    if (at === -1) return;
    const start = at + needle.length - 1;
    const end = matchingBracket(text, start);
    if (end === -1) return;
    try {
      yield JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      // not valid JSON (e.g. cut-off chunk) — skip it
    }
    from = end + 1;
  }
}

/** Index of the bracket that closes the one at `start`, skipping strings. */
function matchingBracket(text: string, start: number): number {
  const open = text[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
