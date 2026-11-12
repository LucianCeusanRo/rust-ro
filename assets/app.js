/* Rust RO — app (static, no backend). Progress + streak in localStorage. */
(function () {
  "use strict";
  const LESSONS = window.RUST_LESSONS;
  const UI = window.RUST_UI;
  const HL = window.RustHL;
  const $ = (s, el) => (el || document).querySelector(s);
  const app = $("#app");
  const PKEY = "rustro.progress.v1";
  const PLAY = "https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&code=";

  /* ── state ── */
  const blank = () => ({ lang: (navigator.language || "ro").startsWith("ro") ? "ro" : "en", done: {}, quiz: {}, final: null, days: [], streak: 0, bestStreak: 0 });
  let S;
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(PKEY) || "{}")); } catch (e) { S = blank(); }
  const save = () => { try { localStorage.setItem(PKEY, JSON.stringify(S)); } catch (e) { /* private mode */ } };
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  function touchStreak() {
    const t = today();
    if (S.days.includes(t)) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const ys = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
    S.streak = S.days.includes(ys) ? S.streak + 1 : 1;
    S.bestStreak = Math.max(S.bestStreak, S.streak);
    S.days = S.days.concat(t).slice(-60);
  }
  function currentStreak() {
    const t = today();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const ys = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
    return S.days.includes(t) || S.days.includes(ys) ? S.streak : 0;
  }

  const t = (k, v) => { let s = (UI[S.lang] || UI.ro)[k] || k; if (v) for (const [a, b] of Object.entries(v)) s = s.replace("{" + a + "}", b); return s; };
  const L = (o) => (o == null ? "" : typeof o === "string" ? o : o[S.lang] || o.ro);
  const esc = HL.esc;

  /* ── discord (opt-in) ── */
  const DStore = window.RustDiscord.makeStore(localStorage);
  const DClient = window.RustDiscord.createClient({ fetch: (...a) => window.fetch(...a) });
  function discordEvent(kind, data) {
    const cfg = DStore.load();
    const allowed = { lesson: cfg.lessons, quiz: cfg.quizzes, converter: cfg.converter }[kind];
    if (!cfg.url || !allowed) return Promise.resolve(null);
    return DClient.send(cfg.url, kind, data, S.lang);
  }

  /* ── ui helpers ── */
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast"; el.setAttribute("role", "status"); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
  function codeBlock(src, opts) {
    opts = opts || {};
    const id = "c" + Math.random().toString(36).slice(2, 8);
    const isShell = opts.shell;
    return `<div class="code${isShell ? " shell" : ""}"><pre tabindex="0" aria-label="${isShell ? "terminal" : "Rust"}"><code id="${id}">${isShell ? HL.shell(src) : HL.rust(src)}</code></pre>
      <div class="bar2">${opts.fails ? `<span class="fails">⛔ ${t("failsBadge")} (${opts.fails})</span>` : ""}<span class="sp"></span>
      <button class="btn small ghost" data-copy="${id}">${t("copy")}</button>
      ${isShell ? "" : `<a class="btn small" target="_blank" rel="noopener" href="${PLAY + encodeURIComponent(src)}">▶ ${t("openPlay")}</a>`}</div></div>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    const txt = document.getElementById(b.dataset.copy).textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast(t("copied")), () => toast("⚠"));
  });

  function header() {
    const done = Object.keys(S.done).length;
    $("#hdr").innerHTML = `<a class="skip" href="#app">Skip to content</a>
      <a class="brand" href="#/"><span class="crab" aria-hidden="true">🦀</span> Rust <b>RO</b></a><span class="sp"></span>
      <span class="pill hide-s" title="${t("streak")}">🔥 <b>${currentStreak()}</b></span>
      <span class="pill hide-s">✅ <b>${done}/${LESSONS.length}</b></span>
      <div class="lang" role="group" aria-label="${t("lang")}">
        <button type="button" data-lang="ro" aria-pressed="${S.lang === "ro"}">RO</button>
        <button type="button" data-lang="en" aria-pressed="${S.lang === "en"}">EN</button></div>`;
    document.documentElement.lang = S.lang;
    const route = location.hash.split("/")[1] || "";
    const items = [["", "🏠", t("home")], ["lesson", "📚", t("lessons")], ["why", "⚡", t("why")], ["net", "🌐", t("net")], ["convert", "🔄", t("conv")], ["settings", "⚙️", t("settings")]];
    $("#nav").innerHTML = items.map(([r, i, l]) => `<a href="#/${r}${r === "lesson" ? "/" + nextLessonId() : ""}" ${route === r || (r === "lesson" && route === "quiz") ? 'aria-current="page"' : ""}><span class="i" aria-hidden="true">${i}</span>${l}</a>`).join("");
    $("#nav").setAttribute("aria-label", "Navigation");
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]");
    if (!b) return;
    S.lang = b.dataset.lang; save(); render();
  });
  const nextLessonId = () => (LESSONS.find((l) => !S.done[l.id]) || LESSONS[0]).id;
  const avgScore = () => { const v = Object.values(S.quiz); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; };

  /* ── pages ── */
  function home() {
    const done = Object.keys(S.done).length;
    const pct = Math.round((100 * done) / LESSONS.length);
    return `<section class="hero"><div class="big" aria-hidden="true">🦀</div>
        <span class="badge rust">v1 · RO / EN</span>
        <h1>${esc(t("tagline"))}</h1><p>${esc(t("heroP"))}</p>
        <div class="row"><a class="btn primary" href="#/lesson/${nextLessonId()}">${done ? t("cont") : t("start")} →</a>
        <a class="btn" href="#/why">⚡ ${t("why")}</a><a class="btn" href="#/convert">🔄 ${t("conv")}</a></div></section>
      <div class="stats" role="list">
        <div class="stat" role="listitem"><b>${done}/${LESSONS.length}</b><span>${t("done")}</span></div>
        <div class="stat" role="listitem"><b>🔥 ${currentStreak()}</b><span>${t("streak")}</span></div>
        <div class="stat" role="listitem"><b>${avgScore()}%</b><span>${t("best")}</span></div></div>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${t("progress")}"><i style="width:${pct}%"></i></div>
      <h2>${t("lessons")}</h2>
      <div class="grid">${LESSONS.map((l) => `<a class="card" href="#/lesson/${l.id}"><span class="ic" aria-hidden="true">${l.icon}</span>
        <h3>${l.id}. ${esc(L(l.title))}</h3><p class="meta">${L(l.summary)}</p>
        <div class="row">${S.done[l.id] ? `<span class="badge ok">✓ ${S.quiz[l.id]}%</span>` : S.quiz[l.id] != null ? `<span class="badge warn">${S.quiz[l.id]}%</span>` : `<span class="badge">${l.quiz.length} ${t("quiz").toLowerCase()}</span>`}</div></a>`).join("")}</div>
      <h2>${S.lang === "ro" ? "Mai mult" : "More"}</h2>
      <div class="grid">
        <a class="card" href="#/net"><span class="ic">🌐</span><h3>${S.lang === "ro" ? "Rust pentru rețeliști" : "Rust for network folks"}</h3><p class="meta">${S.lang === "ro" ? "Verificator de porturi TCP și parser de loguri, rulate local cu cargo." : "TCP port checker and log parser, run locally with cargo."}</p></a>
        <a class="card" href="#/final"><span class="ic">🏁</span><h3>${t("final")}</h3><p class="meta">${t("finalIntro")}</p>${S.final != null ? `<span class="badge ${S.final >= 70 ? "ok" : "warn"}">${t("bestScore")}: ${S.final}%</span>` : ""}</a>
        <a class="card" href="#/convert"><span class="ic">🔄</span><h3>${S.lang === "ro" ? "Convertor Python/Java → Rust" : "Python/Java → Rust converter"}</h3><p class="meta">${S.lang === "ro" ? "Ciornă automată în browser, fără AI, cu explicații pe fiecare linie." : "Automatic draft in your browser, no AI, with explanations per line."}</p></a>
        <a class="card" href="#/settings"><span class="ic">💬</span><h3>Discord</h3><p class="meta">${S.lang === "ro" ? "Opțional: trimite progresul pe webhook-ul tău de Discord." : "Optional: post your progress to your own Discord webhook."}</p></a>
      </div>`;
  }

  function lesson(id) {
    const l = LESSONS.find((x) => x.id === id);
    if (!l) return notFound();
    const nxt = LESSONS.find((x) => x.id === id + 1);
    return `<p class="muted"><a href="#/">${t("home")}</a> / ${t("lesson")} ${l.id}</p>
      <h1>${l.icon} ${esc(L(l.title))}</h1><p class="lesson-p">${L(l.summary)}</p>
      ${S.done[l.id] ? `<span class="badge ok">✓ ${t("done")} · ${S.quiz[l.id]}%</span>` : ""}
      ${l.sections.map((s) => `<section><h2>${esc(L(s.h))}</h2><p class="lesson-p">${L(s.p)}</p>
        ${s.shell ? codeBlock(s.shell, { shell: true }) : ""}${s.code ? codeBlock(s.code, { fails: s.fails }) : ""}</section>`).join("")}
      <h2>✍️ ${t("exercises")}</h2>
      ${l.exercises.map((e, i) => `<div class="card ex"><h3>${t("exerciseN")} ${i + 1}: ${esc(L(e.title))}</h3>
        <p class="lesson-p"><b>${t("task")}:</b> ${L(e.task)}</p>
        <p class="muted" style="margin-bottom:0">${t("starter")}</p>${codeBlock(e.starter, { fails: e.starterFails })}
        <details><summary>💡 ${t("hint")}</summary><p class="lesson-p">${L(e.hint)}</p></details>
        <details><summary>✅ ${t("solution")}</summary>${codeBlock(e.solution)}</details></div>`).join("")}
      <div class="row" style="margin-top:20px"><a class="btn primary" href="#/quiz/${l.id}">📝 ${t("startQuiz")} (${l.quiz.length})</a>
        ${nxt ? `<a class="btn" href="#/lesson/${nxt.id}">${t("nextLesson")} →</a>` : `<a class="btn" href="#/final">🏁 ${t("final")}</a>`}</div>`;
  }

  /* quiz engine (lesson quiz + final test) */
  let Q = null;
  function startQuiz(kind, id) {
    let qs;
    if (kind === "final") {
      const all = [];
      LESSONS.forEach((l) => l.quiz.forEach((q) => all.push(Object.assign({ from: l.id }, q))));
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      qs = all.slice(0, 15);
    } else qs = LESSONS.find((l) => l.id === id).quiz;
    Q = { kind, id, qs, i: 0, score: 0, answered: null };
  }
  function quizView() {
    const q = Q.qs[Q.i];
    const title = Q.kind === "final" ? t("final") : t("lesson") + " " + Q.id + " · " + t("quiz");
    const opts = q.o[S.lang] || q.o.ro;
    return `<p class="muted">${title}</p>
      <div class="progress-dots" aria-hidden="true">${Q.qs.map((_, k) => `<i class="${k < Q.i + (Q.answered != null ? 1 : 0) ? "on" : ""}"></i>`).join("")}</div>
      <p class="muted" aria-live="polite">${t("qOf", { a: Q.i + 1, b: Q.qs.length })}${q.from ? " · " + t("lesson") + " " + q.from : ""}</p>
      <h1 class="q" id="qtext">${L(q.q)}</h1>
      <div class="opts" role="group" aria-labelledby="qtext">${opts.map((o, k) => {
        let cls = "";
        if (Q.answered != null) { if (k === q.a) cls = "right"; else if (k === Q.answered) cls = "wrong"; }
        return `<button class="opt ${cls}" data-opt="${k}" ${Q.answered != null ? "disabled" : ""}><span class="k">${"ABCD"[k]}</span><span>${o}</span></button>`;
      }).join("")}</div>
      <div aria-live="assertive">${Q.answered != null ? `<div class="exp ${Q.answered === q.a ? "ok" : "no"}"><b>${Q.answered === q.a ? "✅ " + t("correct") : "❌ " + t("wrong") + " " + t("answer") + ": " + "ABCD"[q.a]}</b><p>${L(q.e)}</p></div>
        <div class="row" style="margin-top:14px"><button class="btn primary" id="qnext">${Q.i + 1 < Q.qs.length ? t("next") + " →" : t("finish")}</button></div>` : ""}</div>`;
  }
  function quizResult() {
    const pct = Math.round((100 * Q.score) / Q.qs.length);
    const pass = pct >= 70;
    let extra = "";
    if (Q.kind === "lesson") {
      const l = LESSONS.find((x) => x.id === Q.id);
      if (!Q.recorded) {
        Q.recorded = true;
        const before = !!S.done[l.id];
        S.quiz[l.id] = Math.max(S.quiz[l.id] || 0, pct);
        if (pass) S.done[l.id] = true;
        touchStreak(); save();
        discordEvent("quiz", { title: L(l.title), score: Q.score, total: Q.qs.length });
        if (pass && !before) discordEvent("lesson", { title: L(l.title), done: Object.keys(S.done).length, total: LESSONS.length });
      }
      const nxt = LESSONS.find((x) => x.id === Q.id + 1);
      extra = `<a class="btn" href="#/lesson/${Q.id}">${t("back")}</a>${nxt ? `<a class="btn primary" href="#/lesson/${nxt.id}">${t("nextLesson")} →</a>` : `<a class="btn primary" href="#/final">🏁 ${t("final")}</a>`}`;
    } else {
      if (!Q.recorded) { Q.recorded = true; S.final = Math.max(S.final || 0, pct); touchStreak(); save(); discordEvent("quiz", { title: t("final"), score: Q.score, total: Q.qs.length }); }
      extra = `<a class="btn" href="#/">${t("toLessons")}</a>`;
    }
    header();
    return `<p class="muted">${t("result")}</p><div class="score" role="status">${Q.score}/${Q.qs.length} · ${pct}%</div>
      <p>${pass ? "🎉 " + (Q.kind === "lesson" ? t("passed") : (S.lang === "ro" ? "Ai trecut testul final!" : "You passed the final test!")) : "🔁 " + t("failed")}</p>
      <div class="row"><button class="btn" id="qretry">↻ ${t("retry")}</button>${extra}</div>`;
  }
  function bindQuiz() {
    app.querySelectorAll("[data-opt]").forEach((b) => b.addEventListener("click", () => {
      if (Q.answered != null) return;
      Q.answered = +b.dataset.opt;
      if (Q.answered === Q.qs[Q.i].a) Q.score++;
      app.innerHTML = quizView(); bindQuiz();
      const n = $("#qnext"); if (n) n.focus();
    }));
    const n = $("#qnext");
    if (n) n.addEventListener("click", () => {
      Q.i++; Q.answered = null;
      if (Q.i >= Q.qs.length) { app.innerHTML = quizResult(); bindQuiz(); return; }
      app.innerHTML = quizView(); bindQuiz(); $("#qtext").focus();
    });
    const r = $("#qretry");
    if (r) r.addEventListener("click", () => { startQuiz(Q.kind, Q.id); app.innerHTML = quizView(); bindQuiz(); });
  }

  function finalIntro() {
    return `<h1>🏁 ${t("final")}</h1><p>${t("finalIntro")}</p>${S.final != null ? `<p><span class="badge ${S.final >= 70 ? "ok" : "warn"}">${t("bestScore")}: ${S.final}%</span></p>` : ""}
      <button class="btn primary" id="gofinal">${t("startFinal")} →</button>`;
  }

  function net() {
    const ro = S.lang === "ro";
    return `<h1>🌐 ${ro ? "Rust pentru rețeliști" : "Rust for network folks"}</h1><p class="lesson-p">${t("netIntro")}</p>
      ${window.RUST_NET.map((n) => `<section class="card" style="margin:16px 0"><h2 style="margin-top:0">${n.icon} ${esc(L(n.title))}</h2>
        <h3>${t("whatItDoes")}</h3><p class="lesson-p">${L(n.what)}</p>
        <h3>${t("youLearn")}</h3><ul>${(n.learn[S.lang] || n.learn.ro).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <h3>${t("runLocal")}</h3>${codeBlock(n.run, { shell: true })}
        <p class="note">⚠️ ${L(n.warn)}</p>
        <details><summary>📄 ${t("fullCode")}</summary>${codeBlock(n.code)}</details>
        ${n.sample ? `<details><summary>🧪 ${t("sampleLog")}</summary>${codeBlock(n.sample, { shell: true })}</details>` : ""}</section>`).join("")}`;
  }

  function why() {
    const ro = S.lang === "ro";
    const W = window.RUST_WHY;
    const R = Object.fromEntries(W.bench.results.map((r) => [r.label, r]));
    const pair = (name) => [R[name + " Python"], R[name + " Rust"]];
    const fx = (a, b) => (a / b).toFixed(a / b >= 10 ? 0 : 1);
    const chart = (name, key, unit) => {
      const [p, r] = pair(name);
      const mx = Math.max(p[key], r[key]);
      return `<div class="hbar"><span class="lbl">Python</span><div class="track"><div class="fill py" style="width:${(100 * p[key]) / mx}%">${p[key]} ${unit}</div></div></div>
        <div class="hbar"><span class="lbl">Rust</span><div class="track"><div class="fill rs" style="width:${Math.max(3, (100 * r[key]) / mx)}%">${r[key]} ${unit}</div></div></div>`;
    };
    const [sp, sr] = pair("sieve"), [cp, cr] = pair("collatz");
    const src = (u, label) => `<a href="${u}" target="_blank" rel="noopener">${label}</a>`;
    return `<h1>⚡ ${ro ? "De ce Rust?" : "Why Rust?"}</h1>
      <p class="lesson-p">${ro ? "Patru motive concrete, cu cifre măsurate de noi sau cu surse. Fără promisiuni magice: Rust nu face orice program mai rapid, iar învățarea durează." : "Four concrete reasons, with numbers we measured ourselves or with sources. No magic promises: Rust doesn't make every program faster, and learning it takes time."}</p>

      <section class="card"><h2 style="margin-top:0">🧠 1. ${ro ? "Mai puțină memorie RAM" : "Less RAM"}</h2>
        <p class="lesson-p">${ro ? "Rust nu are garbage collector și nici mașină virtuală: memoria se eliberează exact când variabila iese din scope (ownership). Datele stau compact — un <code>Vec&lt;bool&gt;</code> folosește 1 octet pe element, pe când o listă Python ține un pointer de 8 octeți pentru fiecare element. Abstracțiile (iteratori, generice) sunt „zero-cost”: se compilează la același cod ca o buclă scrisă de mână." : "Rust has no garbage collector and no virtual machine: memory is freed exactly when a variable goes out of scope (ownership). Data is stored compactly — a <code>Vec&lt;bool&gt;</code> uses 1 byte per element, while a Python list keeps an 8-byte pointer per element. Abstractions (iterators, generics) are “zero-cost”: they compile to the same code as a hand-written loop."}</p>
        <p class="lesson-p"><b>${ro ? "Măsurat pe acest calculator" : "Measured on this machine"}</b> (${ro ? "ciurul lui Eratostene până la 10 milioane, memorie maximă" : "Sieve of Eratosthenes up to 10 million, peak memory"}):</p>
        ${chart("sieve", "peak_rss_mib", "MiB")}
        <p class="lesson-p">≈ <b>${fx(sp.peak_rss_mib, sr.peak_rss_mib)}×</b> ${ro ? "mai puțină memorie pentru aceeași problemă." : "less memory for the same problem."}</p>
        <p class="note info">💸 ${ro ? "De ce contează acum: memoria s-a scumpit puternic în 2026. TrendForce a estimat pentru T1 2026 o creștere a prețurilor contractuale DRAM convenționale de 90–95% față de trimestrul anterior, iar pentru T4 2026 încă +10–15% (PC DRAM +13–18%), din cauza cererii pentru servere AI. Mai puțină RAM per serviciu = mașini mai mici sau mai multe servicii pe același hardware." : "Why it matters now: memory got much more expensive in 2026. TrendForce estimated a 90–95% quarter-over-quarter rise in conventional DRAM contract prices for 1Q26, and another +10–15% for 4Q26 (PC DRAM +13–18%), driven by AI server demand. Less RAM per service = smaller machines or more services on the same hardware."}
          <br>${ro ? "Surse" : "Sources"}: ${src("https://www.trendforce.com/presscenter/news/20260202-12911.html", "TrendForce, 2 Feb 2026")} · ${src("https://www.trendforce.com/presscenter/news/20260930-13258.html", "TrendForce, 30 Sep 2026")} · ${src("https://www.trendforce.com/presscenter/news/20261111-13303.html", "TrendForce, 11 Nov 2026")}</p></section>

      <section class="card" style="margin-top:14px"><h2 style="margin-top:0">🚀 2. ${ro ? "Mult mai rapid în bucle grele de CPU" : "Much faster in CPU-heavy loops"}</h2>
        <p class="lesson-p">${ro ? "Codul Rust e compilat în instrucțiuni native; Python interpretează fiecare operație. Diferența se vede în bucle strânse, calcule și parsare." : "Rust is compiled to native instructions; Python interprets every operation. The difference shows in tight loops, number crunching and parsing."}</p>
        <h3>${ro ? "Ciur până la 10.000.000 (timp)" : "Sieve up to 10,000,000 (time)"}</h3>${chart("sieve", "median_s", "s")}
        <h3>${ro ? "Cel mai lung lanț Collatz sub 1.000.000 (timp)" : "Longest Collatz chain below 1,000,000 (time)"}</h3>${chart("collatz", "median_s", "s")}
        <p class="lesson-p">≈ <b>${fx(sp.median_s, sr.median_s)}×</b> ${ro ? "și" : "and"} ≈ <b>${fx(cp.median_s, cr.median_s)}×</b> ${ro ? "mai rapid, cu exact același algoritm și același rezultat." : "faster, with exactly the same algorithm and the same result."}</p>
        <details><summary>🔬 ${ro ? "Cum am măsurat (reproductibil)" : "How we measured (reproducible)"}</summary>
          <p class="lesson-p">${ro ? "Mediana a 3 rulări; memorie = VmHWM maxim din /proc/&lt;pid&gt;/status. Comanda:" : "Median of 3 runs; memory = max VmHWM from /proc/&lt;pid&gt;/status. Command:"}</p>
          ${codeBlock("python3 bench/run.py\n# " + W.bench.results.map((r) => r.cmd).join("\n# "), { shell: true })}
          <table><thead><tr><th>Benchmark</th><th>${ro ? "Timp (mediană)" : "Time (median)"}</th><th>Peak RSS</th><th>Output</th></tr></thead><tbody>
          ${W.bench.results.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.median_s} s</td><td>${r.peak_rss_mib} MiB</td><td><code>${esc(r.output)}</code></td></tr>`).join("")}</tbody></table>
          <p class="muted">${esc(W.bench.python)} · ${esc(W.bench.rustc)} · ${esc(W.bench.cpu)} · ${esc(W.bench.date)}</p>
          ${W.snippets.map((s) => `<h3>${s.id}.rs</h3>${codeBlock(s.code)}`).join("")}
        </details>
        <p class="note">⚠️ ${ro ? "Limite oneste: e Python pur, fără NumPy. Cu NumPy sau extensii în C diferența scade mult; programele care așteaptă după rețea/disc (I/O) nu câștigă mare lucru. Pentru comparații pe mai multe limbaje vezi" : "Honest limits: this is pure Python, no NumPy. With NumPy or C extensions the gap shrinks a lot; programs that mostly wait on network/disk (I/O) gain little. For broader cross-language comparisons see"} ${src("https://benchmarksgame-team.pages.debian.net/benchmarksgame/index.html", "The Benchmarks Game")}.</p></section>

      <section class="card" style="margin-top:14px"><h2 style="margin-top:0">🛡️ 3. ${ro ? "Siguranța memoriei" : "Memory safety"}</h2>
        <p class="lesson-p">${ro ? "Borrow checker-ul refuză la compilare use-after-free, pointerii atârnați și data races între fire de execuție. Asta contează: echipa Chromium raportează că aproximativ 70% din bug-urile lor de securitate grave sunt probleme de siguranță a memoriei (în C/C++) și menționează Rust printre limbajele mai sigure pe care le folosesc." : "The borrow checker rejects use-after-free, dangling pointers and data races between threads at compile time. That matters: the Chromium team reports that around 70% of their serious security bugs are memory safety problems (in C/C++) and lists Rust among the safer languages they adopt."}
        ${src("https://www.chromium.org/Home/chromium-security/memory-safety/", "chromium.org — Memory safety")}</p></section>

      <section class="card" style="margin-top:14px"><h2 style="margin-top:0">🤖 4. ${ro ? "Vibe coding face startul mai ușor" : "Vibe coding makes starting easier"}</h2>
        <p class="lesson-p">${ro ? "Cu un asistent AI scrii repede prima versiune, iar compilatorul Rust îți dă mesaje de eroare foarte precise (chiar cu sugestia de reparare), pe care le poți da înapoi asistentului. Bucla „scrie → cargo check → repară” e rapidă." : "With an AI assistant you get a first version quickly, and the Rust compiler gives very precise error messages (often with the fix), which you can feed back to the assistant. The “write → cargo check → fix” loop is fast."}</p>
        <p class="note">⚠️ ${ro ? "Dar: portarea din Python e mai grea decât pare — trebuie gândit cine deține datele, tipurile sunt stricte și nu există excepții. De aceea lecțiile 4 și 6 sunt cele mai importante. Convertorul nostru îți dă doar o ciornă de pornire." : "But: porting from Python is harder than it looks — you have to think about who owns the data, types are strict and there are no exceptions. That's why lessons 4 and 6 matter most. Our converter only gives you a starting draft."}</p>
        <div class="row"><a class="btn primary" href="#/lesson/4">🔐 ${t("lesson")} 4</a><a class="btn" href="#/convert">🔄 ${t("conv")}</a></div></section>`;
  }

  function convert() {
    const ro = S.lang === "ro";
    const EX = window.RUST_CONVERTER_EXAMPLES;
    const cfg = DStore.load();
    return `<h1>🔄 ${ro ? "Convertor Python/Java → Rust" : "Python/Java → Rust converter"}</h1>
      <p class="note">⚠️ ${ro ? "Rulează 100% în browser, pe reguli (fără AI, fără server). Rezultatul este o <b>ciornă de pornire</b>, nu o traducere garantată 1:1 — verifică-l mereu cu <code>cargo check</code>." : "Runs 100% in your browser, rule-based (no AI, no server). The result is a <b>starting draft</b>, not a guaranteed 1:1 translation — always check it with <code>cargo check</code>."}</p>
      <div class="row" style="margin:12px 0" role="group" aria-label="${ro ? "Exemple" : "Examples"}">${EX.map((e) => `<button class="btn small" data-ex="${e.id}">${esc(L(e.title))}</button>`).join("")}</div>
      <div class="split"><div>
        <label class="f" for="cin">${ro ? "Codul tău (Python sau Java)" : "Your code (Python or Java)"}</label>
        <textarea id="cin" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(EX[0].src)}</textarea>
        <div class="row" style="margin-top:10px"><label for="clang" class="muted">${ro ? "Limbaj" : "Language"}</label>
          <select id="clang" style="width:auto"><option value="auto">Auto</option><option value="python">Python</option><option value="java">Java</option></select>
          <button class="btn primary" id="cgo">⚙️ ${ro ? "Convertește" : "Convert"}</button></div></div>
        <div><p class="f" style="font-weight:600;margin:12px 0 6px">Rust (${ro ? "ciornă" : "draft"})</p><div id="cout"></div><div id="cwarn"></div>
          ${cfg.url && cfg.converter ? `<button class="btn small" id="cdisc">💬 ${ro ? "Trimite pe Discord-ul meu" : "Send to my Discord"}</button>` : ""}</div></div>
      <h2>${ro ? "Ce traduce" : "What it translates"}</h2>
      <table><thead><tr><th>Python / Java</th><th>Rust</th></tr></thead><tbody>
        ${[["def f(a: int) -> int / int f(int a)", "fn f(a: i64) -> i64 / fn f(a: i32) -> i32"], ["x = 5 / int x = 5;", "let mut x = 5;"], ["if / elif / else, while, while True", "if / else if / else, while, loop"],
          ["for i in range(a, b) / for (int i = a; i < b; i++)", "for i in a..b"], ["for x in items / for (T x : items)", "for x in &items"], ["list, [] / List, ArrayList", "Vec<T>, vec![]"],
          ["dict, {} / Map, HashMap", "HashMap<K, V>"], ["class + __init__ / class + constructor", "struct + impl + fn new() -> Self"], ["print(f\"{x}\") / System.out.println(\"a\" + x)", "println!(\"{x}\")"],
          ["raise / throw", "return Err(...) + Result<T, String>"], ["None / null", "None + Option<T>"], ["and, or, not, is None", "&&, ||, !, .is_none()"]].map(([a, b]) => `<tr><td><code>${esc(a)}</code></td><td><code>${esc(b)}</code></td></tr>`).join("")}
      </tbody></table>
      <h2>${ro ? "Limite (oneste)" : "Limits (honest)"}</h2><ul class="warnlist">
        ${(ro ? ["Nu înțelege semantica programului: tipurile lipsă sunt ghicite (i64) și marcate cu TODO.", "try/except și try/catch devin blocuri simple; corpul except/catch rămâne comentat — tu decizi cum tratezi Err.",
          "Moștenirea, interfețele, lambda-urile complexe, generatoarele, decoratorii, async și bibliotecile externe nu sunt traduse.", "Ownership-ul nu e analizat: uneori trebuie să adaugi &, .clone() sau să schimbi String/&str.",
          "Codul e procesat linie cu linie; formatarea neobișnuită (mai multe instrucțiuni pe o linie) poate strica rezultatul.", "Testele automate verifică 7 exemple incluse — toate compilează cu rustc; codul tău s-ar putea să nu compileze din prima."]
          : ["It doesn't understand program semantics: missing types are guessed (i64) and marked TODO.", "try/except and try/catch become plain blocks; the except/catch body is left commented — you decide how to handle Err.",
          "Inheritance, interfaces, complex lambdas, generators, decorators, async and external libraries are not translated.", "Ownership is not analysed: sometimes you need to add &, .clone() or switch String/&str.",
          "Code is processed line by line; unusual formatting (several statements on one line) can break the result.", "Automated tests check the 7 bundled examples — all compile with rustc; your own code may not compile on the first try."]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  }
  let lastConv = null;
  function bindConvert() {
    const run = () => {
      const src = $("#cin").value;
      const r = window.RustConverter.convert(src, $("#clang").value);
      lastConv = r;
      $("#cout").innerHTML = codeBlock(r.code);
      $("#cwarn").innerHTML = r.warnings.length ? `<div class="note"><b>⚠️ ${S.lang === "ro" ? "Atenție" : "Warnings"} (${r.warnings.length})</b><ul class="warnlist">${r.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>` : "";
    };
    $("#cgo").addEventListener("click", run);
    app.querySelectorAll("[data-ex]").forEach((b) => b.addEventListener("click", () => {
      const e = window.RUST_CONVERTER_EXAMPLES.find((x) => x.id === b.dataset.ex);
      $("#cin").value = e.src; $("#clang").value = e.lang; run();
    }));
    const d = $("#cdisc");
    if (d) d.addEventListener("click", async () => {
      if (!lastConv) run();
      d.disabled = true;
      const r = await discordEvent("converter", { lang: lastConv.lang, code: lastConv.code });
      d.disabled = false;
      toast(r && r.ok ? "✅ Discord" : "⚠️ Discord: " + ((r && r.error) || "off"));
    });
    run();
  }

  function settings() {
    const ro = S.lang === "ro";
    const cfg = DStore.load();
    const D = window.RustDiscord;
    return `<h1>⚙️ ${t("settings")}</h1>
      <section class="card"><h2 style="margin-top:0">🌍 ${t("lang")}</h2>
        <div class="lang" role="group" aria-label="${t("lang")}"><button type="button" data-lang="ro" aria-pressed="${S.lang === "ro"}">Română</button><button type="button" data-lang="en" aria-pressed="${S.lang === "en"}">English</button></div></section>

      <section class="card" style="margin-top:14px" aria-labelledby="dh"><h2 id="dh" style="margin-top:0">💬 Discord webhook</h2>
        <p class="lesson-p">${ro ? "Opțional. Lipește URL-ul webhook-ului <b>tău</b> și alege ce să fie trimis. URL-ul se salvează <b>doar în acest browser</b> (localStorage) și pleacă doar către discord.com — nu ajunge pe niciun server al nostru (nici nu avem unul) și nu e scris în loguri." : "Optional. Paste <b>your own</b> webhook URL and choose what gets posted. The URL is saved <b>only in this browser</b> (localStorage) and is only ever sent to discord.com — it never reaches any server of ours (we don't have one) and is never logged."}</p>
        <h3>${ro ? "Cum creezi un webhook în 3 pași" : "How to create a webhook in 3 steps"}</h3>
        <ol class="steps">
          <li>${ro ? "În Discord, pe serverul tău: <b>Setările serverului → Integrări → Webhooks</b>." : "In Discord, on your server: <b>Server Settings → Integrations → Webhooks</b>."}</li>
          <li>${ro ? "<b>Webhook nou</b> → alege canalul (de ex. <code>#rust-progres</code>) și un nume." : "<b>New Webhook</b> → pick the channel (e.g. <code>#rust-progress</code>) and a name."}</li>
          <li>${ro ? "<b>Copiază URL-ul webhook-ului</b>, lipește-l mai jos și apasă <b>Test</b>." : "<b>Copy Webhook URL</b>, paste it below and press <b>Test</b>."}</li></ol>
        <svg class="diagram" viewBox="0 0 720 150" role="img" aria-label="${ro ? "Diagramă: browserul tău trimite direct la webhook-ul Discord, care postează în canalul tău" : "Diagram: your browser posts directly to the Discord webhook, which posts into your channel"}">
          <defs><marker id="ar" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#f46623"/></marker></defs>
          <g font-family="system-ui" font-size="14" fill="#e8ebf2" text-anchor="middle">
            <rect x="10" y="30" width="190" height="80" rx="14" fill="#1b2030" stroke="#262c3b"/><text x="105" y="62">🦀 Rust RO</text><text x="105" y="84" fill="#9aa3b5" font-size="12">${ro ? "browserul tău (localStorage)" : "your browser (localStorage)"}</text>
            <rect x="265" y="30" width="190" height="80" rx="14" fill="#1b2030" stroke="#5865F2"/><text x="360" y="62">discord.com</text><text x="360" y="84" fill="#9aa3b5" font-size="12">/api/webhooks/…</text>
            <rect x="520" y="30" width="190" height="80" rx="14" fill="#1b2030" stroke="#262c3b"/><text x="615" y="62"># ${ro ? "canalul tău" : "your channel"}</text><text x="615" y="84" fill="#9aa3b5" font-size="12">embed: ${ro ? "lecție / quiz / cod" : "lesson / quiz / code"}</text>
            <line x1="200" y1="70" x2="260" y2="70" stroke="#f46623" stroke-width="3" marker-end="url(#ar)"/><line x1="455" y1="70" x2="515" y2="70" stroke="#f46623" stroke-width="3" marker-end="url(#ar)"/>
            <text x="230" y="130" fill="#9aa3b5" font-size="12">HTTPS POST</text><text x="485" y="130" fill="#9aa3b5" font-size="12">${ro ? "mesaj" : "message"}</text></g></svg>
        <label class="f" for="durl">Webhook URL</label>
        <input id="durl" type="password" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://discord.com/api/webhooks/…" value="" aria-describedby="dstat">
        <p id="dstat" class="muted" aria-live="polite">${cfg.url ? (ro ? "Salvat: " : "Saved: ") + esc(D.mask(cfg.url)) : ro ? "Niciun webhook salvat." : "No webhook saved."}</p>
        <div class="row"><button class="btn primary" id="dsave">${ro ? "Salvează" : "Save"}</button><button class="btn" id="dtest" ${cfg.url ? "" : "disabled"}>🧪 Test</button><button class="btn ghost" id="ddel" ${cfg.url ? "" : "disabled"}>🗑 ${ro ? "Șterge" : "Remove"}</button></div>
        <h3>${ro ? "Ce trimit (opt-in)" : "What to post (opt-in)"}</h3>
        ${[["lessons", ro ? "Lecții terminate" : "Lesson completions"], ["quizzes", ro ? "Scoruri la quiz-uri și testul final" : "Quiz and final test scores"], ["converter", ro ? "Rezultate din convertor (cod Rust) — doar când apeși butonul" : "Converter results (Rust code) — only when you click the button"]]
          .map(([k, l]) => `<label class="switch"><span>${l}</span><input type="checkbox" data-dopt="${k}" ${cfg[k] ? "checked" : ""} ${cfg.url ? "" : "disabled"}></label>`).join("")}
        <p class="muted">${ro ? "Ritm: maximum un mesaj la ~1,2 s; dacă Discord răspunde 429 (prea multe cereri), aplicația așteaptă cât cere Discord și reîncearcă." : "Pace: at most one message every ~1.2 s; if Discord answers 429 (too many requests), the app waits as long as Discord asks and retries."}</p></section>

      <section class="card" style="margin-top:14px"><h2 style="margin-top:0">📊 ${t("progress")}</h2>
        <p class="lesson-p">${ro ? "Progresul e salvat doar local, în acest browser. Nu există cont." : "Progress is saved locally in this browser only. There is no account."}</p>
        <button class="btn" id="preset">🗑 ${t("resetProgress")}</button></section>`;
  }
  function bindSettings() {
    const D = window.RustDiscord;
    const ro = S.lang === "ro";
    const stat = $("#dstat");
    const msg = (r) => ({ empty: ro ? "Lipește un URL." : "Paste a URL.", https: ro ? "URL-ul trebuie să înceapă cu https://" : "The URL must start with https://", format: ro ? "Nu pare un webhook Discord (https://discord.com/api/webhooks/ID/TOKEN)." : "That doesn't look like a Discord webhook (https://discord.com/api/webhooks/ID/TOKEN)." }[r] || r);
    $("#dsave").addEventListener("click", () => {
      const v = D.validate($("#durl").value);
      if (!v.ok) { stat.textContent = "⚠️ " + msg(v.reason); return; }
      const cfg = DStore.load(); cfg.url = v.url; DStore.save(cfg);
      $("#durl").value = "";
      render(); $("#dstat").textContent = "✅ " + (ro ? "Salvat: " : "Saved: ") + D.mask(v.url);
    });
    $("#dtest").addEventListener("click", async () => {
      const cfg = DStore.load();
      if (!cfg.url) return;
      stat.textContent = "⏳ …";
      const r = await DClient.send(cfg.url, "test", {}, S.lang);
      stat.textContent = r.ok ? "✅ " + (ro ? "Mesajul de test a fost trimis. Verifică canalul." : "Test message sent. Check your channel.")
        : "⚠️ " + (r.error === "invalid" ? (ro ? "Discord nu recunoaște webhook-ul (șters sau greșit)." : "Discord doesn't recognise this webhook (deleted or wrong).") : r.error === "network" ? (ro ? "Eroare de rețea." : "Network error.") : r.error);
    });
    $("#ddel").addEventListener("click", () => { DStore.clear(); render(); });
    app.querySelectorAll("[data-dopt]").forEach((c) => c.addEventListener("change", () => { const cfg = DStore.load(); cfg[c.dataset.dopt] = c.checked; DStore.save(cfg); }));
    $("#preset").addEventListener("click", () => { if (confirm(t("resetConfirm"))) { const lang = S.lang; S = blank(); S.lang = lang; save(); render(); } });
  }

  function notFound() { return `<h1>404</h1><p><a href="#/">${t("home")}</a></p>`; }

  /* ── router ── */
  function render() {
    header();
    const [, r, a] = location.hash.split("/");
    const id = parseInt(a, 10);
    app.parentElement.classList.toggle("wide", r === "convert");
    app.classList.toggle("wide", r === "convert");
    if (r === "lesson") { app.innerHTML = lesson(id || 1); }
    else if (r === "quiz" && LESSONS.some((l) => l.id === id)) { if (!Q || Q.kind !== "lesson" || Q.id !== id || Q.i >= Q.qs.length) startQuiz("lesson", id); app.innerHTML = Q.i >= Q.qs.length ? quizResult() : quizView(); bindQuiz(); }
    else if (r === "final") { if (a === "go") { if (!Q || Q.kind !== "final") startQuiz("final"); app.innerHTML = quizView(); bindQuiz(); } else { app.innerHTML = finalIntro(); $("#gofinal").addEventListener("click", () => { startQuiz("final"); location.hash = "#/final/go"; }); } }
    else if (r === "net") app.innerHTML = net();
    else if (r === "why") app.innerHTML = why();
    else if (r === "convert") { app.innerHTML = convert(); bindConvert(); }
    else if (r === "settings") { app.innerHTML = settings(); bindSettings(); }
    else app.innerHTML = home();
    $("#foot").textContent = t("footer");
    document.title = (r ? ({ lesson: t("lesson") + " " + (id || 1), quiz: t("quiz"), final: t("final"), net: t("net"), why: t("why"), convert: t("conv"), settings: t("settings") }[r] || "") + " · " : "") + "Rust RO";
  }
  window.addEventListener("hashchange", () => { if (!/^#\/(quiz|final)/.test(location.hash)) Q = Q && Q.kind === "final" && /final\/go/.test(location.hash) ? Q : null; render(); window.scrollTo(0, 0); const h = $("h1"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } });
  render();
})();
