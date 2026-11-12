// Compile-checks every Rust snippet in content/*.js with rustc.
// Normal snippets must compile (and run without panicking, except starters that use todo!()).
// Snippets marked fails/starterFails must FAIL with exactly that error code.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import vm from "node:vm";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of fs.readdirSync(path.join(root, "content")).sort()) {
  if (f.endsWith(".js")) vm.runInContext(fs.readFileSync(path.join(root, "content", f), "utf8"), ctx, { filename: f });
}
const items = [];
for (const l of ctx.window.RUST_LESSONS || []) {
  l.sections.forEach((s, i) => s.code && items.push({ id: `L${l.id}.section${i + 1}`, src: s.code, fails: s.fails }));
  l.exercises.forEach((e, i) => {
    items.push({ id: `L${l.id}.ex${i + 1}.starter`, src: e.starter, fails: e.starterFails, starter: true });
    items.push({ id: `L${l.id}.ex${i + 1}.solution`, src: e.solution });
  });
}
for (const n of ctx.window.RUST_NET || []) items.push({ id: `NET.${n.id}`, src: n.code, noRun: true });
for (const b of ctx.window.RUST_WHY_SNIPPETS || []) items.push({ id: `WHY.${b.id}`, src: b.code, noRun: true });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rustro-"));
let ok = 0, bad = 0;
const report = [];
for (const it of items) {
  const file = path.join(tmp, it.id.replace(/\W/g, "_") + ".rs");
  const bin = file.replace(/\.rs$/, "");
  fs.writeFileSync(file, it.src + "\n");
  const r = spawnSync("rustc", ["--edition", "2021", "-A", "warnings", "-o", bin, file], { encoding: "utf8" });
  let status;
  if (it.fails) {
    status = r.status !== 0 && r.stderr.includes(`error[${it.fails}]`) ? `FAILS as expected (${it.fails})` : `UNEXPECTED: wanted ${it.fails}\n${r.stderr}`;
  } else if (r.status !== 0) {
    status = "COMPILE ERROR\n" + r.stderr;
  } else if (it.starter || it.noRun) {
    status = "compiles";
  } else {
    const run = spawnSync(bin, [], { encoding: "utf8", timeout: 10000 });
    status = run.status === 0 ? "compiles + runs" : "RUNTIME FAIL\n" + run.stderr;
  }
  const good = /^(FAILS as expected|compiles)/.test(status);
  good ? ok++ : bad++;
  report.push(`${good ? "✔" : "✘"} ${it.id.padEnd(24)} ${status.split("\n")[0]}`);
  if (!good) console.error(it.id, status);
}
const rv = execFileSync("rustc", ["--version"], { encoding: "utf8" }).trim();
const out = `# Snippet check (${rv})\n\n${report.join("\n")}\n\nTotal: ${items.length}, ok: ${ok}, failed: ${bad}\n`;
fs.writeFileSync(path.join(root, "docs", "snippet-check.txt"), out);
console.log(out);
process.exit(bad ? 1 : 0);
