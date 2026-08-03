import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SOURCE_PATH, SOURCE_SHA256 } from "./paths.js";

describe("diary source text", () => {
  it("matches the expected Project Gutenberg #4200 checksum", () => {
    const actual = createHash("sha256")
      .update(readFileSync(SOURCE_PATH))
      .digest("hex");
    expect(actual).toBe(SOURCE_SHA256);
  });
});
