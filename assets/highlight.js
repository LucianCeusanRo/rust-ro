/* Tiny Rust syntax highlighter (no dependencies, works offline). */
(function (root) {
  const KW = "as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while";
  const kw = new Set(KW.split(" "));
  const PRIM = new Set("i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str".split(" "));
  const RE = /(\/\/[^\n]*)|("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])')|('[A-Za-z_]\w*)|(#!?\[[^\]\n]*\])|(\b\d[\d_]*(?:\.\d[\d_]*)?(?:[iu](?:8|16|32|64|128|size)|f32|f64)?\b)|(\b[a-z_]\w*!)|(\b[A-Za-z_]\w*\b)/g;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function rust(src) {
    let out = "", last = 0, m, prevFn = false;
    RE.lastIndex = 0;
    while ((m = RE.exec(src))) {
      out += esc(src.slice(last, m.index));
      last = RE.lastIndex;
      const t = m[0];
      let cls = null;
      if (m[1]) cls = "c";
      else if (m[2] || m[3]) cls = "s";
      else if (m[4]) cls = "l";
      else if (m[5]) cls = "a";
      else if (m[6]) cls = "n";
      else if (m[7]) cls = "m";
      else if (m[8]) {
        if (prevFn) cls = "f";
        else if (kw.has(t)) cls = "k";
        else if (PRIM.has(t) || /^[A-Z]/.test(t)) cls = "t";
      }
      prevFn = m[8] === "fn";
      out += cls ? '<span class="tok-' + cls + '">' + esc(t) + "</span>" : esc(t);
    }
    return out + esc(src.slice(last));
  }
  function shell(src) {
    return src.split("\n").map((l) => {
      const i = l.indexOf("#");
      return i >= 0 ? esc(l.slice(0, i)) + '<span class="tok-c">' + esc(l.slice(i)) + "</span>" : esc(l);
    }).join("\n");
  }
  root.RustHL = { rust, shell, esc };
})(typeof self !== "undefined" ? self : this);
