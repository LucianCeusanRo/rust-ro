// Verifies every Rust snippet and every code-based quiz question with rustc / cargo.
//  - lesson sections: must compile (and run without panic) unless marked fails: "E0xxx" (then that exact error)
//  - exercises/labs: starter compiles (or fails with starterFails); solution compiles, runs and, if `expect`
//    is set, prints exactly that (trimmed)
//  - bank questions with k:"out": stdout (trimmed) must equal the first (correct) option, in both languages,
//    and no wrong option may equal it; k:"err": must fail with exactly `err`; k:"ok": compiles and runs
//  - games: fill-in snippets (answer substituted) must compile+run; "type" items: the correct type compiles,
//    every wrong type must fail to compile
//  - snippets with crate: "tokio" | "axum" | "clap" | "wasm-bindgen" | "serde" are built with cargo in
//    tools/verify-crates (a project with those dependencies)
// Usage: node tools/check-snippets.mjs [--only l7,l8] [--jobs 8]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawn } from "node:child_process";
import vm from "node:vm";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const jobs = args.includes("--jobs") ? +args[args.indexOf("--jobs") + 1] : Math.max(2, os.cpus().length);
const ctx = { window: {} };
ctx.QB = (...a) => ctx.window.QB(...a);
vm.createContext(ctx);
const files = fs.readdirSync(path.join(root, "content")).filter((f) => f.endsWith(".js")).sort();
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, "content", f), "utf8"), ctx, { filename: f });
const W = ctx.window;
const items = [];
const want = (cat) => !only || only.includes(cat);
for (const l of W.RUST_LESSONS) {
  if (!want("l" + l.id)) continue;
  l.sections.forEach((s, i) => s.code && items.push({ id: `L${l.id}.s${i + 1}`, src: s.code, fails: s.fails, crate: s.crate, test: s.test, noRun: s.noRun || s.crate === "axum" }));
  (l.exercises || []).forEach((e, i) => {
    items.push({ id: `L${l.id}.lab${i + 1}.starter`, src: e.starter, fails: e.starterFails, crate: e.crate, noRun: true });
    items.push({ id: `L${l.id}.lab${i + 1}.solution`, src: e.solution, crate: e.crate, expect: e.expect, noRun: e.noRun, test: e.test });
    if (e.alsoTest) items.push({ id: `L${l.id}.lab${i + 1}.tests`, src: e.solution, test: true });
  });
}
for (const q of W.RUST_BANK) {
  if (!q.code || !want(q.c)) continue;
  const it = { id: `Q.${q.id}`, src: q.code, crate: q.crate, test: q.k === "test" };
  if (q.k === "err") it.fails = q.err;
  else if (q.k === "out") { it.expect = q.o.en[0]; it.expectRo = q.o.ro[0]; it.wrong = q.o.en.slice(1).concat(q.o.ro.slice(1)); }
  else if (q.k === "ok" || q.k === "test") {} else it.noRun = true;
  items.push(it);
}
const G = W.RUST_GAMES || {};
if (!only || only.includes("games")) {
  (G.fill || []).forEach((g, i) => {
    items.push({ id: `G.fill${i + 1}`, src: g.c.replace("___", g.a), expect: g.expect, noRun: g.noRun });
    (g.w || []).forEach((w, j) => items.push({ id: `G.fill${i + 1}.no${j + 1}`, src: g.c.replace("___", w), notExpect: g.expect }));
  });
  (G.types || []).forEach((g, i) => {
    const prog = (t) => `${g.pre || ""}\nfn main() {\n    let _x: ${t} = ${g.e};\n}`;
    items.push({ id: `G.type${i + 1}.ok`, src: prog(g.t), noRun: true });
    g.w.forEach((w, j) => items.push({ id: `G.type${i + 1}.no${j + 1}`, src: prog(w), failsAny: true }));
  });
}
if (!only || only.includes("net")) for (const n of W.RUST_NET || []) items.push({ id: `NET.${n.id}`, src: n.code, noRun: true });
if (!only || only.includes("why")) for (const b of W.RUST_WHY_SNIPPETS || []) items.push({ id: `WHY.${b.id}`, src: b.code, noRun: true });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rustro-"));
const run = (cmd, argv, opts = {}) => new Promise((res) => {
  const p = spawn(cmd, argv, { cwd: opts.cwd });
  let out = "", err = "", done = false;
  const t = setTimeout(() => { if (!done) { p.kill("SIGKILL"); err += "\nTIMEOUT"; } }, opts.timeout || 60000);
  p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
  p.on("close", (code) => { done = true; clearTimeout(t); res({ code, out, err }); });
});
function judge(it, comp, exec) {
  if (it.failsAny) return comp.code !== 0 ? "FAILS as expected" : "UNEXPECTED: wrong type compiled";
  if (it.notExpect != null) {
    if (comp.code !== 0) return "FAILS as expected (wrong option)";
    const g = exec ? exec.out.trim() : "";
    return exec && (exec.code !== 0 || g !== it.notExpect.trim()) ? "FAILS as expected (different output)" : "UNEXPECTED: wrong option prints the expected output";
  }
  if (it.fails) return comp.code !== 0 && comp.err.includes(`error[${it.fails}]`) ? `FAILS as expected (${it.fails})` : `UNEXPECTED: wanted ${it.fails}\n${comp.err.slice(0, 1500)}`;
  if (comp.code !== 0) return "COMPILE ERROR\n" + comp.err.slice(0, 3000);
  if (it.noRun) return "compiles";
  if (exec.code !== 0) return "RUNTIME FAIL\n" + exec.err.slice(0, 1500);
  const got = exec.out.replace(/\s+$/, "").replace(/^\s+/, "");
  if (it.test) return /test result: ok/.test(exec.out) ? "tests pass" : "TESTS FAILED\n" + exec.out;
  if (it.expect != null) {
    if (got !== it.expect.trim()) return `OUTPUT MISMATCH\n--- expected\n${it.expect}\n--- got\n${got}`;
    if (it.expectRo != null && got !== it.expectRo.trim()) return `OUTPUT MISMATCH (ro)\n${it.expectRo}`;
    if (it.wrong && it.wrong.some((w) => w.trim() === got)) return "A WRONG OPTION EQUALS THE OUTPUT";
    return "compiles + runs + output ✓";
  }
  return "compiles + runs";
}
async function checkRustc(it) {
  const file = path.join(tmp, it.id.replace(/\W/g, "_") + ".rs"), bin = file.replace(/\.rs$/, "");
  fs.writeFileSync(file, it.src + "\n");
  const comp = await run("rustc", ["--edition", "2021", "-A", "warnings", ...(it.test ? ["--test"] : []), "-o", bin, file]);
  let exec = null;
  if (comp.code === 0 && !it.noRun && !it.fails && !it.failsAny) exec = await run(bin, [], { timeout: 15000 });
  if (exec && exec.err.includes("TIMEOUT") && it.notExpect != null) exec.code = 1;
  return judge(it, comp, exec);
}
const vdir = path.join(root, "tools", "verify-crates");
async function checkCargo(list) {
  const bdir = path.join(vdir, "src", "bin");
  fs.rmSync(bdir, { recursive: true, force: true }); fs.mkdirSync(bdir, { recursive: true });
  const name = (it) => it.id.replace(/\W/g, "_").toLowerCase();
  const res = {};
  for (const it of list) fs.writeFileSync(path.join(bdir, name(it) + ".rs"), it.src + "\n");
  for (const it of list) {
    const comp = await run("cargo", ["build", "-q", "--bin", name(it)], { cwd: vdir, timeout: 600000 });
    let exec = null;
    if (comp.code === 0 && !it.noRun && !it.fails) exec = await run(path.join(vdir, "target", "debug", name(it)), [], { timeout: 15000 });
    res[it.id] = judge(it, comp, exec);
  }
  return res;
}
const plain = items.filter((i) => !i.crate), crated = items.filter((i) => i.crate);
const results = {};
let k = 0;
await Promise.all(Array.from({ length: jobs }, async () => { while (k < plain.length) { const it = plain[k++]; results[it.id] = await checkRustc(it); } }));
if (crated.length) Object.assign(results, await checkCargo(crated));
let ok = 0, bad = 0;
const report = [];
for (const it of items) {
  const st = results[it.id];
  const good = /^(FAILS as expected|compiles|tests pass)/.test(st);
  good ? ok++ : bad++;
  report.push(`${good ? "✔" : "✘"} ${it.id.padEnd(26)} ${st.split("\n")[0]}`);
  if (!good) console.error("✘ " + it.id + "\n" + st + "\n");
}
const rv = execFileSync("rustc", ["--version"], { encoding: "utf8" }).trim();
const q = W.RUST_BANK;
const summary = `Lessons: ${W.RUST_LESSONS.length} · questions: ${q.length} (code-verified: ${q.filter((x) => x.code).length}) · labs: ${W.RUST_LESSONS.reduce((a, l) => a + (l.exercises || []).length, 0)}`;
const out = `# Snippet check (${rv})\n${summary}\n\n${report.join("\n")}\n\nTotal checks: ${items.length}, ok: ${ok}, failed: ${bad}\n`;
if (!only) fs.writeFileSync(path.join(root, "docs", "snippet-check.txt"), out);
console.log(only ? report.join("\n") + `\n${summary}\nok ${ok} failed ${bad}` : out.split("\n").slice(0, 2).join("\n") + `\nTotal checks: ${items.length}, ok: ${ok}, failed: ${bad}`);
process.exit(bad ? 1 : 0);
