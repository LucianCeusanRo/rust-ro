// Tests for assets/discord.js using a MOCKED fetch only — no real network request is ever made.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const D = require("../assets/discord.js");

// fake (structurally valid) webhook — not a real one
const FAKE = "https://discord.com/api/webhooks/123456789012345678/" + "A".repeat(68);
let pass = 0, fail = 0;
const out = [];
const t = async (name, fn) => { try { await fn(); pass++; out.push("✔ " + name); } catch (e) { fail++; out.push("✘ " + name + ": " + e.message); } };

// guard: any real network use fails the run
globalThis.fetch = () => { throw new Error("real fetch must never be called in tests"); };
const logged = [];
for (const k of ["log", "info", "warn", "error", "debug"]) { const orig = console[k]; console[k] = (...a) => { logged.push(a.join(" ")); }; console[k].orig = orig; }

function mockFetch(responses) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const r = responses.shift() || { status: 204 };
    return { status: r.status, ok: r.status >= 200 && r.status < 300, headers: { get: (n) => (r.headers || {})[n] ?? null }, json: async () => r.json || {} };
  };
  fn.calls = calls;
  return fn;
}
let clock = 0;
const sleeps = [];
const fakeTime = { now: () => clock, sleep: async (ms) => { sleeps.push(ms); clock += ms; } };

await t("accepts discord.com webhook URLs", () => { assert.ok(D.validate(FAKE).ok); assert.ok(D.validate(FAKE.replace("discord.com", "canary.discord.com")).ok); });
await t("rejects non-discord / http / malformed URLs", () => {
  for (const u of ["", "http://discord.com/api/webhooks/123456789012345678/" + "A".repeat(68), "https://evil.example/api/webhooks/123456789012345678/" + "A".repeat(68),
    "https://discord.com/api/webhooks/123/abc", "https://discord.com.evil.io/api/webhooks/123456789012345678/" + "A".repeat(68), FAKE + "/extra"]) assert.equal(D.validate(u).ok, false, u);
});
await t("mask hides the token", () => { const m = D.mask(FAKE); assert.ok(!m.includes("A".repeat(10))); assert.ok(m.endsWith("AAAA")); });
await t("test payload: one embed, no mentions", () => { const p = D.payload("test", {}, "ro"); assert.equal(p.embeds.length, 1); assert.deepEqual(p.allowed_mentions, { parse: [] }); });
await t("quiz payload has score + percent", () => { const p = D.payload("quiz", { title: "Ownership", score: 7, total: 8 }, "en"); assert.match(p.embeds[0].description, /7\/8.*88%/); });
await t("converter payload is a rust code block within Discord limits", () => {
  const p = D.payload("converter", { lang: "python", code: "fn main() {}\n".repeat(1000) }, "en");
  assert.ok(p.embeds[0].description.startsWith("```rust\n")); assert.ok(p.embeds[0].description.length <= 4096);
});
await t("send() posts JSON to the given webhook only", async () => {
  const f = mockFetch([{ status: 204 }]);
  const c = D.createClient({ fetch: f, ...fakeTime });
  const r = await c.send(FAKE, "test", {}, "en");
  assert.ok(r.ok); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].url, FAKE + "?wait=true"); assert.equal(f.calls[0].init.method, "POST");
});
await t("send() refuses invalid URLs without calling fetch", async () => {
  const f = mockFetch([]); const c = D.createClient({ fetch: f, ...fakeTime });
  const r = await c.send("https://example.com/hook", "test", {}, "en"); assert.equal(r.ok, false); assert.equal(f.calls.length, 0);
});
await t("429 → waits retry_after then retries", async () => {
  sleeps.length = 0;
  const f = mockFetch([{ status: 429, json: { retry_after: 2.5 } }, { status: 204 }]);
  const c = D.createClient({ fetch: f, ...fakeTime });
  const r = await c.send(FAKE, "quiz", { title: "x", score: 1, total: 2 }, "en");
  assert.ok(r.ok); assert.equal(f.calls.length, 2); assert.ok(sleeps.some((s) => s >= 2500), "slept " + sleeps);
});
await t("X-RateLimit-Remaining: 0 delays the next post", async () => {
  sleeps.length = 0;
  const f = mockFetch([{ status: 204, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset-After": "3" } }, { status: 204 }]);
  const c = D.createClient({ fetch: f, ...fakeTime });
  await Promise.all([c.send(FAKE, "test", {}, "en"), c.send(FAKE, "test", {}, "en")]);
  assert.equal(f.calls.length, 2); assert.ok(sleeps.some((s) => s >= 3000), "slept " + sleeps);
});
await t("posts are serialized with a minimum gap", async () => {
  sleeps.length = 0;
  const f = mockFetch([{ status: 204 }, { status: 204 }, { status: 204 }]);
  const c = D.createClient({ fetch: f, ...fakeTime });
  await Promise.all([1, 2, 3].map(() => c.send(FAKE, "test", {}, "en")));
  assert.equal(f.calls.length, 3); assert.ok(sleeps.filter((s) => s >= 1000).length >= 2, "slept " + sleeps);
});
await t("gives up after 3 attempts of 429", async () => {
  const f = mockFetch([{ status: 429, json: { retry_after: 1 } }, { status: 429, json: { retry_after: 1 } }, { status: 429, json: { retry_after: 1 } }]);
  const c = D.createClient({ fetch: f, ...fakeTime });
  const r = await c.send(FAKE, "test", {}, "en"); assert.equal(r.ok, false); assert.equal(r.error, "ratelimited");
});
await t("404 reports invalid webhook", async () => {
  const f = mockFetch([{ status: 404 }]); const c = D.createClient({ fetch: f, ...fakeTime });
  const r = await c.send(FAKE, "test", {}, "en"); assert.equal(r.error, "invalid");
});
await t("store keeps the URL only in the provided storage", () => {
  const mem = {}; const storage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
  const s = D.makeStore(storage); s.save({ url: FAKE, quizzes: true }); assert.equal(s.load().url, FAKE); assert.equal(s.load().lessons, false);
  s.clear(); assert.equal(s.load().url, "");
});
await t("nothing logged the webhook URL", () => assert.ok(!logged.some((l) => l.includes("A".repeat(20)))));

for (const k of ["log", "info", "warn", "error", "debug"]) console[k] = console[k].orig;
const summary = out.join("\n") + `\n\nTotal: ${pass + fail}, passed: ${pass}, failed: ${fail} (fetch was mocked; no network requests)\n`;
console.log(summary);
const fs = await import("node:fs");
fs.writeFileSync(new URL("../docs/discord-test.txt", import.meta.url), summary);
process.exit(fail ? 1 : 0);
