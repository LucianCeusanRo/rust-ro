/* Rust RO — optional Discord webhook integration (opt-in, per browser).
 * - The webhook URL is stored ONLY in this browser's localStorage. It is never sent anywhere
 *   except to discord.com when YOU click "Test" or when an opted-in event happens.
 * - The URL is never logged (no console output contains it) and never shipped in the repo.
 * - Rate limits: sequential queue, ≥1.2 s between posts, honours X-RateLimit-* headers and 429 retry_after.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RustDiscord = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const KEY = "rustro.discord.v1";
  const URL_RE = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d{17,21}\/[A-Za-z0-9_-]{50,100}$/;
  const COLOR = 0xdea584; // Rust orange-ish
  const MIN_GAP_MS = 1200;

  function validate(url) {
    if (typeof url !== "string") return { ok: false, reason: "empty" };
    const u = url.trim();
    if (!u) return { ok: false, reason: "empty" };
    if (!/^https:\/\//.test(u)) return { ok: false, reason: "https" };
    if (!URL_RE.test(u)) return { ok: false, reason: "format" };
    return { ok: true, url: u };
  }

  function mask(url) {
    const v = validate(url);
    if (!v.ok) return "";
    const parts = v.url.split("/");
    const token = parts.pop();
    const id = parts.pop();
    return "discord.com/api/webhooks/" + id.slice(0, 4) + "…/" + "•".repeat(6) + token.slice(-4);
  }

  function makeStore(storage) {
    return {
      load() {
        try { return Object.assign({ url: "", lessons: false, quizzes: false, converter: false }, JSON.parse(storage.getItem(KEY) || "{}")); }
        catch (e) { return { url: "", lessons: false, quizzes: false, converter: false }; }
      },
      save(cfg) { storage.setItem(KEY, JSON.stringify({ url: cfg.url || "", lessons: !!cfg.lessons, quizzes: !!cfg.quizzes, converter: !!cfg.converter })); },
      clear() { storage.removeItem(KEY); }
    };
  }

  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  function payload(kind, data, lang) {
    const ro = lang !== "en";
    const base = { username: "Rust RO", allowed_mentions: { parse: [] } };
    const footer = { text: "Rust RO · " + (ro ? "învăț Rust" : "learning Rust") };
    const ts = new Date().toISOString();
    let embed;
    if (kind === "test") {
      embed = { title: ro ? "✅ Webhook conectat" : "✅ Webhook connected", description: ro ? "Acesta este un mesaj de test trimis din Rust RO, la cererea ta." : "This is a test message sent from Rust RO because you clicked Test.", color: COLOR };
    } else if (kind === "lesson") {
      embed = { title: (ro ? "🦀 Lecție terminată: " : "🦀 Lesson completed: ") + clip(String(data.title), 200), description: (ro ? "Progres: " : "Progress: ") + data.done + "/" + data.total, color: COLOR };
    } else if (kind === "quiz") {
      const pct = Math.round((100 * data.score) / data.total);
      embed = { title: (ro ? "📝 Quiz: " : "📝 Quiz: ") + clip(String(data.title), 200), description: `**${data.score}/${data.total}** (${pct}%) ${pct >= 70 ? "✅" : "🔁"}`, color: pct >= 70 ? 0x3fb950 : 0xd29922 };
    } else if (kind === "converter") {
      const code = clip(String(data.code || ""), 3500).replace(/```/g, "ˋˋˋ");
      embed = { title: (ro ? "🔄 Conversie " : "🔄 Converted ") + (data.lang === "java" ? "Java" : "Python") + " → Rust", description: "```rust\n" + code + "\n```", color: COLOR,
        fields: [{ name: ro ? "Atenție" : "Note", value: ro ? "Ciornă automată (fără AI) — de verificat cu cargo check." : "Automatic draft (no AI) — review with cargo check.", inline: false }] };
    } else throw new Error("unknown kind");
    embed.footer = footer;
    embed.timestamp = ts;
    return Object.assign(base, { embeds: [embed] });
  }

  function createClient(opts) {
    const fetchFn = opts.fetch;
    const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
    const now = opts.now || (() => Date.now());
    let chain = Promise.resolve();
    let nextAllowed = 0;

    async function post(url, body) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const wait = nextAllowed - now();
        if (wait > 0) await sleep(wait);
        let res;
        try {
          res = await fetchFn(url + "?wait=true", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        } catch (e) {
          return { ok: false, error: "network" };
        }
        nextAllowed = now() + MIN_GAP_MS;
        const h = (n) => (res.headers && res.headers.get ? res.headers.get(n) : null);
        const remaining = h("X-RateLimit-Remaining");
        const resetAfter = parseFloat(h("X-RateLimit-Reset-After") || "0");
        if (remaining === "0" && resetAfter > 0) nextAllowed = Math.max(nextAllowed, now() + resetAfter * 1000);
        if (res.status === 429) {
          let retry = 1;
          try { const j = await res.json(); retry = Number(j.retry_after) || retry; } catch (e) { /* ignore */ }
          retry = Math.min(retry, 60);
          nextAllowed = now() + retry * 1000 + 100;
          continue;
        }
        if (res.ok) return { ok: true, status: res.status };
        return { ok: false, status: res.status, error: res.status === 401 || res.status === 404 ? "invalid" : "http" };
      }
      return { ok: false, error: "ratelimited" };
    }

    return {
      send(url, kind, data, lang) {
        const v = validate(url);
        if (!v.ok) return Promise.resolve({ ok: false, error: "url:" + v.reason });
        const body = payload(kind, data || {}, lang);
        const p = chain.then(() => post(v.url, body));
        chain = p.catch(() => {});
        return p;
      }
    };
  }

  return { validate, mask, payload, makeStore, createClient, KEY };
});
