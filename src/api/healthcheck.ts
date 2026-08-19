import http from "node:http";
import https from "node:https";

const port = Number(process.env.PORT ?? 3000);
const client = process.env.TLS_CERT_PATH ? https : http;

const req = client.get(
  {
    hostname: "127.0.0.1",
    port,
    path: "/health",
    // Loopback, from inside the same container as the server -- not a real
    // client, so skipping cert trust here doesn't weaken anything Cloudflare
    // or visitors actually rely on. Needed because Cloudflare's Origin CA
    // certificate isn't in Node's default trust store.
    rejectUnauthorized: false,
  },
  (res) => process.exit(res.statusCode === 200 ? 0 : 1),
);
req.on("error", () => process.exit(1));
