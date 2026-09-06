import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import { cloudflareIpKeyGenerator } from "./cloudflare.js";

describe("cloudflareIpKeyGenerator", () => {
  it("uses the CF-Connecting-IP header when present", () => {
    const req = {
      headers: { "cf-connecting-ip": "203.0.113.9" },
      ip: "172.20.0.3",
    } as FastifyRequest;
    expect(cloudflareIpKeyGenerator(req)).toBe("203.0.113.9");
  });

  it("falls back to req.ip when the header is absent", () => {
    const req = { headers: {}, ip: "127.0.0.1" } as FastifyRequest;
    expect(cloudflareIpKeyGenerator(req)).toBe("127.0.0.1");
  });
});
