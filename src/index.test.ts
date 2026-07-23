import { describe, expect, it, vi } from "vitest";

describe("index", () => {
  it("logs that the app is ready", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("./index.js");

    expect(logSpy).toHaveBeenCalledWith("pepys-diary-api is ready");
  });
});
