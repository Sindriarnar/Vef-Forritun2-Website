import { loadEnvConfig } from "@next/env";

// Load .env, .env.local, ... exactly like Next.js does, so the scraper
// and the website always use the same settings (e.g. DATABASE_PATH).
// Imported first in scraper/index.ts, before anything reads process.env.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
