// Tests for assets/converter.js: expected mappings + "does the generated draft compile?" (rustc).
// Run: node tests/converter.test.mjs
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const C = require("../assets/converter.js");
const EXAMPLES = require("../assets/converter-examples.js");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "conv-"));
fs.mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
let pass = 0, fail = 0;
const lines = [];
const t = (name, fn) => { try { fn(); pass++; lines.push("✔ " + name); } catch (e) { fail++; lines.push("✘ " + name + "\n   " + e.message.split("\n").slice(0, 6).join("\n   ")); } };

// unit checks of single mappings
const py = (s) => C.convert(s, "python").code;
const jv = (s) => C.convert(s, "java").code;
t("py print → println!", () => assert.match(py('print("hi")'), /println!\("hi"\);/));
t("py f-string inlines identifiers", () => assert.match(py('name = "x"\nprint(f"hi {name}")'), /println!\("hi \{name\}"\)/));
t("py range(a, b) → a..b", () => assert.match(py("for i in range(2, 5):\n    print(i)"), /for i in 2\.\.5 \{/));
t("py while True → loop", () => assert.match(py("while True:\n    break"), /loop \{/));
t("py None checks", () => assert.match(py("x = None\nif x is None:\n    pass"), /x\.is_none\(\)/));
t("py and/or/not", () => assert.match(py("a = True\nb = False\nif a and not b or b:\n    pass"), /a && !b \|\| b/));
t("py list append → push", () => assert.match(py("xs = []\nxs.append(1)"), /xs\.push\(1\)/));
t("py elif → else if", () => assert.match(py("x = 1\nif x == 1:\n    pass\nelif x == 2:\n    pass\nelse:\n    pass"), /\} else if x == 2 \{[\s\S]*\} else \{/));
t("py strings inside quotes are untouched", () => assert.match(py('print("True and None")'), /"True and None"/));
t("py try/except produces a warning", () => assert.ok(C.convert("try:\n    x = 1\nexcept ValueError:\n    pass", "python").warnings.some((w) => /no exceptions/.test(w))));
t("py inheritance warns", () => assert.ok(C.convert("class A(B):\n    pass", "python").warnings.some((w) => /inheritance/.test(w))));
t("java println concat → format", () => assert.match(jv('public class M {\n    public static void main(String[] a) {\n        int x = 2;\n        System.out.println("x=" + x);\n    }\n}'), /println!\("x=\{x\}"\)/));
t("java i++ → += 1", () => assert.match(jv("public class M {\n    public static void main(String[] a) {\n        int i = 0;\n        i++;\n    }\n}"), /i \+= 1;/));
t("java null → None", () => assert.match(jv("public class M {\n    public static void main(String[] a) {\n        String s = null;\n    }\n}"), /= None;/));
t("java camelCase → snake_case", () => assert.match(jv("public class M {\n    static int doThing(int a) {\n        return a;\n    }\n}"), /fn do_thing\(a: i32\) -> i32/));
t("language auto-detect", () => { assert.equal(C.detect("def f():\n    pass"), "python"); assert.equal(C.detect("public class A {}"), "java"); });
t("every output starts with the draft warning", () => assert.match(py("x = 1"), /^\/\/ ⚠️ Draft/));

// examples: expected snippets + compile check
const compile = [];
for (const ex of EXAMPLES) {
  const r = C.convert(ex.src, ex.lang);
  t(`example ${ex.id}: expected mappings`, () => { for (const e of ex.expect) assert.ok(r.code.includes(e), `missing "${e}" in:\n${r.code}`); });
  const f = path.join(tmp, ex.id.replace(/\W/g, "_") + ".rs");
  fs.writeFileSync(f, r.code);
  const c = spawnSync("rustc", ["--edition", "2021", "-A", "warnings", "-o", f.replace(/\.rs$/, ""), f], { encoding: "utf8" });
  let runOut = "";
  if (c.status === 0) { const run = spawnSync(f.replace(/\.rs$/, ""), [], { encoding: "utf8" }); runOut = (run.stdout || "").trim().replace(/\n/g, " | "); }
  compile.push({ id: ex.id, ok: c.status === 0, err: c.status === 0 ? "" : (c.stderr.match(/error(\[E\d+\])?: .*/) || [""])[0], runOut });
  t(`example ${ex.id}: generated draft compiles with rustc`, () => assert.equal(c.status, 0, c.stderr));
  fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "out", ex.id + ".rs"), r.code);
}
const summary = `${lines.join("\n")}\n\nCompile check of converted examples:\n${compile.map((c) => `  ${c.ok ? "compiles" : "DOES NOT COMPILE"}  ${c.id}${c.ok ? "  → output: " + c.runOut : "  " + c.err}`).join("\n")}\n\nTotal: ${pass + fail}, passed: ${pass}, failed: ${fail}\n`;
console.log(summary);
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "docs", "converter-test.txt"), summary);
process.exit(fail ? 1 : 0);
