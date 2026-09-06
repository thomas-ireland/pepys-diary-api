import type { FastifyRequest } from "fastify";

/**
 * Trustworthy only because the Lightsail firewall restricts inbound traffic
 * to Cloudflare's published IP ranges and Caddy enforces Authenticated
 * Origin Pulls -- see CLAUDE.md's Deployment section. Nothing else can reach
 * this app, and Cloudflare always overwrites this header with the real
 * visitor's IP rather than passing through a client-supplied value, so a
 * request that gets this far can't have spoofed it.
 *
 * Without this, every request's req.ip is Caddy's own address (it's the
 * thing directly connecting to the app), so every visitor would share one
 * rate-limit bucket instead of getting their own.
 */
export function cloudflareIpKeyGenerator(req: FastifyRequest): string {
  const cfConnectingIp = req.headers["cf-connecting-ip"];
  return typeof cfConnectingIp === "string" ? cfConnectingIp : req.ip;
}
