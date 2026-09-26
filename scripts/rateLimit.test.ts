import assert from "node:assert/strict";
import { clientIp, rateLimit } from "../src/lib/rateLimit.js";

const WINDOW = 60_000;

// Allows up to the limit, then blocks.
for (let i = 1; i <= 3; i++) {
  assert.equal(rateLimit("a", 3, WINDOW).allowed, true, `call ${i} should pass`);
}
const blocked = rateLimit("a", 3, WINDOW);
assert.equal(blocked.allowed, false);
assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 60);

// Keys are independent.
assert.equal(rateLimit("b", 3, WINDOW).allowed, true);

// The window expires: a zero-length window always resets.
assert.equal(rateLimit("c", 1, 0).allowed, true);
assert.equal(rateLimit("c", 1, 0).allowed, true);

// Proxy header parsing.
const headers = (h: Record<string, string>) => new Request("https://x/", { headers: h });
assert.equal(clientIp(headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
assert.equal(clientIp(headers({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
assert.equal(clientIp(headers({})), "unknown");

console.log("rateLimit: all checks passed");
