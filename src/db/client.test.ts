import { afterEach, describe, expect, it, vi } from "vitest";

describe("prisma client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("fails loudly when DATABASE_URL is missing rather than at first query", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.resetModules();
    await expect(import("./client.js")).rejects.toThrow(
      /DATABASE_URL is not set/,
    );
  });
});
