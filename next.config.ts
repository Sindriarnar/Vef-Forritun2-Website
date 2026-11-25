import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * Opening the dev server from another device, e.g. a phone through VS
 * Code's port forwarding (xxxx-3000.eun1.devtunnels.ms). Only used by
 * `next dev`; production keeps the strict same-origin check.
 *
 * - allowedDevOrigins: lets the tunnel address load the dev scripts.
 *   "**" matches any number of subdomain levels ("*" only matches one).
 * - serverActions.allowedOrigins: the tunnel sends X-Forwarded-Host as the
 *   tunnel address but rewrites Origin to localhost:3000, so Next sees a
 *   mismatch and rejects Server Actions ("Invalid Server Actions request")
 *   unless that origin is allowed.
 */
const DEV_TUNNELS = ["**.devtunnels.ms"];
const TUNNEL_REWRITTEN_ORIGIN = `localhost:${process.env.PORT ?? 3000}`;

export default function config(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    cacheComponents: true,
    partialPrefetching: true,
    ...(dev && {
      allowedDevOrigins: DEV_TUNNELS,
      experimental: { serverActions: { allowedOrigins: [TUNNEL_REWRITTEN_ORIGIN, ...DEV_TUNNELS] } },
    }),
  };
}
