/* Rust RO — content bootstrap. Every `code` / `starter` / `solution` snippet is a
 * complete program, compile-checked by tools/check-snippets.mjs. Snippets marked
 * `fails: "E0xxx"` are intentionally broken; the checker verifies that exact error.
 *
 * Question bank (window.RUST_BANK). Compact authoring format used by QB(cat, items):
 *   [question, [correct, wrong1, wrong2, ...], explanation, extra?]
 *   - text is plain (escaped when shown); `backticks` become <code>; "RO || EN" splits languages
 *   - the first option is the correct one; options are shuffled when shown
 *   - extra.c = a complete Rust program shown with the question
 *     extra.k = "out": the checker runs it and the correct option must equal stdout (trimmed)
 *     extra.k = "err": it must fail to compile with error code extra.err (e.g. "E0382")
 *     extra.k = "ok":  it must compile and run without panicking
 *     extra.crate = "tokio" | "axum" | ...: checked with cargo in a project with that crate */
window.RUST_LESSONS = [];
window.RUST_BANK = [];
window.RUST_C = (s, ...v) => String.raw(s, ...v).replace(/\\`/g, "`").replace(/^\n/, "").replace(/\s+$/, "");
window.RUST_SPLIT = (s) => { if (Array.isArray(s)) return { ro: s[0], en: s[1] }; const i = String(s).indexOf(" || "); return i < 0 ? { ro: s, en: s } : { ro: s.slice(0, i), en: s.slice(i + 4) }; };
window.QB = function (cat, items) {
  const B = window.RUST_BANK, S = window.RUST_SPLIT;
  const n0 = B.filter((q) => q.c === cat && !q.legacy).length;
  items.forEach((x, i) => {
    const ex = x[3] || {}, opts = x[1].map(S);
    B.push({ id: cat + "-" + (n0 + i + 1), c: cat, md: true, q: S(x[0]), o: { ro: opts.map((o) => o.ro), en: opts.map((o) => o.en) }, a: 0, e: S(x[2] || ""), code: ex.c || null, k: ex.k || null, err: ex.err || null, crate: ex.crate || null });
  });
};
