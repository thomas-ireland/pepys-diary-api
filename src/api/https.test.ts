import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { Server as HttpServer } from "node:http";
import { Server as HttpsServer } from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

/**
 * Own file, own app instances (built and closed per test) -- unlike
 * server.test.ts's shared app, these mutate process.env, so isolation
 * matters here more than reuse.
 */
describe("HTTPS support", () => {
  let dir: string;
  let certPath: string;
  let keyPath: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "pepys-tls-"));
    certPath = path.join(dir, "cert.pem");
    keyPath = path.join(dir, "key.pem");
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "1",
        "-subj",
        "/CN=localhost",
      ],
      // Otherwise openssl's key-generation progress dots print to the test
      // output.
      { stdio: "ignore" },
    );
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  afterEach(() => {
    delete process.env.TLS_CERT_PATH;
    delete process.env.TLS_KEY_PATH;
  });

  it("serves plain HTTP when TLS_CERT_PATH/TLS_KEY_PATH are unset", async () => {
    const app = await buildServer({ logger: false });
    expect(app.server).toBeInstanceOf(HttpServer);
    expect(app.server).not.toBeInstanceOf(HttpsServer);
    await app.close();
  });

  it("serves HTTPS when both are set", async () => {
    process.env.TLS_CERT_PATH = certPath;
    process.env.TLS_KEY_PATH = keyPath;
    const app = await buildServer({ logger: false });
    expect(app.server).toBeInstanceOf(HttpsServer);
    await app.close();
  });
});
