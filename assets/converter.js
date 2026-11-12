/* Rust RO — Python/Java → Rust draft converter.
 * 100% rule/pattern based, runs in the browser (and in Node for tests). No AI, no server.
 * It translates COMMON constructs line by line and explains each mapping in comments.
 * The output is a STARTING DRAFT: always review it and run `cargo check`.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RustConverter = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ───────────── shared helpers ───────────── */

  // Split an expression into code / string-literal segments so rewrites never touch text inside strings.
  function segments(src) {
    const out = [];
    let i = 0, buf = "";
    while (i < src.length) {
      const ch = src[i];
      const fpref = /[fF]/.test(ch) && (src[i + 1] === '"' || src[i + 1] === "'") && !/\w/.test(src[i - 1] || "");
      if (ch === '"' || ch === "'" || fpref) {
        if (buf) out.push({ code: buf }), (buf = "");
        const f = fpref;
        const q = f ? src[i + 1] : ch;
        let j = f ? i + 2 : i + 1, body = "";
        while (j < src.length && src[j] !== q) {
          if (src[j] === "\\") { body += src[j] + (src[j + 1] || ""); j += 2; continue; }
          body += src[j++];
        }
        out.push({ str: body, quote: q, f });
        i = j + 1;
      } else buf += src[i++];
    }
    if (buf) out.push({ code: buf });
    return out;
  }

  // Split by a separator at nesting depth 0 (ignores (), [], {}, <> for generics when asked, and strings).
  function splitTop(s, sep, angle) {
    const parts = [];
    let depth = 0, cur = "", q = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { cur += c; if (c === "\\") { cur += s[++i] || ""; } else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if ("([{".includes(c) || (angle && c === "<")) depth++;
      if (")]}".includes(c) || (angle && c === ">")) depth--;
      if (depth === 0 && s.startsWith(sep, i)) { parts.push(cur); cur = ""; i += sep.length - 1; continue; }
      cur += c;
    }
    parts.push(cur);
    return parts.map((p) => p.trim());
  }

  // Find matching close paren starting at index of "(".
  function matchParen(s, start, open = "(", close = ")") {
    let d = 0, q = null;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === open) d++;
      else if (c === close && --d === 0) return i;
    }
    return -1;
  }

  // Rewrite calls like name(args) → fn(argsArray) for every occurrence (supports nesting).
  function rewriteCall(s, re, fn) {
    let guard = 0;
    for (;;) {
      const m = re.exec(s);
      re.lastIndex = 0;
      if (!m || guard++ > 50) return s;
      const open = m.index + m[0].length - 1;
      const close = matchParen(s, open);
      if (close < 0) return s;
      const args = s.slice(open + 1, close).trim();
      const rep = fn(m, args ? splitTop(args, ",") : []);
      if (rep == null) return s;
      s = s.slice(0, m.index) + rep + s.slice(close + 1);
    }
  }

  const rustStr = (body) => '"' + body.replace(/\\'/g, "'").replace(/"/g, '\\"').replace(/\\\\"/g, '\\"') + '"';
  const escBraces = (s) => s.replace(/\{/g, "{{").replace(/\}/g, "}}");

  class Ctx {
    constructor(lang) {
      this.lang = lang;
      this.notesSeen = new Set();
      this.warnings = [];
      this.usesHashMap = false;
      this.fns = {};     // name -> { refParams: [bool], result: bool }
      this.classes = {}; // name -> { fields }
      this.scope = null;
    }
    note(kind, text) {
      if (this.notesSeen.has(kind)) return "";
      this.notesSeen.add(kind);
      return "  // " + text;
    }
    warn(w) { if (!this.warnings.includes(w)) this.warnings.push(w); }
    newScope(extra) { this.scope = Object.assign({ vars: {}, result: false, ret: null, selfMut: false, isMethod: false }, extra || {}); }
    declare(name, type) { if (this.scope) this.scope.vars[name] = type || "?"; }
    isDeclared(name) { return this.scope && name in this.scope.vars; }
    typeOf(name) { if (!this.scope) return undefined; if (name in this.scope.vars) return this.scope.vars[name]; const f = (this.scope.fields || {})[name.replace(/^self\./, "")]; if (f) return f; const call = /^([A-Za-z_]\w*)\(/.exec(name); return call && this.fns[call[1]] ? this.fns[call[1]].ret : undefined; }
  }

  // Convert a call to a Result-returning function: add ? in Result fns, .unwrap() elsewhere.
  function fixResultCalls(code, ctx) {
    for (const [name, info] of Object.entries(ctx.fns)) {
      if (!info.result) continue;
      code = rewriteCall(code, new RegExp("(?<![\\w.:\u0000])" + name + "\\(", "g"), (m, args) => {
        const call = "\u0000" + name + "(" + args.join(", ") + ")";
        return ctx.scope && ctx.scope.result ? call + "?" : call + ".unwrap()";
      });
    }
    return code.replace(/\u0000/g, "");
  }

  // Add & for arguments passed to reference parameters (Python lists/dicts/str, Java collections).
  function fixRefArgs(code, ctx) {
    for (const [name, info] of Object.entries(ctx.fns)) {
      if (!info.refParams.some(Boolean)) continue;
      code = rewriteCall(code, new RegExp("(?<![\\w.:&\u0001])" + name + "\\(", "g"), (m, args) => {
        const fixed = args.map((a, i) => (info.refParams[i] && /^[A-Za-z_]\w*$/.test(a) ? "&" + a : a));
        return "\u0001" + name + "(" + fixed.join(", ") + ")";
      });
    }
    return code.replace(/\u0001/g, "");
  }

  /* ───────────── Python ───────────── */

  function pyType(t, param, ctx) {
    t = (t || "").trim();
    if (!t) return null;
    let m;
    if ((m = t.match(/^Optional\[(.+)\]$/)) || (m = t.match(/^(.+?)\s*\|\s*None$/))) return "Option<" + pyType(m[1], false, ctx) + ">";
    if ((m = t.match(/^[Ll]ist\[(.+)\]$/))) return (param ? "&[" : "Vec<") + pyType(m[1], false, ctx) + (param ? "]" : ">");
    if ((m = t.match(/^[Dd]ict\[(.+)\]$/))) {
      ctx.usesHashMap = true;
      const [k, v] = splitTop(m[1], ",");
      return (param ? "&" : "") + "HashMap<" + pyType(k, false, ctx) + ", " + pyType(v, false, ctx) + ">";
    }
    if ((m = t.match(/^[Tt]uple\[(.+)\]$/))) return "(" + splitTop(m[1], ",").map((x) => pyType(x, false, ctx)).join(", ") + ")";
    const map = { int: "i64", float: "f64", bool: "bool", str: param ? "&str" : "String", None: "()", bytes: "Vec<u8>" };
    return map[t] || t;
  }

  function pyLiteralType(expr) {
    expr = expr.trim();
    if (/^-?\d+$/.test(expr)) return "i64";
    if (/^-?\d+\.\d*$/.test(expr)) return "f64";
    if (/^(True|False)$/.test(expr)) return "bool";
    if (/^["']/.test(expr) || /^f["']/.test(expr)) return "String";
    if (/^\[/.test(expr)) return "Vec";
    if (/^\{/.test(expr)) return "HashMap";
    return null;
  }

  // f-string body → Rust format string + args
  function fstring(body) {
    const args = [];
    let fmt = "", i = 0;
    while (i < body.length) {
      if (body[i] === "{" && body[i + 1] === "{") { fmt += "{{"; i += 2; continue; }
      if (body[i] === "}" && body[i + 1] === "}") { fmt += "}}"; i += 2; continue; }
      if (body[i] === "{") {
        const j = body.indexOf("}", i);
        let inner = body.slice(i + 1, j);
        let spec = "";
        const c = inner.indexOf(":");
        if (c >= 0) { spec = inner.slice(c); inner = inner.slice(0, c); }
        if (/^[A-Za-z_]\w*$/.test(inner.trim())) fmt += "{" + inner.trim() + spec + "}";
        else { fmt += "{" + spec + "}"; args.push(inner.trim()); }
        i = j + 1;
        continue;
      }
      fmt += body[i] === '"' ? '\\"' : body[i];
      i++;
    }
    return { fmt, args };
  }

  function pyExpr(e, ctx) {
    e = e.trim();
    if (!e) return e;
    // list / dict literals at the start of an expression
    if (e === "[]") return "Vec::new()";
    if (e === "{}" || e === "dict()") { ctx.usesHashMap = true; return "HashMap::new()"; }
    if (e.startsWith("[") && matchParen(e, 0, "[", "]") === e.length - 1) {
      const inner = e.slice(1, -1);
      const comp = inner.match(/^(.+?)\s+for\s+(\w+)\s+in\s+(.+?)(?:\s+if\s+(.+))?$/);
      if (comp) {
        const [, body, v, it, cond] = comp;
        let r = "(" + pyIter(it, ctx).replace(/^&/, "") + ")";
        r = /\.\.|\.iter\(\)/.test(r) ? r : r + ".iter()";
        if (cond) r += ".filter(|&" + v + "| " + pyExpr(cond, ctx) + ")";
        return r + ".map(|" + v + "| " + pyExpr(body, ctx) + ").collect::<Vec<_>>()";
      }
      return "vec![" + splitTop(inner, ",").filter(Boolean).map((x) => pyExpr(x, ctx)).join(", ") + "]";
    }
    if (e.startsWith("{") && matchParen(e, 0, "{", "}") === e.length - 1) {
      ctx.usesHashMap = true;
      const pairs = splitTop(e.slice(1, -1), ",").filter(Boolean).map((p) => {
        const [k, v] = splitTop(p, ":");
        return "(" + pyExpr(k, ctx) + ", " + pyExpr(v, ctx) + ")";
      });
      return "HashMap::from([" + pairs.join(", ") + "])";
    }
    if (/^f["']/.test(e) && segments(e).length === 1) {
      const s = segments(e)[0];
      const { fmt, args } = fstring(s.str);
      return "format!(\"" + fmt + "\"" + args.map((a) => ", " + pyExpr(a, ctx)).join("") + ")";
    }
    // conditional expression: a if c else b
    const tern = splitTop(e, " if ");
    if (tern.length === 2) {
      const [a, rest] = tern;
      const [c, b] = splitTop(rest, " else ");
      if (b !== undefined) return "if " + pyExpr(c, ctx) + " { " + pyExpr(a, ctx) + " } else { " + pyExpr(b, ctx) + " }";
    }
    let out = segments(e).map((s) => {
      if (s.str !== undefined) {
        if (s.f) { const { fmt, args } = fstring(s.str); return "format!(\"" + fmt + "\"" + args.map((a) => ", " + a).join("") + ")"; }
        return rustStr(s.str);
      }
      let c = s.code;
      c = c.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false");
      c = c.replace(/([\w.\]\)]+)\s+is\s+not\s+None\b/g, "$1.is_some()").replace(/([\w.\]\)]+)\s+is\s+None\b/g, "$1.is_none()");
      c = c.replace(/\bnot\s+(\w[\w.]*)\s+in\s+([\w.]+)/g, (m, x, y) => "!" + containsExpr(x, y, ctx));
      c = c.replace(/(\w[\w.]*)\s+not\s+in\s+([\w.]+)/g, (m, x, y) => "!" + containsExpr(x, y, ctx));
      c = c.replace(/(\w[\w.]*)\s+in\s+([\w.]+)/g, (m, x, y) => containsExpr(x, y, ctx));
      c = c.replace(/\band\b/g, "&&").replace(/\bor\b/g, "||").replace(/\bnot\s+/g, "!");
      c = c.replace(/\/\//g, "/");
      c = c.replace(/(\w+)\s*\*\*\s*(\d+)/g, "$1.pow($2)");
      c = c.replace(/\bself\./g, "self.");
      c = c.replace(/\.append\(/g, ".push(").replace(/\.upper\(\)/g, ".to_uppercase()").replace(/\.lower\(\)/g, ".to_lowercase()")
        .replace(/\.strip\(\)/g, ".trim()").replace(/\.split\(\)/g, ".split_whitespace()").replace(/\.startswith\(/g, ".starts_with(").replace(/\.endswith\(/g, ".ends_with(")
        .replace(/\.items\(\)/g, ".iter()").replace(/\.keys\(\)/g, ".keys()").replace(/\.values\(\)/g, ".values()");
      return c;
    }).join("");
    // builtins with argument parsing
    out = rewriteCall(out, /(?<![\w.])len\(/g, (m, a) => wrap(a[0]) + ".len()");
    out = rewriteCall(out, /(?<![\w.])str\(/g, (m, a) => wrap(a[0]) + ".to_string()");
    out = rewriteCall(out, /(?<![\w.])abs\(/g, (m, a) => wrap(a[0]) + ".abs()");
    out = rewriteCall(out, /(?<![\w.])(max|min)\(/g, (m, a) => (a.length === 2 ? wrap(a[0]) + "." + m[1] + "(" + a[1] + ")" : "*" + wrap(a[0]) + ".iter()." + m[1] + "().unwrap()"));
    out = rewriteCall(out, /(?<![\w.])sum\(/g, (m, a) => wrap(a[0]) + ".iter().sum::<i64>()");
    out = rewriteCall(out, /(?<![\w.])(int|float)\(/g, (m, a) => {
      const t = m[1] === "int" ? "i64" : "f64";
      if (/^-?\d/.test(a[0])) return a[0] + " as " + t;
      if (ctx.scope && ctx.scope.result) return wrap(a[0]) + ".trim().parse::<" + t + ">().map_err(|e| e.to_string())?";
      return wrap(a[0]) + ".trim().parse::<" + t + ">().unwrap()";
    });
    out = rewriteCall(out, /([\w.]+)\.get\(/g, (m, a) => (a.length === 2 ? m[1] + ".get(&" + a[0] + ").copied().unwrap_or(" + a[1] + ")" : m[1] + ".get(&" + a[0] + ")"));
    // Class(...) → Class::new(...)
    for (const cls of Object.keys(ctx.classes)) out = out.replace(new RegExp("(?<![\\w.:])" + cls + "\\(", "g"), cls + "::new(");
    out = out.replace(/\bNone\b/g, "None");
    out = fixResultCalls(out, ctx);
    out = fixRefArgs(out, ctx);
    return out;
  }
  const wrap = (x) => (/^[\w.]+(\(\))?$/.test(x) || /^[\w.]+\[.+\]$/.test(x) ? x : "(" + x + ")");

  function keyStr(k, map, ctx) {
    const t = ctx.typeOf(map) || "";
    if (/HashMap<String/.test(t) || t === "HashMap") return /to_string\(\)$/.test(k) ? k : k + ".to_string()";
    return k;
  }

  function containsExpr(x, y, ctx) {
    const t = ctx.typeOf(y) || "";
    if (/HashMap/.test(t)) return y + ".contains_key(&" + x + ")";
    if (/String|str/.test(t)) return y + ".contains(" + x + ")";
    return y + ".contains(&" + x + ")";
  }

  function pyIter(it, ctx) {
    it = it.trim();
    let m;
    if ((m = it.match(/^range\((.*)\)$/))) {
      const a = splitTop(m[1], ",").map((x) => pyExpr(x, ctx));
      if (a.length === 1) return "0.." + a[0];
      if (a.length === 2) return a[0] + ".." + a[1];
      return "(" + a[0] + ".." + a[1] + ").step_by(" + a[2] + " as usize)";
    }
    if ((m = it.match(/^enumerate\((.*)\)$/))) return pyExpr(m[1], ctx) + ".iter().enumerate()";
    if ((m = it.match(/^(\w[\w.]*)\.items\(\)$/))) return "&" + m[1];
    if ((m = it.match(/^(\w[\w.]*)\.(keys|values)\(\)$/))) return m[1] + "." + m[2] + "()";
    if (/^\w[\w.]*$/.test(it)) {
      const t = ctx.typeOf(it) || "";
      if (/^&/.test(t)) return it + ".iter()";
      return "&" + it;
    }
    return pyExpr(it, ctx);
  }

  function pyPrint(args, ctx, fn) {
    fn = fn || "println!";
    if (!args.length) return fn + "()";
    if (args.length === 1) {
      const a = args[0].trim();
      const segs = segments(a);
      if (segs.length === 1 && segs[0].str !== undefined) {
        if (segs[0].f) {
          const { fmt, args: fa } = fstring(segs[0].str);
          return fn + "(\"" + fmt + "\"" + fa.map((x) => ", " + pyExpr(x, ctx)).join("") + ")";
        }
        return fn + "(" + rustStr(escBraces(segs[0].str)) + ")";
      }
    }
    const kw = args.filter((a) => /^(sep|end)\s*=/.test(a));
    const pos = args.filter((a) => !/^(sep|end)\s*=/.test(a));
    let sep = " ";
    kw.forEach((k) => { const m = k.match(/^sep\s*=\s*["'](.*)["']$/); if (m) sep = m[1]; });
    if (kw.some((k) => /^end\s*=/.test(k))) fn = "print!";
    const fmt = pos.map((a) => {
      const segs = segments(a.trim());
      if (segs.length === 1 && segs[0].str !== undefined && !segs[0].f) return { lit: escBraces(segs[0].str) };
      if (segs.length === 1 && segs[0].f) { const fs = fstring(segs[0].str); return { lit: fs.fmt, extra: fs.args.map((x) => pyExpr(x, ctx)) }; }
      const t = ctx.typeOf(a.trim()) || "";
      return { ph: /Vec|HashMap|&\[|Option/.test(t) ? "{:?}" : "{}", arg: pyExpr(a, ctx) };
    });
    return fn + "(\"" + fmt.map((f) => f.lit !== undefined ? f.lit : f.ph).join(sep) + "\"" + fmt.flatMap((f) => (f.arg ? [f.arg] : f.extra || [])).map((x) => ", " + x).join("") + ")";
  }

  function pyParams(src, ctx, isMethod) {
    const out = [];
    const refs = [];
    let hasSelf = false;
    for (const p of splitTop(src, ",").filter(Boolean)) {
      if (p === "self") { hasSelf = true; continue; }
      const m = p.match(/^(\w+)\s*(?::\s*([^=]+?))?\s*(?:=\s*(.+))?$/);
      if (!m) { out.push("/* " + p + " */"); refs.push(false); continue; }
      const [, name, ann, def] = m;
      let t = ann ? pyType(ann, true, ctx) : null;
      if (!t && def) {
        const lt = pyLiteralType(def);
        t = lt === "String" ? "&str" : lt;
      }
      if (def) ctx.warn("Default parameter values (" + name + "=" + def + ") don't exist in Rust: callers must pass every argument (or use Option<T>).");
      if (!t) { t = "i64 /* TODO: type */"; ctx.warn("Parameter `" + name + "` had no type hint; guessed i64 — fix it."); }
      ctx.declare(name, t);
      refs.push(/^&/.test(t));
      out.push(name + ": " + t);
    }
    return { list: out, refs, hasSelf };
  }

  function buildPyTree(src) {
    const rootNode = { children: [], indent: -1 };
    const stack = [rootNode];
    const lines = src.replace(/\t/g, "    ").split(/\r?\n/);
    let pending = "";
    for (let raw of lines) {
      if (pending) { raw = pending + " " + raw.trim(); pending = ""; }
      const opens = (raw.match(/[\(\[\{]/g) || []).length - (raw.match(/[\)\]\}]/g) || []).length;
      if (opens > 0 && !raw.trim().startsWith("#")) { pending = raw; continue; }
      if (!raw.trim()) { stack[stack.length - 1].children.push({ blank: true }); continue; }
      const indent = raw.match(/^ */)[0].length;
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      const node = { text: raw.trim(), indent, children: [] };
      stack[stack.length - 1].children.push(node);
      if (/:\s*(#.*)?$/.test(node.text) && !node.text.startsWith("#")) stack.push(node);
    }
    return rootNode.children;
  }

  const stripColon = (t) => t.replace(/\s*#.*$/, "").replace(/:\s*$/, "");
  const ind = (d) => "    ".repeat(d);

  function hasRaise(node) {
    return (node.children || []).some((c) => /^raise\b/.test(c.text || "") || hasRaise(c));
  }

  function pyBlock(nodes, d, ctx) {
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.blank) { out.push(""); continue; }
      const t = n.text;
      let m;
      if (t.startsWith("#")) { out.push(ind(d) + "//" + t.slice(1)); continue; }
      if (/^("""|''')/.test(t)) { out.push(ind(d) + "// " + t.replace(/^("""|''')|("""|''')$/g, "").trim()); continue; }
      if (/^(import|from)\s/.test(t)) { out.push(ind(d) + "// " + t + "  // no direct equivalent: use std or a crate from crates.io"); continue; }
      if (/^if\s/.test(t) || /^while\s/.test(t) || /^elif\s/.test(t)) {
        const kw = t.match(/^(\w+)/)[1];
        const cond = stripColon(t).replace(/^\w+\s+/, "");
        let head;
        if (kw === "while" && /^True$/.test(cond)) head = "loop {" + ctx.note("whileTrue", "py: while True → loop");
        else head = (kw === "elif" ? "} else if " : kw + " ") + pyExpr(cond, ctx) + " {" + (kw === "if" ? ctx.note("if", "py: if cond: → if cond { } (no parentheses, condition must be bool)") : "");
        if (kw === "elif") out.pop();
        out.push(ind(d) + head, ...pyBlock(n.children, d + 1, ctx), ind(d) + "}");
        continue;
      }
      if (/^else\s*:/.test(t)) {
        out.pop();
        out.push(ind(d) + "} else {", ...pyBlock(n.children, d + 1, ctx), ind(d) + "}");
        continue;
      }
      if ((m = stripColon(t).match(/^for\s+(.+?)\s+in\s+(.+)$/))) {
        let vars = m[1].trim();
        if (vars.includes(",")) vars = "(" + splitTop(vars, ",").join(", ") + ")";
        splitTop(vars.replace(/[()]/g, ""), ",").forEach((v) => ctx.declare(v, "?"));
        const it = pyIter(m[2], ctx);
        out.push(ind(d) + "for " + vars + " in " + it + " {" + ctx.note(/\.\./.test(it) ? "range" : "forin", /\.\./.test(it) ? "py: range(a, b) → a..b (end excluded)" : "py: for x in items → for x in &items (borrow, don't move)"),
          ...pyBlock(n.children, d + 1, ctx), ind(d) + "}");
        continue;
      }
      if (/^try\s*:/.test(t)) {
        ctx.warn("try/except was converted to a plain block. Rust has no exceptions: make the fallible call return Result and handle it with match or ?.");
        out.push(ind(d) + "{ // try: → Rust has no exceptions; fallible functions return Result<T, E>", ...pyBlock(n.children, d + 1, ctx), ind(d) + "}");
        continue;
      }
      if (/^(except|finally)\b/.test(t)) {
        out.push(ind(d) + "// " + stripColon(t) + ": → handle the Err(e) arm of a `match` on the Result instead. Original body (commented):");
        commentOut(n.children, d, out);
        continue;
      }
      if (/^with\s/.test(t)) {
        out.push(ind(d) + "{ // " + stripColon(t) + " → Rust closes files/locks automatically when the value goes out of scope (Drop)");
        ctx.warn("`with` blocks are not translated: open the resource with std (e.g. std::fs::read_to_string) — it is closed on drop.");
        out.push(...pyBlock(n.children, d + 1, ctx), ind(d) + "}");
        continue;
      }
      if (/^def\s/.test(t) || /^class\s/.test(t)) {
        out.push(...(t.startsWith("def") ? pyFn(n, d, ctx, null) : pyClass(n, d, ctx)));
        continue;
      }
      out.push(ind(d) + pyStmt(t, ctx));
    }
    return out;
  }

  function commentOut(nodes, d, out) {
    for (const c of nodes) {
      if (c.blank) continue;
      out.push(ind(d) + "// " + "    ".repeat(Math.max(0, Math.round((c.indent - (nodes[0].indent || 0)) / 4))) + c.text);
      commentOut(c.children || [], d + 1, out);
    }
  }

  function pyStmt(t, ctx) {
    let m;
    const comment = (() => { const s = segments(t); const last = s[s.length - 1]; if (last && last.code && last.code.includes("#")) { const idx = t.lastIndexOf("#"); const c = "  //" + t.slice(idx + 1); t = t.slice(0, idx).trim(); return c; } return ""; })();
    if (t === "pass") return "// pass" + comment;
    if (t === "break" || t === "continue") return t + ";" + comment;
    if ((m = t.match(/^raise\s+\w+\((.*)\)$/)) || (m = t.match(/^raise\s+(.*)$/))) {
      const msg = m[1] ? pyExpr(m[1], ctx) : '"error"';
      return "return Err(" + (/^"/.test(msg) ? msg + ".to_string()" : msg) + ");" + ctx.note("raise", "py: raise → return Err(...) (the function now returns Result)") + comment;
    }
    if ((m = t.match(/^return\b\s*(.*)$/))) {
      let v = m[1] ? pyExpr(m[1], ctx) : "";
      const sc = ctx.scope || {};
      if (/^"/.test(v) && /String/.test(sc.ret || "")) v += ".to_string()";
      if (v === "None" && sc.ret === "()") v = "";
      if (/^Option</.test(sc.ret || "") && v && v !== "None" && !/^Some\(/.test(v)) v = "Some(" + v + ")";
      if (sc.result) return "return Ok(" + (v || "()") + ");" + comment;
      return "return" + (v ? " " + v : "") + ";" + comment;
    }
    if ((m = t.match(/^print\((.*)\)$/))) return pyPrint(splitTop(m[1], ",").filter(Boolean), ctx) + ";" + ctx.note("print", "py: print(...) → println!(...) macro") + comment;
    // d[k] += n  → *d.entry(k).or_insert(0) += n
    if ((m = t.match(/^(\w+)\[(.+)\]\s*([+\-*])=\s*(.+)$/)) && /HashMap/.test(ctx.typeOf(m[1]) || "")) {
      return "*" + m[1] + ".entry(" + keyStr(pyExpr(m[2], ctx), m[1], ctx) + ").or_insert(0) " + m[3] + "= " + pyExpr(m[4], ctx) + ";" + ctx.note("entry", "py: d[k] += 1 → *d.entry(k).or_insert(0) += 1") + comment;
    }
    if ((m = t.match(/^(\w+)\[(.+)\]\s*=\s*(.+)$/)) && /HashMap/.test(ctx.typeOf(m[1]) || "")) {
      return m[1] + ".insert(" + keyStr(pyExpr(m[2], ctx), m[1], ctx) + ", " + pyExpr(m[3], ctx) + ");" + ctx.note("insert", "py: d[k] = v → d.insert(k, v)") + comment;
    }
    if ((m = t.match(/^([\w.\[\]]+)\s*([+\-*/%]|\/\/)=\s*(.+)$/))) return m[1] + " " + (m[2] === "//" ? "/" : m[2]) + "= " + pyExpr(m[3], ctx) + ";" + comment;
    if ((m = t.match(/^(\w+)\s*(?::\s*([^=]+?))?\s*=\s*(.+)$/)) && !/^[=]/.test(m[3])) {
      const [, name, ann, rhs] = m;
      const val = pyExpr(rhs, ctx);
      if (ctx.isDeclared(name)) return name + " = " + val + ";" + comment;
      let type = ann ? pyType(ann, false, ctx) : null;
      const lt = pyLiteralType(rhs);
      const callM = rhs.match(/^(\w+)\(/);
      const fnRet = callM && ctx.fns[callM[1]] ? ctx.fns[callM[1]].ret : null;
      ctx.declare(name, type || lt || fnRet || (/^vec!|Vec::new|collect::<Vec/.test(val) ? "Vec" : /HashMap/.test(val) ? "HashMap" : "?"));
      if (val === "Vec::new()" && !type) type = "Vec<i64> /* TODO: element type */";
      if (val === "HashMap::new()" && !type) { type = "HashMap<String, i64> /* TODO: key/value types */"; ctx.declare(name, "HashMap<String, i64>"); }
      if (val === "Vec::new()" && /^Vec</.test(type)) ctx.declare(name, type);
      const note = /^vec!|Vec::new/.test(val) ? ctx.note("vec", "py: list → Vec<T> (growable array)") : /HashMap/.test(val) ? ctx.note("hashmap", "py: dict → HashMap<K, V>") : ctx.note("let", "py: x = … → let mut x = … (remove `mut` if never changed)");
      const isUpper = /^[A-Z][A-Z0-9_]+$/.test(name) && !ctx.scope.isFn;
      if (isUpper) return "const " + name + ": " + (type || lt || "i64").replace("String", "&str") + " = " + val + ";" + comment;
      return "let mut " + name + (type ? ": " + type : "") + " = " + val + ";" + note + comment;
    }
    return pyExpr(t, ctx) + ";" + comment;
  }

  function pyFn(n, d, ctx, cls) {
    const m = stripColon(n.text).match(/^def\s+(\w+)\s*\((.*)\)\s*(?:->\s*(.+))?$/);
    if (!m) return [ind(d) + "// could not parse: " + n.text];
    const [, name, params, retAnn] = m;
    const result = hasRaise(n);
    const prevScope = ctx.scope;
    ctx.newScope({ result, isFn: true, isMethod: !!cls });
    const pr = pyParams(params, ctx, !!cls);
    let ret = retAnn ? pyType(retAnn, false, ctx) : null;
    if (ret === "()") ret = null;
    if (!ret && (function hasRet(ns) { return ns.some((c) => /^return\s+\S/.test(c.text || "") || hasRet(c.children || [])); })(n.children)) {
      ret = "i64 /* TODO: return type */";
      ctx.warn("Function `" + name + "` has no return type hint; guessed i64.");
    }
    ctx.scope.ret = ret;
    const body = pyBlock(n.children, d + 1, ctx);
    let selfArg = "";
    if (pr.hasSelf) selfArg = body.some((l) => /self\.\w+(\[.*\])?\s*([+\-*/]?=(?!=)|\.push\(|\.insert\()/.test(l)) ? "&mut self" : "&self";
    const args = [selfArg, ...pr.list].filter(Boolean).join(", ");
    const retStr = result ? " -> Result<" + (ret || "()") + ", String>" : ret ? " -> " + ret : "";
    if (result && !/return Ok/.test(body[body.length - 1] || "") && !ret) body.push(ind(d + 1) + "Ok(())");
    ctx.scope = prevScope;
    const head = ind(d) + (cls ? "" : "") + "fn " + name + "(" + args + ")" + retStr + " {" + ctx.note("def", "py: def → fn; every parameter needs a type");
    return [head, ...body, ind(d) + "}"];
  }

  function pyClass(n, d, ctx) {
    const m = stripColon(n.text).match(/^class\s+(\w+)\s*(?:\((.*)\))?$/);
    const name = m ? m[1] : "Unknown";
    if (m && m[2] && m[2].trim() && m[2].trim() !== "object") ctx.warn("Class `" + name + "` inherits from " + m[2] + ": Rust has no inheritance — use composition or traits.");
    const init = n.children.find((c) => /^def\s+__init__/.test(c.text || ""));
    const fields = [];
    const out = [];
    let newFn = [];
    if (init) {
      const im = stripColon(init.text).match(/^def\s+__init__\s*\((.*)\)$/);
      ctx.newScope({ isFn: true });
      const pr = pyParams(im ? im[1] : "self", ctx, true);
      const inits = [];
      const extra = [];
      for (const c of init.children) {
        const fm = (c.text || "").match(/^self\.(\w+)\s*(?::\s*([^=]+?))?\s*=\s*(.+)$/);
        if (fm) {
          const [, f, ann, rhs] = fm;
          let ft = ann ? pyType(ann, false, ctx) : null;
          const pt = ctx.typeOf(rhs.trim());
          if (!ft && pt && pt !== "?") ft = pt.replace(/^&str$/, "String").replace(/^&\[(.+)\]$/, "Vec<$1>").replace(/^&/, "");
          if (!ft) ft = (pyLiteralType(rhs) || "i64 /* TODO: type */").replace(/^Vec$/, "Vec<i64> /* TODO */").replace(/^HashMap$/, "HashMap<String, i64> /* TODO */");
          let v = pyExpr(rhs, ctx);
          if (ft === "String" && (pt === "&str" || /^"/.test(v))) v += ".to_string()";
          fields.push(ind(d + 1) + f + ": " + ft + ",");
          inits.push(f === v ? f : f + ": " + v);
        } else if (c.text) extra.push(c);
      }
      if (extra.length) ctx.warn("__init__ of `" + name + "` has logic besides field assignments; it was left as comments.");
      newFn = [ind(d + 1) + "fn new(" + pr.list.join(", ") + ") -> Self {" + ctx.note("init", "py: __init__ → associated fn new() returning Self"),
        ...extra.map((c) => ind(d + 2) + "// " + c.text),
        ind(d + 2) + "Self { " + inits.join(", ") + " }", ind(d + 1) + "}"];
    }
    ctx.classes[name] = { fields };
    out.push(ind(d) + "#[derive(Debug, Clone)]", ind(d) + "struct " + name + " {" + ctx.note("class", "py: class → struct (data) + impl (methods)"), ...fields, ind(d) + "}", "", ind(d) + "impl " + name + " {", ...newFn);
    for (const c of n.children) {
      if (c === init || !c.text) continue;
      if (/^def\s/.test(c.text)) {
        const isStr = /^def\s+__str__/.test(c.text);
        const fnLines = pyFn(c, d + 1, ctx, name);
        if (isStr) fnLines[0] = fnLines[0].replace("fn __str__(&self) -> String", "fn to_string(&self) -> String") + "  // __str__ (better: impl std::fmt::Display)";
        out.push("", ...fnLines);
      } else if (c.text.startsWith("#") || /^("""|''')/.test(c.text)) out.push(ind(d + 1) + "// " + c.text.replace(/^#|"""|'''/g, "").trim());
      else if (c.text !== "pass") out.push(ind(d + 1) + "// class attribute (move to a const or a field): " + c.text);
    }
    out.push(ind(d) + "}");
    return out;
  }

  function prescanPy(tree, ctx) {
    const walk = (nodes, inClass) => {
      for (const n of nodes) {
        if (!n.text) continue;
        const cm = n.text.match(/^class\s+(\w+)/);
        if (cm) { ctx.classes[cm[1]] = { fields: [] }; walk(n.children, cm[1]); continue; }
        const m = stripColon(n.text).match(/^def\s+(\w+)\s*\((.*)\)/);
        if (m && !inClass) {
          const save = ctx.scope; ctx.newScope();
          const pr = pyParams(m[2], { warn() {}, declare() {}, usesHashMap: false, __proto__: ctx }, false);
          ctx.scope = save;
          const rm = stripColon(n.text).match(/->\s*(.+)$/);
          ctx.fns[m[1]] = { refParams: pr.refs, result: hasRaise(n), ret: rm ? pyType(rm[1], false, ctx) : null };
        }
      }
    };
    walk(tree, null);
  }

  function convertPython(src) {
    const ctx = new Ctx("python");
    const tree = buildPyTree(src);
    prescanPy(tree, ctx);
    const items = [], mainBody = [];
    ctx.newScope({ isFn: true });
    const mainScope = ctx.scope;
    const mainNodes = [];
    for (const n of tree) {
      if (n.blank) { (mainNodes.length ? mainNodes : items).push(mainNodes.length ? n : ""); continue; }
      if (/^(def|class)\s/.test(n.text) || /^(import|from)\s/.test(n.text)) {
        items.push(...pyBlock([n], 0, ctx));
        ctx.scope = mainScope;
        continue;
      }
      if (/^if\s+__name__\s*==/.test(n.text)) { mainNodes.push(...n.children); continue; }
      if (/^[A-Z][A-Z0-9_]+\s*(:[^=]+)?=/.test(n.text)) { ctx.scope = Object.assign({}, mainScope, { isFn: false }); items.push(pyStmt(n.text, ctx)); ctx.scope = mainScope; continue; }
      mainNodes.push(n);
    }
    ctx.scope = mainScope;
    mainBody.push(...pyBlock(mainNodes, 1, ctx));
    const hasMain = items.some((l) => /^fn main\(/.test(l));
    const code = [];
    if (ctx.usesHashMap) code.push("use std::collections::HashMap;", "");
    code.push(...items);
    if (!hasMain) code.push("", "fn main() {", ...(mainBody.filter((l) => l.trim()).length ? mainBody : ["    // TODO: call your functions here"]), "}");
    return finish(code, ctx);
  }

  /* ───────────── Java ───────────── */

  function javaType(t, param, ctx) {
    t = (t || "").trim();
    let m;
    if ((m = t.match(/^(.+)\[\]$/))) return (param ? "&[" : "Vec<") + javaType(m[1], false, ctx) + (param ? "]" : ">");
    if ((m = t.match(/^(?:List|ArrayList|LinkedList)<(.+)>$/))) return (param ? "&[" : "Vec<") + javaType(m[1], false, ctx) + (param ? "]" : ">");
    if ((m = t.match(/^(?:Map|HashMap|TreeMap)<(.+)>$/))) {
      ctx.usesHashMap = true;
      const [k, v] = splitTop(m[1], ",", true);
      return (param ? "&" : "") + "HashMap<" + javaType(k, false, ctx) + ", " + javaType(v, false, ctx) + ">";
    }
    if ((m = t.match(/^Optional<(.+)>$/))) return "Option<" + javaType(m[1], false, ctx) + ">";
    const map = { int: "i32", Integer: "i32", long: "i64", Long: "i64", short: "i16", byte: "i8", double: "f64", Double: "f64", float: "f32", Float: "f32",
      boolean: "bool", Boolean: "bool", char: "char", Character: "char", String: param ? "&str" : "String", void: "()", var: "" };
    return t in map ? map[t] : t;
  }
  const JTYPE = /^(?:final\s+)?((?:int|long|short|byte|double|float|boolean|char|String|Integer|Long|Double|Float|Boolean|Character|var|[A-Z]\w*)(?:<[^=]*>)?(?:\[\])*)\s+(\w+)\s*(?:=\s*(.+))?;$/;

  function javaConcat(e, ctx) {
    const parts = splitTop(e, "+");
    if (parts.length < 2 || !parts.some((p) => /^"/.test(p))) return null;
    let fmt = "", args = [];
    for (const p of parts) {
      const s = segments(p);
      if (s.length === 1 && s[0].str !== undefined) fmt += escBraces(s[0].str);
      else if (/^\w+$/.test(p) && ctx.isDeclared(p)) fmt += /Vec|HashMap|&\[/.test(ctx.typeOf(p)) ? "{" + p + ":?}" : "{" + p + "}";
      else { fmt += "{}"; args.push(javaExpr(p, ctx)); }
    }
    return { fmt: fmt.replace(/"/g, '\\"'), args };
  }

  function javaExpr(e, ctx) {
    e = e.trim();
    if (!e) return e;
    const cat = javaConcat(e, ctx);
    if (cat) return "format!(\"" + cat.fmt + "\"" + cat.args.map((a) => ", " + a).join("") + ")";
    // ternary
    const q = splitTop(e, " ? ");
    if (q.length === 2) { const [b, c] = splitTop(q[1], " : "); if (c !== undefined) return "if " + javaExpr(q[0], ctx) + " { " + javaExpr(b, ctx) + " } else { " + javaExpr(c, ctx) + " }"; }
    let out = segments(e).map((s) => {
      if (s.str !== undefined) return s.quote === "'" ? "'" + s.str + "'" : '"' + s.str + '"';
      let c = s.code;
      c = c.replace(/\bthis\./g, "self.");
      c = c.replace(/new\s+(?:ArrayList|LinkedList)<[^>]*>\(\s*\)/g, "Vec::new()");
      c = c.replace(/new\s+(?:HashMap|TreeMap)<[^>]*>\(\s*\)/g, () => { ctx.usesHashMap = true; return "HashMap::new()"; });
      c = c.replace(/new\s+(\w+)\[(\w+)\]/g, (m, t, n) => "vec![" + ({ int: "0", long: "0", double: "0.0", boolean: "false" }[t] || "Default::default()") + "; " + n + " as usize]");
      c = c.replace(/new\s+([A-Z]\w*)\s*\(/g, "$1::new(");
      c = c.replace(/([\w.\])]+)\s*==\s*null\b/g, "$1.is_none()").replace(/([\w.\])]+)\s*!=\s*null\b/g, "$1.is_some()").replace(/\bnull\b/g, "None");
      c = c.replace(/\((int|long|double|float|short|byte|char)\)\s*([\w.]+)/g, (m, t, v) => v + " as " + javaType(t, false, ctx));
      c = c.replace(/([\w.]+)\.add\(/g, (mm, r) => (ctx.classes[(ctx.typeOf(r) || "").replace(/^&/, "")] ? mm : r + ".push(")).replace(/\.put\(/g, ".insert(").replace(/\.size\(\)/g, ".len()").replace(/\.length\(\)/g, ".len()")
        .replace(/\.length\b/g, ".len()").replace(/\.isEmpty\(\)/g, ".is_empty()").replace(/\.toUpperCase\(\)/g, ".to_uppercase()")
        .replace(/\.toLowerCase\(\)/g, ".to_lowercase()").replace(/\.startsWith\(/g, ".starts_with(").replace(/\.endsWith\(/g, ".ends_with(")
        .replace(/\.keySet\(\)/g, ".keys()").replace(/\.values\(\)/g, ".values()").replace(/\.entrySet\(\)/g, ".iter()");
      return c;
    }).join("");
    out = rewriteCall(out, /(?:Arrays\.asList|List\.of)\(/g, (m, a) => "vec![" + a.join(", ") + "]");
    out = rewriteCall(out, /(?:Integer\.parseInt|Long\.parseLong|Double\.parseDouble)\(/g, (m, a) => {
      const t = /Integer/.test(m[0]) ? "i32" : /Long/.test(m[0]) ? "i64" : "f64";
      return wrap(a[0]) + ".trim().parse::<" + t + ">()" + (ctx.scope && ctx.scope.result ? ".map_err(|e| e.to_string())?" : ".unwrap()");
    });
    out = rewriteCall(out, /String\.valueOf\(/g, (m, a) => wrap(a[0]) + ".to_string()");
    out = rewriteCall(out, /Math\.(max|min)\(/g, (m, a) => wrap(a[0]) + "." + m[1] + "(" + a[1] + ")");
    out = rewriteCall(out, /Math\.abs\(/g, (m, a) => wrap(a[0]) + ".abs()");
    out = rewriteCall(out, /Math\.sqrt\(/g, (m, a) => "(" + a[0] + " as f64).sqrt()");
    out = rewriteCall(out, /([\w.]+)\.equals\(/g, (m, a) => m[1] + " == " + a[0]);
    out = rewriteCall(out, /([\w.]+)\.(containsKey|contains)\(/g, (m, a) => m[1] + "." + (m[2] === "containsKey" ? "contains_key" : "contains") + "(" + (/^(String|&str)$/.test(ctx.typeOf(m[1]) || "") || (m[2] === "containsKey" && (/^"/.test(a[0]) || /&str/.test(ctx.typeOf(a[0]) || ""))) ? a[0] : "&" + a[0]) + ")");
    const kref = (k) => (/^"/.test(k) || /^&?str$|&str/.test(ctx.typeOf(k) || "") ? k : "&" + k);
    out = rewriteCall(out, /([\w.]+)\.getOrDefault\(/g, (m, a) => m[1] + ".get(" + kref(a[0]) + ").copied().unwrap_or(" + a[1] + ")");
    out = rewriteCall(out, /([\w.]+)\.insert\(/g, (m, a) => { const t = ctx.typeOf(m[1]) || ""; if (/HashMap<String/.test(t) && a.length === 2) { const k = /^"/.test(a[0]) || /&str/.test(ctx.typeOf(a[0]) || "") ? a[0] + ".to_string()" : a[0]; return "\u0002" + m[1] + "(" + k + ", " + a[1] + ")"; } return "\u0003" + m[1] + "(" + a.join(", ") + ")"; });
    out = out.replace(/\u0002([\w.]+)\(/g, "$1.insert(").replace(/\u0003([\w.]+)\(/g, "$1.insert(");
    out = rewriteCall(out, /(\w+)\.get\(/g, (m, a) => (/HashMap/.test(ctx.typeOf(m[1]) || "") ? m[1] + ".get(" + kref(a[0]) + ")" : m[1] + "[" + a[0] + "]"));
    out = rewriteCall(out, /(\w+)\.charAt\(/g, (m, a) => m[1] + ".chars().nth(" + a[0] + " as usize).unwrap()");
    out = out.replace(/(\w+)\[(\w+)\]/g, (m, arr, i) => (/^\d+$/.test(i) || /usize/.test(ctx.typeOf(i) || "") ? m : arr + "[" + i + " as usize]"));
    out = fixResultCalls(out, ctx);
    out = fixRefArgs(out, ctx);
    return out;
  }

  function javaPrint(fn, arg, ctx) {
    arg = arg.trim();
    if (!arg) return fn + "()";
    const s = segments(arg);
    if (s.length === 1 && s[0].str !== undefined) return fn + '("' + escBraces(s[0].str) + '")';
    const cat = javaConcat(arg, ctx);
    if (cat) return fn + '("' + cat.fmt + '"' + cat.args.map((a) => ", " + a).join("") + ")";
    if (/^\w+$/.test(arg) && ctx.isDeclared(arg)) return fn + "(\"{" + arg + (/Vec|HashMap|&\[|Option/.test(ctx.typeOf(arg)) ? ":?" : "") + "}\")";
    return fn + '("{}", ' + javaExpr(arg, ctx) + ")";
  }

  function buildJavaTree(src) {
    // normalise: one statement / brace per line
    const text = src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.split("\n").map((l) => "//" + l.replace(/^\s*\/?\*+\/?/, "")).join("\n"));
    const raw = [];
    for (let line of text.split(/\r?\n/)) {
      line = line.trim();
      if (!line) { raw.push(""); continue; }
      if (line.startsWith("//")) { raw.push(line); continue; }
      if (/^@\w+/.test(line)) { raw.push("// " + line); continue; }
      line = line.replace(/^\}\s*(else|catch|finally)/, "}\n$1");
      for (const piece of line.split("\n")) raw.push(piece.trim());
    }
    const rootNode = { children: [] };
    const stack = [rootNode];
    for (const l of raw) {
      const top = stack[stack.length - 1];
      if (l === "") { top.children.push({ blank: true }); continue; }
      if (l === "}" || l === "};") { if (stack.length > 1) stack.pop(); continue; }
      if (/\{\s*$/.test(l) && !l.startsWith("//")) {
        const node = { text: l.replace(/\s*\{\s*$/, ""), children: [], block: true };
        top.children.push(node);
        stack.push(node);
      } else top.children.push({ text: l, children: [] });
    }
    return rootNode.children;
  }

  function javaParams(src, ctx) {
    const list = [], refs = [];
    for (const p of splitTop(src, ",", true).filter(Boolean)) {
      const m = p.replace(/^final\s+/, "").match(/^(.+?)\s+(\w+)$/);
      if (!m) continue;
      const t = javaType(m[1], true, ctx);
      ctx.declare(m[2], t);
      refs.push(/^&/.test(t));
      list.push(m[2] + ": " + t);
    }
    return { list, refs };
  }

  const JMETHOD = /^((?:(?:public|private|protected|static|final|synchronized|abstract)\s+)*)([\w<>\[\], ]+?)\s+(\w+)\s*\((.*)\)\s*(?:throws\s+[\w, ]+)?$/;

  function hasReturnNull(n) { return (n.children || []).some((c) => /^return\s+null\s*;/.test(c.text || "") || hasReturnNull(c)); }
  function hasThrow(n) { return (n.children || []).some((c) => /^throw\b/.test(c.text || "") || hasThrow(c)); }

  function javaBlock(nodes, d, ctx) {
    const out = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.blank) { out.push(""); continue; }
      const t = n.text;
      let m;
      if (t.startsWith("//")) { out.push(ind(d) + t); continue; }
      if (/^(import|package)\s/.test(t)) { out.push(ind(d) + "// " + t + "  // Rust uses `use` + crates; most java.util types live in std"); continue; }
      if (!n.block) { out.push(ind(d) + javaStmt(t, ctx)); continue; }
      if ((m = t.match(/^(?:\}\s*)?else\s+if\s*\((.*)\)$/))) { out.pop(); out.push(ind(d) + "} else if " + javaExpr(m[1], ctx) + " {", ...javaBlock(n.children, d + 1, ctx), ind(d) + "}"); continue; }
      if (/^(?:\}\s*)?else$/.test(t)) { out.pop(); out.push(ind(d) + "} else {", ...javaBlock(n.children, d + 1, ctx), ind(d) + "}"); continue; }
      if ((m = t.match(/^(if|while)\s*\((.*)\)$/))) {
        const head = m[1] === "while" && m[2].trim() === "true" ? "loop {" : m[1] + " " + javaExpr(m[2], ctx) + " {" + ctx.note("jif", "java: if (c) { } → if c { } (no parentheses needed)");
        out.push(ind(d) + head, ...javaBlock(n.children, d + 1, ctx), ind(d) + "}");
        continue;
      }
      if ((m = t.match(/^for\s*\(\s*(?:final\s+)?[\w<>\[\]]+\s+(\w+)\s*:\s*(.+)\)$/))) {
        ctx.declare(m[1], "?");
        const it = m[2].trim();
        const iter = /^\w+$/.test(it) ? (/^&/.test(ctx.typeOf(it) || "") ? it + ".iter()" : "&" + it) : javaExpr(it, ctx);
        out.push(ind(d) + "for " + m[1] + " in " + iter + " {" + ctx.note("foreach", "java: for (T x : xs) → for x in &xs (borrow)"), ...javaBlock(n.children, d + 1, ctx), ind(d) + "}");
        continue;
      }
      if ((m = t.match(/^for\s*\(\s*(?:int|long|var)\s+(\w+)\s*=\s*(.+?);\s*\1\s*(<=?|>=?)\s*(.+?);\s*(\1\+\+|\+\+\1|\1--|--\1|\1\s*\+=\s*(\d+))\s*\)$/))) {
        const [, v, from, op, to, step, by] = m;
        ctx.declare(v, "usize");
        let range;
        if (op[0] === "<") range = javaExpr(from, ctx) + (op === "<=" ? "..=" : "..") + javaExpr(to, ctx);
        else range = "(" + javaExpr(to, ctx) + (op === ">=" ? "..=" : "+1..=") + javaExpr(from, ctx) + ").rev()";
        if (by) range = "(" + range + ").step_by(" + by + ")";
        out.push(ind(d) + "for " + v + " in " + range + " {" + ctx.note("jfor", "java: for (int i = a; i < b; i++) → for i in a..b"), ...javaBlock(n.children, d + 1, ctx), ind(d) + "}");
        continue;
      }
      if (/^do$/.test(t)) { out.push(ind(d) + "loop { // do { } while (c) → loop { ...; if !c { break; } }", ...javaBlock(n.children, d + 1, ctx), ind(d) + "}"); continue; }
      if (/^try(\s*\(.*\))?$/.test(t)) {
        ctx.warn("try/catch was converted to a plain block. Rust has no exceptions: return Result<T, E> and handle it with match or ?.");
        out.push(ind(d) + "{ // try → Rust has no exceptions; fallible functions return Result<T, E>", ...javaBlock(n.children, d + 1, ctx), ind(d) + "}");
        continue;
      }
      if ((m = t.match(/^(catch|finally)\b(.*)$/))) {
        out.push(ind(d) + "// " + t + " → handle the Err(e) arm of a `match` instead. Original body (commented):");
        javaComment(n.children, d, out);
        continue;
      }
      if (/\b(class|interface|enum|record)\s+\w+/.test(t)) { out.push(...javaClass(n, d, ctx)); continue; }
      if (JMETHOD.test(t)) { out.push(...javaMethod(n, d, ctx, null)); continue; }
      out.push(ind(d) + "{ // " + t, ...javaBlock(n.children, d + 1, ctx), ind(d) + "}");
    }
    return out;
  }

  function javaComment(nodes, d, out) {
    for (const c of nodes) { if (c.blank) continue; out.push(ind(d) + "// " + c.text + (c.block ? " {" : "")); if (c.block) { javaComment(c.children, d + 1, out); out.push(ind(d) + "// }"); } }
  }

  function javaStmt(t, ctx) {
    let m;
    let comment = "";
    const ci = t.indexOf("//");
    if (ci > 0 && segments(t.slice(0, ci)).every((s) => s.code === undefined || true) && !/"[^"]*\/\/[^"]*"/.test(t)) { comment = "  " + t.slice(ci); t = t.slice(0, ci).trim(); }
    if ((m = t.match(/^System\.out\.(println|print)\((.*)\);$/))) return javaPrint(m[1] === "println" ? "println!" : "print!", m[2], ctx) + ";" + ctx.note("jprint", "java: System.out.println → println! macro") + comment;
    if ((m = t.match(/^System\.out\.printf\((.*)\);$/))) { ctx.warn("printf format strings (%d, %s) must be rewritten as {} placeholders."); return "// TODO printf: " + t + comment; }
    if ((m = t.match(/^throw\s+new\s+\w+\((.*)\);$/))) {
      const msg = javaExpr(m[1] || '"error"', ctx);
      return "return Err(" + (/^"/.test(msg) ? msg + ".to_string()" : msg) + ");" + ctx.note("throw", "java: throw → return Err(...) (the method now returns Result)") + comment;
    }
    if ((m = t.match(/^return\b\s*(.*);$/))) {
      let v = m[1] ? javaExpr(m[1], ctx) : "";
      const sc = ctx.scope || {};
      if (/^"/.test(v) && /String/.test(sc.ret || "")) v += ".to_string()";
      if (/^Option</.test(sc.ret || "") && v && v !== "None" && !/^Some\(/.test(v)) v = "Some(" + v + ")";
      if (sc.result) return "return Ok(" + (v || "()") + ");" + comment;
      return "return" + (v ? " " + v : "") + ";" + comment;
    }
    if ((m = t.match(/^(\w+)(\+\+|--);$/)) || (m = t.match(/^(\+\+|--)(\w+);$/))) {
      const v = /\w/.test(m[1][0]) ? m[1] : m[2];
      const op = (m[2] || m[1]).includes("+") ? "+" : "-";
      return v + " " + op + "= 1;" + ctx.note("incr", "java: i++ → i += 1 (Rust has no ++)") + comment;
    }
    if ((m = t.match(JTYPE)) && !/^(return|throw|new)\b/.test(t)) {
      const [, jt, name, rhs] = m;
      let rt = javaType(jt, false, ctx);
      const callM = rhs && rhs.match(/^(\w+)\(/);
      if (callM && ctx.fns[callM[1]] && /^Option</.test(ctx.fns[callM[1]].ret || "")) rt = ctx.fns[callM[1]].ret;
      let val = rhs !== undefined ? javaExpr(rhs, ctx) : null;
      if (rt === "String" && val && /^"/.test(val)) val = "String::from(" + val + ")";
      ctx.declare(name, rt || (val && /HashMap/.test(val) ? "HashMap" : val && /Vec|vec!/.test(val) ? "Vec" : "?"));
      if (rt && /^(Vec|HashMap)/.test(rt) && val && /^vec!/.test(val)) {/* keep */}
      if (val === null) return "let mut " + name + ": " + rt + "; // must be assigned before use" + comment;
      if (/^[A-Z][A-Z0-9_]+$/.test(name) && /final/.test(t)) return "const " + name + ": " + (rt === "String" ? "&str" : rt) + " = " + val.replace(/^String::from\((.*)\)$/, "$1") + ";" + comment;
      const note = /^Vec/.test(rt) ? ctx.note("jvec", "java: List<T>/ArrayList → Vec<T>") : /^HashMap/.test(rt) ? ctx.note("jmap", "java: Map/HashMap → std::collections::HashMap") : ctx.note("jlet", "java: Type x = … → let mut x: Type = … (remove `mut` if never changed)");
      return "let mut " + name + (rt ? ": " + rt : "") + " = " + val + ";" + note + comment;
    }
    if ((m = t.match(/^([\w.\[\]]+)\s*([+\-*/%]?=)\s*(.+);$/))) {
      let v = javaExpr(m[3], ctx);
      if (/String/.test(ctx.typeOf(m[1]) || "") && /^"/.test(v)) v = "String::from(" + v + ")";
      return javaExpr(m[1], ctx) + " " + m[2] + " " + v + ";" + comment;
    }
    if (/^(break|continue);$/.test(t)) return t + comment;
    return javaExpr(t.replace(/;$/, ""), ctx) + ";" + comment;
  }

  function javaMethod(n, d, ctx, cls) {
    const m = n.text.match(JMETHOD);
    const [, mods, rtype, name, params] = m;
    const isStatic = /static/.test(mods);
    const result = hasThrow(n);
    const prev = ctx.scope;
    ctx.newScope({ result, isMethod: !!cls });
    if (name === "main" && isStatic) {
      const body = javaBlock(n.children, d + 1, ctx);
      ctx.scope = prev;
      return [ind(d) + "fn main() {" + ctx.note("jmain", "java: public static void main(String[] args) → fn main() (args via std::env::args())"), ...body, ind(d) + "}"];
    }
    const pr = javaParams(params, ctx);
    let ret = javaType(rtype, false, ctx);
    if (hasReturnNull(n) && ret && ret !== "()") ret = "Option<" + ret + ">";
    ctx.scope.ret = ret;
    if (cls && prev && prev.fields) ctx.scope.fields = prev.fields;
    let body = javaBlock(n.children, d + 1, ctx);
    if (cls && ctx.scope.fields) {
      for (const f of Object.keys(ctx.scope.fields)) {
        if (ctx.isDeclared(f)) continue;
        const re = new RegExp("(?<![\\w.\"])" + f + "\\b(?!\\s*\\()", "g");
        body = body.map((l) => (/^\s*\/\//.test(l) ? l : l.replace(re, "self." + f)));
      }
    }
    let selfArg = "";
    if (cls && !isStatic) selfArg = body.some((l) => /self\.\w+(\[.*\])?\s*([+\-*/]?=(?!=)|\.push\(|\.insert\()/.test(l)) ? "&mut self" : "&self";
    if (ret === "()") ret = null;
    const retStr = result ? " -> Result<" + (ret || "()") + ", String>" : ret ? " -> " + ret : "";
    if (result && !ret) body.push(ind(d + 1) + "Ok(())");
    ctx.scope = prev;
    return [ind(d) + "fn " + snake(name) + "(" + [selfArg, ...pr.list].filter(Boolean).join(", ") + ")" + retStr + " {" + ctx.note("jmethod", "java: methods → fn inside impl; camelCase → snake_case"), ...body, ind(d) + "}"];
  }
  const snake = (s) => (s === "toString" ? "to_string" : s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase());

  function javaClass(n, d, ctx) {
    const m = n.text.match(/\b(class|interface|enum|record)\s+(\w+)(.*)$/);
    const [, kind, name, rest] = m;
    if (kind !== "class") { ctx.warn(kind + " `" + name + "` is not converted (Rust equivalents: trait / enum / struct). Left as comments."); const o = [ind(d) + "// " + n.text + " {"]; javaComment(n.children, d, o); return o.concat(ind(d) + "// }"); }
    if (/\b(extends|implements)\b/.test(rest)) ctx.warn("`" + name + "` uses extends/implements: Rust has no inheritance — use composition and traits.");
    const fields = [], consts = [], methods = [];
    let ctor = null;
    const prevScope = ctx.scope;
    ctx.newScope();
    const classScope = ctx.scope;
    for (const c of n.children) {
      if (c.blank || !c.text) continue;
      if (c.text.startsWith("//")) { methods.push(ind(d + 1) + c.text); continue; }
      if (!c.block) {
        const fm = c.text.replace(/^((?:public|private|protected|static|final)\s+)*/, (mm) => (/static/.test(mm) && /final/.test(mm) ? "§" : "")).match(/^(§)?([\w<>\[\], ]+?)\s+(\w+)\s*(?:=\s*(.+))?;$/);
        if (fm) {
          const [, isConst, jt, fname, init] = fm;
          const rt = javaType(jt, false, ctx);
          if (isConst) consts.push("const " + fname + ": " + (rt === "String" ? "&str" : rt) + " = " + javaExpr(init || "0", ctx) + ";");
          else { fields.push({ name: fname, type: rt, init }); classScope.fields = classScope.fields || {}; classScope.fields[fname] = rt; }
        } else methods.push(ind(d + 1) + "// " + c.text);
        continue;
      }
      const cm = c.text.match(new RegExp("^(?:public|private|protected)?\\s*" + name + "\\s*\\((.*)\\)$"));
      if (cm) { ctor = { node: c, params: cm[1] }; continue; }
      if (JMETHOD.test(c.text)) { ctx.scope = classScope; methods.push("", ...javaMethod(c, d + 1, ctx, name)); continue; }
      methods.push(ind(d + 1) + "// not converted: " + c.text);
    }
    const out = [...consts.map((x) => ind(d) + x)];
    out.push(ind(d) + "#[derive(Debug, Clone)]", ind(d) + "struct " + name + " {" + ctx.note("jclass", "java: class → struct (fields) + impl (methods)"));
    fields.forEach((f) => out.push(ind(d + 1) + f.name + ": " + f.type + ","));
    out.push(ind(d) + "}", "", ind(d) + "impl " + name + " {");
    if (ctor) {
      ctx.newScope();
      const pr = javaParams(ctor.params, ctx);
      const assigned = {};
      const extra = [];
      for (const s of ctor.node.children) {
        const am = (s.text || "").match(/^(?:this\.)?(\w+)\s*=\s*(.+);$/);
        if (am && fields.some((f) => f.name === am[1])) assigned[am[1]] = javaExpr(am[2], ctx);
        else if (s.text) extra.push(s.text);
      }
      if (extra.length) ctx.warn("Constructor of `" + name + "` has extra logic; it was left as comments.");
      const inits = fields.map((f) => {
        let v = assigned[f.name] || (f.init ? javaExpr(f.init, ctx) : "Default::default()");
        if (f.type === "String" && (/^"/.test(v) || ctx.typeOf(v) === "&str")) v = /^"/.test(v) ? "String::from(" + v + ")" : v + ".to_string()";
        if (/^Vec/.test(f.type) && /^&\[/.test(ctx.typeOf(v) || "")) v = v + ".to_vec()";
        return v === f.name ? f.name : f.name + ": " + v;
      });
      out.push(ind(d + 1) + "fn new(" + pr.list.join(", ") + ") -> Self {" + ctx.note("jctor", "java: constructor → associated fn new() -> Self"), ...extra.map((x) => ind(d + 2) + "// " + x), ind(d + 2) + "Self { " + inits.join(", ") + " }", ind(d + 1) + "}");
    }
    out.push(...methods, ind(d) + "}");
    ctx.scope = prevScope;
    return out;
  }

  function prescanJava(tree, ctx) {
    const walk = (nodes, cls) => {
      for (const n of nodes) {
        if (!n.text || !n.block) continue;
        const cm = n.text.match(/\bclass\s+(\w+)/);
        if (cm) { ctx.classes[cm[1]] = {}; walk(n.children, cm[1]); continue; }
        const m = n.text.match(JMETHOD);
        if (m && /static/.test(m[1])) {
          const tmp = new Ctx("java");
          tmp.newScope();
          const pr = javaParams(m[4], tmp);
          let ret = javaType(m[2], false, tmp);
          if (hasReturnNull(n) && ret !== "()") ret = "Option<" + ret + ">";
          ctx.fns[m[3]] = { refParams: pr.refs, result: hasThrow(n), snake: snake(m[3]), ret };
        }
      }
    };
    walk(tree, null);
  }

  function convertJava(src) {
    const ctx = new Ctx("java");
    const tree = buildJavaTree(src);
    prescanJava(tree, ctx);
    ctx.newScope();
    // Main class wrapper: if a class only holds static methods (incl. main), unwrap it to free functions.
    const items = [];
    for (const n of tree) {
      const cm = n.text && n.text.match(/\bclass\s+(\w+)/);
      const onlyStatic = cm && n.children.every((c) => c.blank || !c.text || c.text.startsWith("//") || (c.block ? /\bstatic\b/.test(c.text) || /\bclass\s/.test(c.text) : /\bstatic\b/.test(c.text)));
      if (cm && onlyStatic) {
        items.push("// class " + cm[1] + " held only static members → free functions");
        for (const c of n.children) {
          if (c.blank) { items.push(""); continue; }
          if (c.block && /\bclass\s/.test(c.text)) { items.push(...javaClass(c, 0, ctx)); continue; }
          if (c.block) { ctx.newScope(); items.push(...javaMethod(c, 0, ctx, null)); continue; }
          if (c.text.startsWith("//")) { items.push(c.text); continue; }
          const fm = c.text.match(/^(?:(?:public|private|protected)\s+)?static\s+final\s+([\w<>\[\]]+)\s+(\w+)\s*=\s*(.+);$/);
          items.push(fm ? "const " + fm[2] + ": " + javaType(fm[1], false, ctx).replace(/^String$/, "&str") + " = " + javaExpr(fm[3], ctx) + ";" : "// " + c.text);
        }
      } else items.push(...javaBlock([n], 0, ctx));
    }
    // camelCase calls → snake_case
    let code = items.join("\n");
    for (const [name, info] of Object.entries(ctx.fns)) if (info.snake && info.snake !== name) code = code.replace(new RegExp("(?<![\\w.])" + name + "\\(", "g"), info.snake + "(");
    code = code.replace(/\.(\w+)\(/g, (m, meth) => (/[a-z][A-Z]/.test(meth) && !["to_string"].includes(meth) ? "." + snake(meth) + "(" : m));
    const lines = code.split("\n");
    if (!lines.some((l) => /^fn main\(/.test(l))) lines.push("", "fn main() {", "    // TODO: call your code here", "}");
    const out = [];
    if (ctx.usesHashMap) out.push("use std::collections::HashMap;", "");
    out.push(...lines);
    return finish(out, ctx);
  }

  function finish(lines, ctx) {
    while (lines.length && !lines[0].trim()) lines.shift();
    const code = lines.join("\n").replace(/\n[ \t]*(?=\n)/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/\n\n(\s*\})/g, "\n$1").replace(/\n\}\n(?=(fn |struct |impl |#\[|const |\/\/))/g, "\n}\n\n").trimEnd() + "\n";
    const header = [
      "// ⚠️ Draft generated by Rust RO converter (rule-based, no AI) from " + (ctx.lang === "python" ? "Python" : "Java") + ".",
      "// It is a STARTING POINT, not a guaranteed 1:1 translation. Review it and run `cargo check`.",
      "",
      ""
    ].join("\n");
    return { code: header + code, warnings: ctx.warnings.slice() };
  }

  function convert(src, lang) {
    if (lang !== "python" && lang !== "java") lang = detect(src);
    try {
      return Object.assign({ lang }, lang === "java" ? convertJava(src) : convertPython(src));
    } catch (e) {
      return { lang, code: "// Converter error: " + e.message + "\n// Try a smaller snippet.", warnings: ["Internal converter error: " + e.message] };
    }
  }

  function detect(src) {
    if (/\b(public|private|class\s+\w+\s*\{|System\.out|;\s*$)/m.test(src)) return "java";
    return "python";
  }

  return { convert, detect, _internals: { splitTop, segments, fstring } };
});
