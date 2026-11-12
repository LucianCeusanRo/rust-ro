/* Rust RO v2 — static PWA, no backend. Progress lives in localStorage only.
 * Layout and game modes mirror STS Grilă: readiness ring, mistakes review, exam simulation,
 * quiz modes (learn / exercise / adaptive / marathon / quick), 24-day plan, 10 games, labs. */
(function () {
  "use strict";
  const LESSONS = window.RUST_LESSONS, BANK = window.RUST_BANK, G = window.RUST_GAMES, UI = window.RUST_UI, HL = window.RustHL;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const app = $("#app");
  const PKEY = "rustro.progress.v1";
  const PLAY = "https://play.rust-lang.org/?version=stable&mode=debug&edition=2021&code=";
  const EXEC = "https://play.rust-lang.org/execute";
  const QBY = Object.fromEntries(BANK.map((q) => [q.id, q]));
  const CATS = LESSONS.map((l) => "l" + l.id);
  const LAB_LIST = [];
  LESSONS.forEach((l) => (l.exercises || []).forEach((e, i) => LAB_LIST.push({ key: l.id + "-" + i, l, e, i })));

  /* ── state ── */
  const blank = () => ({ v: 2, lang: (navigator.language || "ro").startsWith("ro") ? "ro" : "en", done: {}, quiz: {}, final: null, days: [], streak: 0, bestStreak: 0,
    xp: 0, m: {}, seen: {}, ok: {}, mist: {}, labs: {}, code: {}, games: {}, exams: [], plan: { start: null, done: {} }, sound: true, theme: "auto", marathon: 0, daily: null, answered: 0, correct: 0, read: {} });
  let S;
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(PKEY) || "{}")); } catch (e) { S = blank(); }
  S.v = 2;
  const save = () => { try { localStorage.setItem(PKEY, JSON.stringify(S)); } catch (e) { /* private mode / quota */ } };
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const today = () => ymd(new Date());
  const yesterday = () => { const y = new Date(); y.setDate(y.getDate() - 1); return ymd(y); };
  function touchStreak() {
    const t = today();
    if (S.days.includes(t)) return;
    S.streak = S.days.includes(yesterday()) ? S.streak + 1 : 1;
    S.bestStreak = Math.max(S.bestStreak, S.streak);
    S.days = S.days.concat(t).slice(-400);
  }
  const currentStreak = () => (S.days.includes(today()) || S.days.includes(yesterday()) ? S.streak : 0);
  const level = () => Math.floor(Math.sqrt(S.xp / 50)) + 1;
  function addXp(n) { S.xp += n; touchStreak(); save(); updatePills(); }
  function applyTheme() { document.documentElement.dataset.theme = S.theme === "auto" ? "" : S.theme; if (S.theme === "auto") delete document.documentElement.dataset.theme; }

  /* ── i18n ── */
  const ro = () => S.lang === "ro";
  const T = (r, e) => (ro() ? r : e);
  const t = (k, v) => { let s = (UI[S.lang] || UI.ro)[k] || k; if (v) for (const [a, b] of Object.entries(v)) s = s.replace("{" + a + "}", b); return s; };
  const L = (o) => (o == null ? "" : typeof o === "string" ? o : o[S.lang] || o.ro);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  /* bank text: plain text, `x` → <code>, <i>/<b> allowed; legacy questions are trusted HTML */
  const md = (s) => esc(s).replace(/&lt;(\/?)([ib])&gt;/g, "<$1$2>").replace(/`([^`]+)`/g, "<code>$1</code>");
  const qText = (q, s) => (q.legacy ? s : md(s));
  const optHtml = (q, s) => (q.legacy ? s : s.includes("\n") || (q.k === "out" && s.length > 0) ? `<pre>${esc(s)}</pre>` : md(s));

  /* ── sound (WebAudio beeps, off by default on first visit? no: on, toggle in header) ── */
  let AC = null;
  function beep(ok) {
    if (!S.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = "sine"; o.frequency.value = ok ? 880 : 220;
      g.gain.setValueAtTime(0.08, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + (ok ? 0.15 : 0.3));
      o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.32);
    } catch (e) { /* no audio */ }
  }
  const vibrate = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* */ } };

  /* ── discord (opt-in, user's own webhook in localStorage) ── */
  const DStore = window.RustDiscord.makeStore(localStorage);
  const DClient = window.RustDiscord.createClient({ fetch: (...a) => window.fetch(...a) });
  function discordEvent(kind, data) {
    const cfg = DStore.load();
    const allowed = { lesson: cfg.lessons, quiz: cfg.quizzes, converter: cfg.converter }[kind];
    if (!cfg.url || !allowed) return Promise.resolve(null);
    return DClient.send(cfg.url, kind, data, S.lang);
  }

  /* ── helpers ── */
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast"; el.setAttribute("role", "status"); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a, n) => shuffle(a).slice(0, n);
  const lessonOf = (cat) => LESSONS.find((l) => "l" + l.id === cat);
  const catName = (cat) => { const l = lessonOf(cat); return l ? l.icon + " " + L(l.title) : cat; };
  function codeBlock(src, opts) {
    opts = opts || {};
    const id = "c" + Math.random().toString(36).slice(2, 8);
    const sh = opts.shell;
    return `<div class="code"><pre tabindex="0" aria-label="${sh ? "terminal" : "Rust"}"><code id="${id}">${sh ? HL.shell(src) : HL.rust(src)}</code></pre>
      <div class="bar2">${opts.fails ? `<span class="fails">⛔ ${t("failsBadge")} (${opts.fails})</span>` : ""}${opts.crate ? `<span class="fails" style="color:#ffa657">📦 ${esc(opts.crate)}</span>` : ""}<span class="sp"></span>
      <button class="btn sm ghost" data-copy="${id}">${t("copy")}</button>
      ${sh || opts.noPlay ? "" : `<a class="btn sm" target="_blank" rel="noopener" href="${PLAY + encodeURIComponent(src)}">▶ Playground</a>`}</div></div>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    const txt = document.getElementById(b.dataset.copy).textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast(t("copied")), () => toast("⚠"));
  });
  const bar = (pct, cls) => `<div class="bar ${cls || ""}" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
  const li = (href, ic, title, sub, right) => `<a class="li" href="${href}"><span class="ic" aria-hidden="true">${ic}</span><span class="tx"><b>${title}</b>${sub ? `<span>${sub}</span>` : ""}</span>${right || ""}<span class="chev" aria-hidden="true">›</span></a>`;

  /* ── mastery / stats ── */
  const mastery = (id) => S.m[id] || 0;
  function catStats(cat) {
    const qs = BANK.filter((q) => q.c === cat);
    const sum = qs.reduce((a, q) => a + mastery(q.id), 0);
    const seen = qs.filter((q) => S.seen[q.id]).length;
    return { n: qs.length, pct: qs.length ? (100 * sum) / (5 * qs.length) : 0, seen };
  }
  function readiness() {
    const theory = BANK.reduce((a, q) => a + mastery(q.id), 0) / (5 * BANK.length) * 100;
    const labs = (100 * Object.keys(S.labs).filter((k) => S.labs[k]).length) / LAB_LIST.length;
    const games = (100 * GAMES.filter((g) => S.games[g.id] && S.games[g.id].plays).length) / GAMES.length;
    return { theory, labs, games, all: theory * 0.6 + labs * 0.25 + games * 0.15 };
  }
  function weakCats(n) {
    return CATS.map((c) => ({ c, s: catStats(c) })).filter((x) => x.s.seen > 0).sort((a, b) => a.s.pct - b.s.pct).slice(0, n);
  }
  const mistIds = () => Object.keys(S.mist).filter((id) => QBY[id]);
  function record(q, ok) {
    S.seen[q.id] = (S.seen[q.id] || 0) + 1;
    S.answered++;
    if (ok) { S.correct++; S.ok[q.id] = (S.ok[q.id] || 0) + 1; S.m[q.id] = Math.min(5, mastery(q.id) + 1); if (S.mist[q.id]) { S.mist[q.id].n--; if (S.mist[q.id].n <= 0) delete S.mist[q.id]; } }
    else { S.m[q.id] = Math.max(0, mastery(q.id) - 2); S.mist[q.id] = { n: 2, d: today() }; }
    S.xp += ok ? 10 : 1;
    touchStreak();
  }

  /* ── header + nav ── */
  function updatePills() {
    const s = $("#pstreak"), x = $("#pxp");
    if (s) s.innerHTML = `🔥 ${currentStreak()}`;
    if (x) x.innerHTML = `⚡ ${S.xp}`;
  }
  function header(route) {
    $("#hdr").innerHTML = `<a class="skip" href="#app">${T("Sari la conținut", "Skip to content")}</a>
      <a class="brand" href="#/"><span aria-hidden="true">🦀</span> Rust <b>RO</b></a><span class="sp"></span>
      <a class="hpill" id="pstreak" href="#/me" title="${t("streak")}">🔥 ${currentStreak()}</a>
      <a class="hpill" id="pxp" href="#/me" title="XP">⚡ ${S.xp}</a>
      <button class="hbtn" id="psound" type="button" aria-pressed="${S.sound}" aria-label="${T("Sunet", "Sound")}">${S.sound ? "🔊" : "🔇"}</button>
      <div class="lang" role="group" aria-label="${t("lang")}"><button type="button" data-lang="ro" aria-pressed="${S.lang === "ro"}">RO</button><button type="button" data-lang="en" aria-pressed="${S.lang === "en"}">EN</button></div>`;
    document.documentElement.lang = S.lang;
    const sect = { "": "home", lessons: "lessons", lesson: "lessons", quiz: "quiz", exam: "quiz", mistakes: "quiz", labs: "labs", lab: "labs", games: "games", game: "games", me: "me", plan: "home", all: "home" }[route] || "";
    const items = [["", "home", "🏠", T("Acasă", "Home")], ["lessons", "lessons", "📚", T("Lecții", "Lessons")], ["quiz", "quiz", "📝", T("Grile", "Quiz")], ["labs", "labs", "🧪", T("Laborator", "Labs")], ["games", "games", "🎮", T("Jocuri", "Games")], ["me", "me", "👤", T("Eu", "Me")]];
    $("#nav").innerHTML = items.map(([r, k, i, l]) => `<a href="#/${r}" ${sect === k ? 'aria-current="page"' : ""}><span class="i" aria-hidden="true">${i}</span>${l}</a>`).join("");
    $("#nav").setAttribute("aria-label", T("Navigare", "Navigation"));
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]");
    if (b) { S.lang = b.dataset.lang; save(); render(); return; }
    if (e.target.closest("#psound")) { S.sound = !S.sound; save(); render(); }
  });

  /* ── home ── */
  function ringCard() {
    const R = readiness(), w = weakCats(3), nm = mistIds().length;
    const msg = !S.answered ? T("Începe cu lecția 1 sau cu o grilă rapidă.", "Start with lesson 1 or a quick quiz.") : R.all < 50 ? T("Continuă — repetarea zilnică face diferența.", "Keep going — daily review makes the difference.") : R.all < 85 ? T("Bine! Lucrează pe zonele slabe.", "Good! Work on your weak areas.") : T("Excelent! Ești aproape gata.", "Excellent! You're nearly there.");
    return `<section class="card" aria-labelledby="rdy"><div class="ready">
        <div class="ring" style="--p:${R.all.toFixed(0)}" role="img" aria-label="${R.all.toFixed(0)}%"><div><b>${R.all.toFixed(0)}%</b><span>${T("gata", "ready")}</span></div></div>
        <div><h3 id="rdy">${T("Gata pentru Rust", "Rust readiness")}</h3>
          ${[[T("Teorie (grile)", "Theory (quizzes)"), R.theory], [T("Laboratoare", "Labs"), R.labs], [T("Jocuri", "Games"), R.games]].map(([n, v]) => `<div class="mbar"><div class="r"><span>${n}</span><b>${v.toFixed(0)}%</b></div>${bar(v)}</div>`).join("")}</div></div>
      <p>${msg}</p>
      <a class="btn green block big" href="${nm ? "#/mistakes" : "#/quiz/quick"}">🔁 ${nm ? T("Repetă greșelile", "Review mistakes") + ` (${nm})` : T("Lecție rapidă", "Quick lesson")}</a>
      <p class="small muted" style="margin-bottom:0">${w.length ? T("De lucrat: ", "Work on: ") + w.map((x) => esc(L(lessonOf(x.c).title))).join(" · ") : T("De lucrat: încă nimic — răspunde la câteva grile.", "Work on: nothing yet — answer a few questions.")}</p></section>`;
  }
  function home() {
    const nxt = nextLesson();
    const pd = planDay();
    return ringCard() + `<nav class="list" aria-label="${T("Scurtături", "Shortcuts")}">
        ${li("#/lesson/" + nxt.id, "📖", T("Continuă: ", "Continue: ") + esc(L(nxt.title)), T("Lecția ", "Lesson ") + nxt.id + " / " + LESSONS.length)}
        ${li("#/exam", "🎯", T("Simulare examen", "Exam simulation"), T("20 de întrebări, 20 de minute, notă 1–10", "20 questions, 20 minutes, grade 1–10"))}
        ${li("#/game/daily", "📅", T("Provocarea zilei", "Daily challenge"), S.daily === today() ? T("făcută azi ✓", "done today ✓") : T("10 întrebări, întâi greșelile", "10 questions, mistakes first"))}
        ${li("#/mistakes", "❌", T("Greșelile mele", "My mistakes"), mistIds().length + T(" de repetat", " to review"))}
        ${li("#/plan", "🗓️", T("Plan de 24 de zile", "24-day plan"), pd ? T("Ziua ", "Day ") + pd + " · AZI" : T("pornește planul", "start the plan"))}
        ${li("#/all", "🧭", T("Toate secțiunile", "All sections"), T("lecții, grile, laboratoare, jocuri, De ce Rust, convertor…", "lessons, quizzes, labs, games, Why Rust, converter…"))}</nav>
      <p class="small muted">${LESSONS.length} ${T("lecții", "lessons")} · ${BANK.length} ${T("întrebări", "questions")} · ${LAB_LIST.length} ${T("laboratoare", "labs")} · ${GAMES.length} ${T("jocuri", "games")} · ${T("totul verificat cu rustc", "all checked with rustc")}</p>`;
  }
  const nextLesson = () => LESSONS.find((l) => !S.done[l.id]) || LESSONS[LESSONS.length - 1];
  function allSections() {
    return `<h1>🧭 ${T("Toate secțiunile", "All sections")}</h1><div class="grid">
      ${[["#/lessons", "📚", T("Lecții", "Lessons"), LESSONS.length + T(" lecții, de la zero la avansat", " lessons, beginner to advanced")],
        ["#/quiz", "📝", T("Grile", "Quizzes"), T("5 moduri + examen", "5 modes + exam")], ["#/exam", "🎯", T("Simulare examen", "Exam simulation"), T("notă 1–10", "grade 1–10")],
        ["#/mistakes", "❌", T("Greșelile mele", "My mistakes"), T("repetare spațiată", "spaced review")], ["#/labs", "🧪", T("Laboratoare", "Labs"), T("editor + rulare în Playground", "editor + run in Playground")],
        ["#/games", "🎮", T("Jocuri", "Games"), GAMES.length + T(" moduri de joc", " game modes")], ["#/plan", "🗓️", T("Plan", "Plan"), T("24 de zile", "24 days")],
        ["#/me", "👤", T("Statistici", "Stats"), T("progres, export, setări", "progress, export, settings")], ["#/why", "⚡", t("why"), T("cifre măsurate și surse", "measured numbers and sources")],
        ["#/net", "🌐", t("net"), T("proiecte de rețea cu cargo", "network projects with cargo")], ["#/convert", "🔄", t("conv"), "Python/Java → Rust"], ["#/settings", "💬", "Discord", T("webhook opțional", "optional webhook")]]
        .map(([h, i, b, s]) => `<a class="tile" href="${h}"><span class="ic" aria-hidden="true">${i}</span><b>${b}</b><span>${s}</span></a>`).join("")}</div>`;
  }

  /* ── lessons ── */
  const levelName = (l) => ({ 1: T("începător", "beginner"), 2: T("intermediar", "intermediate"), 3: T("avansat", "advanced"), 4: T("expert", "expert") })[levelOf(l)];
  const levelOf = (l) => l.level || (l.id <= 6 ? 1 : l.id <= 13 ? 2 : l.id <= 19 ? 3 : 4);
  function lessonsPage() {
    const groups = [1, 2, 3, 4];
    const lv = { 1: T("Începător", "Beginner"), 2: T("Intermediar", "Intermediate"), 3: T("Avansat", "Advanced"), 4: T("Expert", "Expert") };
    return `<h1>📚 ${T("Lecții", "Lessons")}</h1>
      <p class="muted">${Object.keys(S.done).length}/${LESSONS.length} ${T("terminate (quiz ≥ 70%)", "completed (quiz ≥ 70%)")}</p>
      ${groups.map((g) => { const ls = LESSONS.filter((l) => levelOf(l) === g); return ls.length ? `<h2>${lv[g]}</h2><nav class="list">${ls.map((l) => { const st = catStats("l" + l.id); return li("#/lesson/" + l.id, l.icon, l.id + ". " + esc(L(l.title)), `${st.n} ${T("întrebări", "questions")} · ${T("stăpânire", "mastery")} ${st.pct.toFixed(0)}%`, S.done[l.id] ? `<span class="tag ok">✓ ${S.quiz[l.id] || ""}%</span>` : S.quiz[l.id] != null ? `<span class="tag warn">${S.quiz[l.id]}%</span>` : ""); }).join("")}</nav>` : ""; }).join("")}`;
  }
  function lesson(id) {
    const l = LESSONS.find((x) => x.id === id);
    if (!l) return notFound();
    const nxt = LESSONS.find((x) => x.id === id + 1), prv = LESSONS.find((x) => x.id === id - 1);
    const st = catStats("l" + l.id);
    return `<p class="small muted"><a href="#/lessons">${T("Lecții", "Lessons")}</a> / ${l.id} · ${levelName(l)}</p>
      <h1>${l.icon} ${esc(L(l.title))}</h1><p class="lp">${L(l.summary)}</p>
      <div class="row">${S.done[l.id] ? `<span class="tag ok">✓ ${t("done")} · ${S.quiz[l.id]}%</span>` : ""}<span class="tag">${st.n} ${T("întrebări", "questions")}</span><span class="tag rust">${T("stăpânire", "mastery")} ${st.pct.toFixed(0)}%</span></div>
      ${l.sections.map((s) => `<section class="card"><h2>${esc(L(s.h))}</h2><p class="lp">${L(s.p)}</p>
        ${s.shell ? codeBlock(s.shell, { shell: true }) : ""}${s.code ? codeBlock(s.code, { fails: s.fails, crate: s.crate, noPlay: s.crate === "axum" || s.crate === "wasm-bindgen" }) : ""}</section>`).join("")}
      <h2>🧪 ${T("Laborator", "Lab")}</h2><nav class="list">${(l.exercises || []).map((e, i) => li(`#/lab/${l.id}/${i}`, S.labs[l.id + "-" + i] ? "✅" : "🧪", esc(L(e.title)), T("editor în pagină · rulează în Rust Playground", "in-page editor · runs in the Rust Playground"))).join("")}</nav>
      <div class="card"><h2>📝 ${T("Verifică-te", "Check yourself")}</h2>
        <p class="muted">${T("Quiz-ul lecției: 12 întrebări din această lecție. Prag: 70% — atunci lecția e marcată ca terminată.", "Lesson quiz: 12 questions from this lesson. Pass mark 70% — then the lesson is marked as completed.")}</p>
        <div class="row"><a class="btn primary" href="#/quiz/lesson/l${l.id}">📝 ${t("startQuiz")}</a><a class="btn" href="#/quiz/learn/l${l.id}">📘 ${T("Învățare", "Learn")}</a></div></div>
      <div class="row" style="justify-content:space-between">${prv ? `<a class="btn" href="#/lesson/${prv.id}">← ${prv.id}</a>` : "<span></span>"}${nxt ? `<a class="btn" href="#/lesson/${nxt.id}">${t("nextLesson")} →</a>` : `<a class="btn" href="#/exam">🎯 ${T("Examen", "Exam")}</a>`}</div>`;
  }

  /* ── quiz engine ── */
  const MODES = {
    learn: { ic: "📘", ro: "Învățare", en: "Learn", dro: "fără presiune: greșelile revin până le știi", den: "no pressure: wrong answers come back until you know them" },
    exercise: { ic: "✏️", ro: "Exercițiu", en: "Exercise", dro: "15 întrebări, întâi cele nevăzute", den: "15 questions, unseen first" },
    adaptive: { ic: "📈", ro: "Adaptiv", en: "Adaptive", dro: "15 întrebări unde stai cel mai slab", den: "15 questions where you're weakest" },
    marathon: { ic: "🏃", ro: "Maraton", en: "Marathon", dro: "până greșești de 3 ori", den: "until you miss 3 times" },
    quick: { ic: "⚡", ro: "Lecție rapidă", en: "Quick lesson", dro: "10 întrebări, 5 inimi, greșelile revin", den: "10 questions, 5 hearts, mistakes come back" }
  };
  let Q = null;
  function poolFor(cat) { return cat && cat !== "all" ? BANK.filter((q) => q.c === cat) : BANK; }
  function startSession(mode, cat) {
    const pool = poolFor(cat);
    let ids, o = { mode, cat, i: 0, score: 0, res: [], answered: null, feedback: true, requeue: false, lives: null, hearts: null, end: null };
    if (mode === "lesson") ids = pick(pool, 12).map((q) => q.id);
    else if (mode === "learn") { ids = (cat && cat !== "all" ? shuffle(pool) : pick(pool, 15)).map((q) => q.id); o.requeue = true; }
    else if (mode === "exercise") ids = shuffle(pool).sort((a, b) => (S.seen[a.id] || 0) - (S.seen[b.id] || 0)).slice(0, 15).map((q) => q.id);
    else if (mode === "adaptive") ids = shuffle(pool).sort((a, b) => mastery(a.id) - mastery(b.id)).slice(0, 15).map((q) => q.id);
    else if (mode === "marathon") { ids = shuffle(pool).map((q) => q.id); o.lives = 3; }
    else if (mode === "quick") { ids = pick(pool, 10).map((q) => q.id); o.hearts = 5; o.requeue = true; }
    else if (mode === "mistakes") ids = shuffle(mistIds()).slice(0, 20);
    else if (mode === "daily") { const m = shuffle(mistIds()).slice(0, 5); ids = m.concat(shuffle(BANK.filter((q) => !m.includes(q.id))).sort((a, b) => mastery(a.id) - mastery(b.id)).slice(0, 10 - m.length).map((q) => q.id)); ids = shuffle(ids); }
    else if (mode === "exam") { const ls = shuffle(LESSONS).slice(0, 20); ids = ls.map((l) => pick(BANK.filter((q) => q.c === "l" + l.id), 1)[0].id); while (ids.length < 20) ids.push(pick(BANK.filter((q) => !ids.includes(q.id)), 1)[0].id); o.feedback = false; o.end = Date.now() + 20 * 60 * 1000; }
    o.ids = ids;
    Q = o; newOrder();
  }
  function newOrder() { const q = QBY[Q.ids[Q.i]]; if (q) Q.order = shuffle(q.o.en.map((_, k) => k)); }
  function sessionTitle() {
    const m = MODES[Q.mode];
    const base = m ? m.ic + " " + T(m.ro, m.en) : { lesson: "📝 " + T("Quiz lecție", "Lesson quiz"), mistakes: "❌ " + T("Greșelile mele", "My mistakes"), daily: "📅 " + T("Provocarea zilei", "Daily challenge"), exam: "🎯 " + T("Simulare examen", "Exam simulation") }[Q.mode];
    return base + (Q.cat && Q.cat !== "all" ? " · " + catName(Q.cat) : "");
  }
  function quizView() {
    const q = QBY[Q.ids[Q.i]];
    const opts = q.o[S.lang] || q.o.ro;
    const total = Q.ids.length, ans = Q.answered;
    const status = Q.lives != null ? `<span class="hearts" aria-label="${Q.lives} ${T("vieți", "lives")}">${"❤️".repeat(Q.lives)}${"🤍".repeat(3 - Q.lives)}</span> <b>${Q.score}</b>`
      : Q.hearts != null ? `<span class="hearts" aria-label="${Q.hearts} ${T("inimi", "hearts")}">${"❤️".repeat(Q.hearts)}${"🤍".repeat(5 - Q.hearts)}</span>` : "";
    const timer = Q.end ? `<span class="tag rust" id="qtimer" aria-live="off">⏱ ${fmtLeft()}</span>` : "";
    const dots = Q.lives == null && total <= 30 ? `<div class="dots" aria-hidden="true">${Q.ids.map((_, k) => `<i class="${k < Q.res.length ? (Q.feedback ? (Q.res[k].ok ? "ok" : "no") : "cur") : k === Q.i ? "cur" : ""}"></i>`).join("")}</div>` : "";
    return `<div class="qtop"><span class="small muted">${sessionTitle()}</span><span class="sp"></span>${timer}${status}<a class="btn sm ghost" href="#/quiz" aria-label="${T("Ieși", "Quit")}">✕</a></div>${dots}
      <p class="small muted" aria-live="polite">${Q.lives != null ? T("Întrebarea ", "Question ") + (Q.i + 1) : t("qOf", { a: Q.i + 1, b: total })} · ${catName(q.c)}${mastery(q.id) ? ` · ${"★".repeat(mastery(q.id))}` : ""}</p>
      <h1 class="qq" id="qtext" tabindex="-1" data-qid="${esc(q.id)}">${qText(q, L(q.q))}</h1>
      ${q.code ? codeBlock(q.code, { noPlay: ans == null || q.crate === "axum" || q.crate === "wasm-bindgen", crate: q.crate }) : ""}
      <div class="opts" role="group" aria-labelledby="qtext">${Q.order.map((k, pos) => {
        let cls = "";
        if (ans != null) { if (Q.feedback) { if (k === q.a) cls = "right"; else if (k === ans) cls = "wrong"; } else if (k === ans) cls = "pick"; }
        return `<button class="opt ${cls}" data-opt="${k}" ${ans != null ? "disabled" : ""}><span class="k">${pos + 1}</span><span>${optHtml(q, opts[k])}</span></button>`;
      }).join("")}</div>
      <div aria-live="assertive">${ans != null && Q.feedback ? `<div class="exp ${ans === q.a ? "ok" : "no"}"><b>${ans === q.a ? "✅ " + t("correct") + " +10 XP" : "❌ " + t("wrong")}</b>${L(q.e) ? `<p>${qText(q, L(q.e))}</p>` : ""}${q.k ? `<p class="small muted">${q.k === "err" ? "🛠 " + T("Verificat: compilatorul dă exact ", "Checked: the compiler gives exactly ") + q.err : q.k === "out" ? "🛠 " + T("Verificat: ieșirea reală a programului (rustc).", "Checked: the program's real output (rustc).") : "🛠 " + T("Verificat cu rustc.", "Checked with rustc.")}</p>` : ""}</div>` : ""}
      ${ans != null ? `<div class="sticky-next"><button class="btn primary block big" id="qnext">${isLast() ? t("finish") : t("next") + " →"}</button></div>` : ""}</div>`;
  }
  const isLast = () => (Q.lives != null ? Q.lives <= 0 || Q.i + 1 >= Q.ids.length : Q.hearts != null && Q.hearts <= 0) || (Q.lives == null && Q.i + 1 >= Q.ids.length);
  const fmtLeft = () => { const s = Math.max(0, Math.round((Q.end - Date.now()) / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  let qTick = null;
  function bindQuiz() {
    clearInterval(qTick);
    if (Q.end) qTick = setInterval(() => { const el = $("#qtimer"); if (!Q || !Q.end) return clearInterval(qTick); if (el) el.textContent = "⏱ " + fmtLeft(); if (Date.now() >= Q.end) { clearInterval(qTick); finishSession(); } }, 1000);
    $$("[data-opt]", app).forEach((b) => b.addEventListener("click", () => answer(+b.dataset.opt)));
    const n = $("#qnext"); if (n) n.addEventListener("click", nextQ);
  }
  function answer(k) {
    if (Q.answered != null) return;
    const q = QBY[Q.ids[Q.i]], ok = k === q.a;
    Q.answered = k; Q.res.push({ id: q.id, pick: k, ok });
    if (ok) Q.score++;
    record(q, ok);
    if (!ok && Q.lives != null) Q.lives--;
    if (!ok && Q.hearts != null) Q.hearts--;
    if (!ok && Q.requeue && (Q.hearts == null || Q.hearts > 0)) Q.ids.push(q.id);
    save();
    if (Q.feedback) { beep(ok); vibrate(ok ? 15 : [30, 40, 30]); }
    if (!Q.feedback) { nextQ(); return; }
    paintQuiz();
    const n = $("#qnext"); if (n) n.focus({ preventScroll: true });
  }
  function nextQ() {
    if (isLast()) return finishSession();
    Q.i++; Q.answered = null; newOrder(); paintQuiz(); const h = $("#qtext"); if (h) h.focus({ preventScroll: true }); window.scrollTo(0, 0);
  }
  function paintQuiz() { app.innerHTML = quizView(); bindQuiz(); updatePills(); }
  document.addEventListener("keydown", (e) => {
    if (!Q || Q.done || !$("#qtext") || e.target.closest("textarea,input")) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= Q.order.length && Q.answered == null) { answer(Q.order[n - 1]); e.preventDefault(); }
    else if (e.key === "Enter" && Q.answered != null) { nextQ(); e.preventDefault(); }
  });
  function finishSession() {
    clearInterval(qTick);
    if (Q.done) return paintResult();
    Q.done = true;
    const n = Q.res.length, pct = n ? Math.round((100 * Q.score) / n) : 0;
    if (Q.mode === "lesson") {
      const id = +Q.cat.slice(1), l = LESSONS.find((x) => x.id === id), before = !!S.done[id];
      S.quiz[id] = Math.max(S.quiz[id] || 0, pct);
      if (pct >= 70) S.done[id] = true;
      discordEvent("quiz", { title: L(l.title), score: Q.score, total: n });
      if (pct >= 70 && !before) { S.xp += 50; discordEvent("lesson", { title: L(l.title), done: Object.keys(S.done).length, total: LESSONS.length }); }
    } else if (Q.mode === "exam") {
      const total = Q.ids.length, grade = Math.round((1 + (9 * Q.score) / total) * 100) / 100;
      Q.grade = grade;
      S.exams = S.exams.concat({ d: today(), score: Q.score, total, grade }).slice(-50);
      S.final = Math.max(S.final || 0, Math.round((100 * Q.score) / total));
      discordEvent("quiz", { title: T("Simulare examen", "Exam simulation"), score: Q.score, total });
    } else if (Q.mode === "marathon") { Q.best = Q.score > (S.marathon || 0); S.marathon = Math.max(S.marathon || 0, Q.score); }
    else if (Q.mode === "daily" && S.daily !== today()) { S.daily = today(); S.xp += 20; game("daily").plays++; game("daily").best = Math.max(game("daily").best, Q.score); }
    touchStreak(); save();
    paintResult();
  }
  function paintResult() {
    const n = Q.res.length, pct = n ? Math.round((100 * Q.score) / n) : 0;
    const head = Q.mode === "exam" ? `<div class="score">${T("Nota", "Grade")} ${Q.grade.toFixed(2)}</div><p>${Q.score}/${Q.ids.length} ${T("corecte", "correct")} · ${Q.grade >= 5 ? "✅ " + T("promovat", "passed") : "❌ " + T("nepromovat (sub 5)", "failed (below 5)")}</p>`
      : Q.mode === "marathon" ? `<div class="score">🏃 ${Q.score}</div><p>${Q.best ? "🏆 " + T("Record nou!", "New record!") : T("Record: ", "Record: ") + S.marathon}</p>`
      : `<div class="score">${Q.score}/${n} · ${pct}%</div><p>${pct >= 70 ? "🎉 " + (Q.mode === "lesson" ? t("passed") : T("Foarte bine!", "Well done!")) : "🔁 " + (Q.mode === "lesson" ? t("failed") : T("Mai exersează — greșelile au intrat la „Greșelile mele”.", "Keep practising — misses went to “My mistakes”."))}</p>`;
    const wrong = Q.res.filter((r) => !r.ok);
    const review = (Q.mode === "exam" ? Q.res : wrong).map((r) => { const q = QBY[r.id], o = q.o[S.lang] || q.o.ro; return `<details><summary>${r.ok ? "✅" : "❌"} ${qText(q, L(q.q))}</summary>${q.code ? codeBlock(q.code, { crate: q.crate }) : ""}<p>${T("Răspunsul tău", "Your answer")}: ${optHtml(q, o[r.pick])}</p><p><b>${t("answer")}:</b> ${optHtml(q, o[q.a])}</p>${L(q.e) ? `<p class="muted">${qText(q, L(q.e))}</p>` : ""}</details>`; }).join("");
    app.innerHTML = `<p class="small muted">${sessionTitle()} · ${t("result")}</p><div class="card" role="status">${head}</div>
      <div class="row"><button class="btn primary" id="qretry">↻ ${t("retry")}</button>${Q.mode === "lesson" ? `<a class="btn" href="#/lesson/${Q.cat.slice(1)}">${t("back")}</a>` : ""}${mistIds().length ? `<a class="btn green" href="#/mistakes">🔁 ${T("Greșelile", "Mistakes")} (${mistIds().length})</a>` : ""}<a class="btn" href="#/quiz">📝 ${T("Grile", "Quiz")}</a></div>
      ${review ? `<h2>${Q.mode === "exam" ? T("Recapitulare", "Review") : T("De revăzut", "To review")}</h2>${review}` : ""}`;
    $("#qretry").addEventListener("click", () => { const m = Q.mode, c = Q.cat; startSession(m, c); if (!Q.ids.length) return render(); paintQuiz(); });
    updatePills();
  }
  function runSession(mode, cat) {
    if (!Q || Q.mode !== mode || Q.cat !== cat || Q.done) startSession(mode, cat);
    if (!Q.ids.length) { app.innerHTML = `<h1>${sessionTitle()}</h1><div class="card"><p>${mode === "mistakes" ? T("🎉 Nicio greșeală de repetat. Răspunde la grile și revino.", "🎉 No mistakes to review. Answer some quizzes and come back.") : T("Nu există întrebări aici.", "No questions here.")}</p><a class="btn primary" href="#/quiz/quick">⚡ ${T("Lecție rapidă", "Quick lesson")}</a></div>`; Q = null; return; }
    Q.done ? paintResult() : paintQuiz();
  }
  function quizHub(cat) {
    cat = cat || S.qcat || "all";
    const st = cat === "all" ? { n: BANK.length, pct: readiness().theory } : catStats(cat);
    return `<h1>📝 ${T("Grile", "Quizzes")}</h1>
      <label class="f" for="qcat">${T("Categorie", "Category")}</label>
      <select id="qcat"><option value="all">${T("Toate lecțiile", "All lessons")} (${BANK.length})</option>${CATS.map((c) => `<option value="${c}" ${c === cat ? "selected" : ""}>${esc(catName(c))} (${catStats(c).n})</option>`).join("")}</select>
      <p class="small muted">${st.n} ${T("întrebări", "questions")} · ${T("stăpânire", "mastery")} ${st.pct.toFixed(0)}%</p>${bar(st.pct)}
      <nav class="list">${Object.entries(MODES).map(([k, m]) => li(`#/quiz/${k}/${cat}`, m.ic, T(m.ro, m.en), T(m.dro, m.den) + (k === "marathon" && S.marathon ? " · " + T("record ", "record ") + S.marathon : ""))).join("")}</nav>
      <nav class="list">${li("#/exam", "🎯", T("Simulare examen", "Exam simulation"), T("20 de întrebări din toate lecțiile, 20 de minute, notă 1–10", "20 questions across all lessons, 20 minutes, grade 1–10") + (S.exams.length ? " · " + T("ultima notă ", "last grade ") + S.exams[S.exams.length - 1].grade.toFixed(2) : ""))}
        ${li("#/mistakes", "❌", T("Greșelile mele", "My mistakes"), mistIds().length + T(" de repetat — corect de 2 ori și dispare", " to review — answer right twice and it's gone"))}</nav>
      <h2>${T("Stăpânire pe lecții", "Mastery by lesson")}</h2>
      <div class="card">${CATS.map((c) => { const s = catStats(c); return `<div class="mbar"><div class="r"><a href="#/quiz/adaptive/${c}">${esc(catName(c))}</a><b>${s.pct.toFixed(0)}%</b></div>${bar(s.pct, s.pct >= 80 ? "ok" : "")}</div>`; }).join("")}</div>`;
  }
  function examIntro() {
    return `<h1>🎯 ${T("Simulare examen", "Exam simulation")}</h1><div class="card">
      <ul><li>${T("20 de întrebări, câte una din 20 de lecții alese la întâmplare", "20 questions, one from each of 20 randomly chosen lessons")}</li><li>${T("20 de minute; la final se trimite automat", "20 minutes; auto-submits at the end")}</li><li>${T("Fără feedback pe parcurs — ca la examen", "No feedback while you answer — like a real exam")}</li><li>${T("Nota = 1 + 9 × corecte / 20; promovat de la 5", "Grade = 1 + 9 × correct / 20; pass from 5")}</li></ul>
      <button class="btn primary block big" id="goexam">${T("Începe examenul", "Start the exam")} →</button></div>
      ${S.exams.length ? `<h2>${T("Istoric", "History")}</h2><div class="card tblw"><table><thead><tr><th>${T("Data", "Date")}</th><th>${T("Corecte", "Correct")}</th><th>${T("Nota", "Grade")}</th></tr></thead><tbody>${S.exams.slice().reverse().slice(0, 10).map((e) => `<tr><td>${e.d}</td><td>${e.score}/${e.total}</td><td><b>${e.grade.toFixed(2)}</b></td></tr>`).join("")}</tbody></table></div>` : ""}`;
  }

  /* ── games ── */
  const GAMES = [
    { id: "daily", ic: "📅", ro: "Provocarea zilei", en: "Daily challenge", dro: "10 întrebări, întâi greșelile", den: "10 questions, mistakes first" },
    { id: "swipe", ic: "👆", ro: "Adevărat / Fals", en: "True / False", dro: "60 de secunde, glisează sau apasă", den: "60 seconds, swipe or tap" },
    { id: "light", ic: "⚡", ro: "Fulger", en: "Lightning", dro: "60 de secunde, combo pentru serii corecte", den: "60 seconds, combo for streaks" },
    { id: "fall", ic: "🌧️", ro: "Prinde răspunsul", en: "Catch the answer", dro: "apasă răspunsul corect înainte să cadă", den: "tap the right answer before it drops" },
    { id: "pairs", ic: "🧠", ro: "Perechi", en: "Pairs", dro: "memorie: tip ↔ ce face", den: "memory: type ↔ what it does" },
    { id: "order", ic: "🔢", ro: "Pune în ordine", en: "Put in order", dro: "pașii corecți, în ordine", den: "the right steps, in order" },
    { id: "fill", ic: "🧩", ro: "Completează codul", en: "Complete the code", dro: "ce lipsește ca să compileze", den: "what's missing so it compiles" },
    { id: "output", ic: "🖨️", ro: "Ce afișează?", en: "What does it print?", dro: "ieșiri reale, verificate cu rustc", den: "real outputs, checked with rustc" },
    { id: "errcode", ic: "🛑", ro: "Ce eroare?", en: "Which error?", dro: "codul exact de eroare al compilatorului", den: "the compiler's exact error code" },
    { id: "types", ic: "🏷️", ro: "Ce tip are?", en: "What's the type?", dro: "tipul exact al expresiei", den: "the exact type of the expression" }
  ];
  const game = (id) => (S.games[id] = S.games[id] || { best: 0, plays: 0 });
  let GS = null, gTimers = [];
  const gClear = () => { gTimers.forEach((x) => { clearInterval(x); clearTimeout(x); }); gTimers = []; };
  function gamesPage() {
    return `<h1>🎮 ${T("Jocuri", "Games")}</h1><p class="muted">${T("Toate întrebările din jocuri vin din aceeași bancă verificată cu rustc.", "Every game question comes from the same rustc-checked bank.")}</p>
      <div class="grid">${GAMES.map((g) => { const s = S.games[g.id]; return `<a class="tile" href="#/game/${g.id}"><span class="ic" aria-hidden="true">${g.ic}</span><b>${T(g.ro, g.en)}</b><span>${T(g.dro, g.den)}</span>${s && s.plays ? `<span class="tag ok">🏆 ${s.best}</span>` : ""}</a>`; }).join("")}</div>`;
  }
  function gameEnd(id, score, extra) {
    gClear();
    const g = game(id), best = score > g.best;
    g.plays++; g.best = Math.max(g.best, score);
    addXp(Math.max(0, Math.round(score)));
    const G0 = GAMES.find((x) => x.id === id);
    app.innerHTML = `<p class="small muted">${G0.ic} ${T(G0.ro, G0.en)}</p><div class="card" role="status"><div class="score">${score}</div><p>${best ? "🏆 " + T("Record nou!", "New record!") : T("Record: ", "Record: ") + g.best} · +${Math.max(0, Math.round(score))} XP</p>${extra || ""}</div>
      <div class="row"><button class="btn primary" id="gagain">↻ ${T("Încă o dată", "Play again")}</button><a class="btn" href="#/games">🎮 ${T("Jocuri", "Games")}</a></div>`;
    $("#gagain").addEventListener("click", () => startGame(id));
  }
  const gHead = (id, right) => { const g = GAMES.find((x) => x.id === id); return `<div class="qtop"><span class="small muted">${g.ic} ${T(g.ro, g.en)}</span><span class="sp"></span>${right || ""}<a class="btn sm ghost" href="#/games" aria-label="${T("Ieși", "Quit")}">✕</a></div>`; };
  const shortQ = (q) => !q.legacy && (q.o.en.every((o) => o.length <= 60));
  function timed(sec, onTick, onEnd) {
    const end = Date.now() + sec * 1000;
    const iv = setInterval(() => { const left = Math.max(0, (end - Date.now()) / 1000); onTick(left); if (left <= 0) { clearInterval(iv); onEnd(); } }, 250);
    gTimers.push(iv);
    return end;
  }
  function startGame(id) {
    gClear(); GS = { id, score: 0, n: 0, combo: 0 };
    ({ daily: () => { location.hash = "#/quiz/daily"; }, swipe: gSwipe, light: gLight, fall: gFall, pairs: gPairs, order: gOrder, fill: gFill, output: () => gChoice("output"), errcode: () => gChoice("errcode"), types: () => gChoice("types") }[id])();
  }
  /* swipe: is this the right answer? */
  function gSwipe() {
    const pool = BANK.filter((q) => shortQ(q) && !q.code);
    const nextCard = () => { const q = pick(pool, 1)[0]; const truth = Math.random() < 0.5; const k = truth ? q.a : pick(q.o.en.map((_, i) => i).filter((i) => i !== q.a), 1)[0]; GS.card = { q, k, truth }; };
    const paint = () => {
      const { q, k } = GS.card;
      app.innerHTML = gHead("swipe", `<b>${GS.score}</b>`) + `<div class="timer"><i id="gt" style="width:${(100 * GS.left) / 60}%"></i></div>
        <div class="swipe" id="sw" style="margin-top:12px"><div class="qq" style="margin:0">${qText(q, L(q.q))}</div><div class="cand">${md((q.o[S.lang] || q.o.ro)[k])}</div><p class="small muted" style="margin:0">${T("E răspunsul corect?", "Is this the right answer?")}</p></div>
        <div class="tf"><button class="btn big" data-tf="0" style="border-color:var(--bad)">👈 ${T("Fals", "False")}</button><button class="btn big green" data-tf="1">${T("Adevărat", "True")} 👉</button></div>
        <p class="small muted">${T("Glisează cardul stânga/dreapta sau folosește ← →.", "Swipe the card left/right or use ← →.")}</p>`;
      $$("[data-tf]", app).forEach((b) => b.addEventListener("click", () => decide(b.dataset.tf === "1")));
      const sw = $("#sw"); let x0 = null;
      sw.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      sw.addEventListener("touchmove", (e) => { if (x0 != null) sw.style.transform = `translateX(${e.touches[0].clientX - x0}px) rotate(${(e.touches[0].clientX - x0) / 20}deg)`; }, { passive: true });
      sw.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 70) decide(dx > 0); else sw.style.transform = ""; });
    };
    const decide = (yes) => {
      if (!GS || GS.over) return;
      const ok = yes === GS.card.truth;
      if (ok) GS.score++; beep(ok); vibrate(ok ? 10 : 40);
      if (!ok) toast("❌ " + T("Răspuns corect: ", "Correct answer: ") + (GS.card.q.o[S.lang] || GS.card.q.o.ro)[GS.card.q.a]);
      nextCard(); paint();
    };
    GS.left = 60; nextCard(); paint();
    GS.key = (e) => { if (e.key === "ArrowLeft") decide(false); if (e.key === "ArrowRight") decide(true); };
    timed(60, (l) => { GS.left = l; const el = $("#gt"); if (el) el.style.width = (100 * l) / 60 + "%"; }, () => { GS.over = true; gameEnd("swipe", GS.score); });
  }
  /* lightning: 4 options, 60s, combo */
  function gLight() {
    const pool = BANK.filter((q) => shortQ(q) && (!q.code || q.code.split("\n").length <= 8));
    const paint = () => {
      const q = GS.q, o = q.o[S.lang] || q.o.ro;
      app.innerHTML = gHead("light", `<span class="tag rust">x${1 + Math.min(4, Math.floor(GS.combo / 3))}</span> <b>${GS.score}</b>`) + `<div class="timer"><i id="gt" style="width:${(100 * GS.left) / 60}%"></i></div>
        <h1 class="qq">${qText(q, L(q.q))}</h1>${q.code ? codeBlock(q.code, { noPlay: true }) : ""}
        <div class="opts">${GS.order.map((k, i) => `<button class="opt" data-k="${k}"><span class="k">${i + 1}</span><span>${optHtml(q, o[k])}</span></button>`).join("")}</div>`;
      $$("[data-k]", app).forEach((b) => b.addEventListener("click", () => {
        const ok = +b.dataset.k === GS.q.a;
        record(GS.q, ok); save();
        if (ok) { GS.combo++; GS.score += 1 + Math.min(4, Math.floor((GS.combo - 1) / 3)); } else { GS.combo = 0; toast("❌ " + (GS.q.o[S.lang] || GS.q.o.ro)[GS.q.a]); }
        beep(ok); nextQ();
      }));
    };
    const nextQ = () => { GS.q = pick(pool, 1)[0]; GS.order = shuffle(GS.q.o.en.map((_, k) => k)); paint(); };
    GS.left = 60; nextQ();
    GS.key = (e) => { const n = parseInt(e.key, 10); const b = $$("[data-k]", app)[n - 1]; if (b) b.click(); };
    timed(60, (l) => { GS.left = l; const el = $("#gt"); if (el) el.style.width = (100 * l) / 60 + "%"; }, () => gameEnd("light", GS.score));
  }
  /* fall: options drop down, tap the right one */
  function gFall() {
    const pool = BANK.filter((q) => !q.legacy && !q.code && q.o.en.every((o) => o.length <= 40));
    GS.lives = 3;
    const round = () => {
      if (GS.lives <= 0) return gameEnd("fall", GS.score);
      const q = pick(pool, 1)[0], o = q.o[S.lang] || q.o.ro, dur = Math.max(3.2, 7 - GS.score * 0.25);
      GS.q = q; GS.resolved = false;
      app.innerHTML = gHead("fall", `<span class="hearts">${"❤️".repeat(GS.lives)}${"🤍".repeat(3 - GS.lives)}</span> <b>${GS.score}</b>`) + `<h1 class="qq">${qText(q, L(q.q))}</h1>
        <div class="gstage" id="stage">${shuffle(o.map((_, k) => k)).map((k, i) => `<button class="drop" data-k="${k}" style="left:${i % 2 ? 52 : 2}%;animation-duration:${dur}s;--d:${dur}s;animation-delay:${(i * dur) / 4.5}s">${md(o[k])}</button>`).join("")}</div>`;
      $$(".drop", app).forEach((b) => {
        b.addEventListener("click", () => { if (GS.resolved) return; const ok = +b.dataset.k === q.a; b.style.borderColor = ok ? "var(--okb)" : "var(--bad)"; if (ok) { GS.resolved = true; GS.score++; beep(true); record(q, true); save(); gTimers.push(setTimeout(round, 350)); } else { GS.lives--; beep(false); vibrate(40); b.disabled = true; record(q, false); save(); if (GS.lives <= 0) { GS.resolved = true; gTimers.push(setTimeout(round, 500)); } } });
        b.addEventListener("animationend", () => { if (!GS.resolved && +b.dataset.k === q.a) { GS.resolved = true; GS.lives--; beep(false); toast("⬇ " + o[q.a]); gTimers.push(setTimeout(round, 600)); } });
      });
    };
    round();
  }
  /* pairs: memory */
  function gPairs() {
    const pairs = pick(G.pairs, 6).map(([a, b], i) => ({ i, a, b: RUST_SPLITX(b) }));
    const cards = shuffle(pairs.flatMap((p) => [{ p: p.i, txt: md(p.a), mono: true }, { p: p.i, txt: md(L(p.b)) }]));
    GS.cards = cards; GS.up = []; GS.found = new Set(); GS.moves = 0; GS.t0 = Date.now();
    const paint = () => {
      app.innerHTML = gHead("pairs", `<b>${GS.found.size}/6</b> · ${GS.moves} ${T("mutări", "moves")}`) + `<div class="memo">${GS.cards.map((c, i) => { const up = GS.up.includes(i) || GS.found.has(c.p); return `<button class="mc ${GS.found.has(c.p) ? "done" : up ? "up" : ""}" data-i="${i}" aria-label="${up ? "" : T("carte ascunsă", "hidden card")}">${up ? c.txt : "🦀"}</button>`; }).join("")}</div>`;
      $$("[data-i]", app).forEach((b) => b.addEventListener("click", () => flip(+b.dataset.i)));
    };
    const flip = (i) => {
      if (GS.up.length >= 2 || GS.up.includes(i) || GS.found.has(GS.cards[i].p)) return;
      GS.up.push(i); paint();
      if (GS.up.length === 2) {
        GS.moves++;
        const [x, y] = GS.up;
        if (GS.cards[x].p === GS.cards[y].p) { GS.found.add(GS.cards[x].p); GS.up = []; beep(true); paint(); if (GS.found.size === 6) { const sec = Math.round((Date.now() - GS.t0) / 1000); gTimers.push(setTimeout(() => gameEnd("pairs", Math.max(10, 100 - (GS.moves - 6) * 6 - Math.floor(sec / 5)), `<p>${GS.moves} ${T("mutări", "moves")} · ${sec}s</p>`), 400)); } }
        else gTimers.push(setTimeout(() => { GS.up = []; paint(); }, 900));
      }
    };
    paint();
  }
  const RUST_SPLITX = (s) => window.RUST_SPLIT(s);
  /* order: tap steps in order */
  function gOrder() {
    const items = pick(G.order, 5);
    GS.k = 0; GS.mist = 0;
    const round = () => {
      if (GS.k >= items.length) return gameEnd("order", Math.max(0, items.length * 20 - GS.mist * 5), `<p>${GS.mist} ${T("greșeli", "mistakes")}</p>`);
      const it = items[GS.k], steps = it.s.map((x) => L(window.RUST_SPLIT(x)));
      GS.steps = steps; GS.placed = []; GS.pool = shuffle(steps.map((_, i) => i));
      paint(it);
    };
    const paint = (it) => {
      app.innerHTML = gHead("order", `<b>${GS.k + 1}/${items.length}</b>`) + `<h1 class="qq">${md(L(window.RUST_SPLIT(it.t)))}</h1>
        <div class="slots">${GS.steps.map((_, i) => `<div class="slot ${i < GS.placed.length ? "f" : ""}"><b>${i + 1}.</b> ${i < GS.placed.length ? md(GS.steps[GS.placed[i]]) : ""}</div>`).join("")}</div>
        <h3>${T("Apasă pasul următor:", "Tap the next step:")}</h3><div class="opts">${GS.pool.filter((i) => !GS.placed.includes(i)).map((i) => `<button class="opt" data-s="${i}">${md(GS.steps[i])}</button>`).join("")}</div>`;
      $$("[data-s]", app).forEach((b) => b.addEventListener("click", () => {
        const i = +b.dataset.s;
        if (i === GS.placed.length) { GS.placed.push(i); beep(true); if (GS.placed.length === GS.steps.length) { GS.k++; gTimers.push(setTimeout(round, 500)); } paint(it); }
        else { GS.mist++; beep(false); vibrate(40); b.classList.add("wrong"); }
      }));
    };
    round();
  }
  /* fill: complete the code */
  function gFill() {
    const items = pick(G.fill, 8);
    GS.k = 0;
    const round = () => {
      if (GS.k >= items.length) return gameEnd("fill", GS.score * 10, `<p>${GS.score}/${items.length}</p>`);
      const it = items[GS.k], opts = shuffle([it.a].concat(it.w));
      GS.ans = null;
      const paint = () => {
        const shown = GS.ans == null ? it.c : it.c.replace("___", it.a);
        app.innerHTML = gHead("fill", `<b>${GS.k + 1}/${items.length}</b>`) + `<h1 class="qq">${T("Ce pui în loc de ___ ca programul să afișeze:", "What replaces ___ so the program prints:")} <code>${esc(it.expect)}</code></h1>
          ${codeBlock(shown, { noPlay: GS.ans == null })}
          <div class="opts">${opts.map((o, i) => `<button class="opt ${GS.ans != null ? (o === it.a ? "right" : o === GS.ans ? "wrong" : "") : ""}" data-o="${i}" ${GS.ans != null ? "disabled" : ""}><span class="k">${i + 1}</span><span><code>${esc(o.trim() || o)}</code></span></button>`).join("")}</div>
          ${GS.ans != null ? `<div class="sticky-next"><button class="btn primary block big" id="gn">${t("next")} →</button></div>` : ""}`;
        $$("[data-o]", app).forEach((b) => b.addEventListener("click", () => { GS.ans = opts[+b.dataset.o]; const ok = GS.ans === it.a; if (ok) GS.score++; beep(ok); paint(); }));
        const n = $("#gn"); if (n) n.addEventListener("click", () => { GS.k++; round(); });
      };
      paint();
    };
    round();
  }
  /* output / errcode / types: multiple choice from verified data, 15s per round */
  function gChoice(kind) {
    let items;
    if (kind === "output") items = pick(BANK.filter((q) => q.k === "out" && !q.crate), 10).map((q) => { const o = q.o[S.lang] || q.o.ro; return { code: q.code, prompt: T("Ce afișează programul?", "What does the program print?"), right: o[q.a], opts: o, pre: true, q }; });
    else if (kind === "errcode") {
      const errs = BANK.filter((q) => q.k === "err"), codes = Array.from(new Set(errs.map((q) => q.err)));
      items = pick(errs, 10).map((q) => ({ code: q.code, prompt: T("Ce cod de eroare dă compilatorul?", "Which error code does the compiler give?"), right: q.err, opts: [q.err].concat(pick(codes.filter((c) => c !== q.err), 3)), q }));
    } else items = pick(G.types, 10).map((g) => ({ code: (g.pre ? g.pre + "\n" : "") + "let x = " + g.e + ";", prompt: T("Ce tip are <code>x</code>?", "What is the type of <code>x</code>?"), right: g.t, opts: [g.t].concat(g.w), mono: true }));
    GS.k = 0;
    const round = () => {
      gClear();
      if (GS.k >= items.length) return gameEnd(kind, GS.score, `<p>${Math.round(GS.score / 10)}/${items.length}</p>`);
      const it = items[GS.k], opts = shuffle(it.opts);
      GS.ans = null;
      const paint = (left) => {
        app.innerHTML = gHead(kind, `<b>${GS.score}</b>`) + `<div class="timer"><i id="gt" style="width:${(100 * left) / 15}%"></i></div><p class="small muted">${GS.k + 1}/${items.length}</p>
          <h1 class="qq">${it.prompt}</h1>${codeBlock(it.code, { noPlay: GS.ans == null })}
          <div class="opts">${opts.map((o, i) => `<button class="opt ${GS.ans != null ? (o === it.right ? "right" : o === GS.ans ? "wrong" : "") : ""}" data-o="${i}" ${GS.ans != null ? "disabled" : ""}><span class="k">${i + 1}</span><span>${it.pre ? `<pre>${esc(o)}</pre>` : `<code>${esc(o)}</code>`}</span></button>`).join("")}</div>
          ${GS.ans != null ? `${it.q && L(it.q.e) ? `<div class="exp">${md(L(it.q.e))}</div>` : ""}<div class="sticky-next"><button class="btn primary block big" id="gn">${t("next")} →</button></div>` : ""}`;
        $$("[data-o]", app).forEach((b) => b.addEventListener("click", () => choose(opts[+b.dataset.o])));
        const n = $("#gn"); if (n) n.addEventListener("click", () => { GS.k++; round(); });
      };
      let left = 15;
      const choose = (o) => { if (GS.ans != null) return; gClear(); GS.ans = o; const ok = o === it.right; if (ok) GS.score += 5 + Math.ceil(left / 3); if (it.q) { record(it.q, ok); save(); } beep(ok); paint(left); };
      paint(15);
      timed(15, (l) => { left = l; const el = $("#gt"); if (el) el.style.width = (100 * l) / 15 + "%"; }, () => { if (GS.ans == null) choose("⏱"); });
    };
    round();
  }
  document.addEventListener("keydown", (e) => { if (GS && GS.key && /^#\/game\//.test(location.hash) && !e.target.closest("textarea,input")) GS.key(e); });

  /* ── labs: in-page editor, run via the Rust Playground execute API ── */
  const PLAY_OK = { tokio: true, clap: true, serde: true, serde_json: true };
  function labsPage() {
    const n = Object.keys(S.labs).filter((k) => S.labs[k]).length;
    return `<h1>🧪 ${T("Laboratoare", "Labs")}</h1><p class="muted">${n}/${LAB_LIST.length} ${T("rezolvate", "solved")} · ${T("scrii cod în pagină și îl rulezi în Rust Playground (play.rust-lang.org)", "write code in the page and run it on the Rust Playground (play.rust-lang.org)")}</p>${bar((100 * n) / LAB_LIST.length, "ok")}
      <nav class="list">${LAB_LIST.map((x) => li(`#/lab/${x.l.id}/${x.i}`, S.labs[x.key] ? "✅" : x.l.icon, esc(L(x.e.title)), x.l.id + ". " + esc(L(x.l.title)) + (x.e.crate ? " · 📦 " + x.e.crate : ""))).join("")}</nav>`;
  }
  function labPage(lid, i) {
    const l = LESSONS.find((x) => x.id === lid), e = l && (l.exercises || [])[i];
    if (!e) return notFound();
    const key = lid + "-" + i, runnable = !e.crate || PLAY_OK[e.crate];
    const code = S.code[key] != null ? S.code[key] : e.starter;
    const idx = LAB_LIST.findIndex((x) => x.key === key), nx = LAB_LIST[idx + 1];
    return `<p class="small muted"><a href="#/labs">${T("Laboratoare", "Labs")}</a> / <a href="#/lesson/${l.id}">${l.icon} ${esc(L(l.title))}</a></p>
      <h1>🧪 ${esc(L(e.title))} ${S.labs[key] ? '<span class="tag ok">✓</span>' : ""}</h1>
      <div class="card"><p class="lp"><b>${t("task")}:</b> ${L(e.task)}</p>
        <p class="small muted" style="margin-bottom:0">${T("Ieșire așteptată", "Expected output")}:</p><div class="out">${esc(e.expect || "—")}</div>
        <details><summary>💡 ${t("hint")}</summary><p class="lp">${L(e.hint)}</p></details></div>
      ${runnable ? "" : `<p class="note">📦 ${T("Acest laborator folosește crate-ul ", "This lab uses the ")}<code>${esc(e.crate)}</code>${T(", care nu există în Rust Playground. Rulează-l local cu ", " crate, which the Rust Playground doesn't have. Run it locally with ")}<code>cargo run</code>${T(" și compară cu ieșirea așteptată de mai sus.", " and compare with the expected output above.")}</p>`}
      <div class="ed"><label class="small" for="ed" style="position:absolute;left:-9999px">${T("Editor de cod Rust", "Rust code editor")}</label>
        <textarea id="ed" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off">${esc(code)}</textarea>
        <div class="keys" role="toolbar" aria-label="${T("Taste rapide", "Quick keys")}">${["⇥", "{", "}", "(", ")", "[", "]", "<", ">", ";", ":", "&", "\"", "'", "!", "?", "=", "|", "*", "_", "#"].map((k) => `<button type="button" data-key="${esc(k)}">${esc(k)}</button>`).join("")}</div></div>
      <div class="row" style="margin-top:10px">${runnable ? `<button class="btn primary" id="run">▶ ${T("Rulează", "Run")}</button>` : ""}${e.alsoTest && runnable ? `<button class="btn" id="runt">🧪 ${T("Rulează testele", "Run tests")}</button>` : ""}
        <a class="btn" id="openp" target="_blank" rel="noopener" href="#">↗ Playground</a><button class="btn ghost" id="reset">↺ ${T("Resetează", "Reset")}</button></div>
      <div id="res" aria-live="polite"></div>
      <details><summary>✅ ${t("solution")}</summary>${codeBlock(e.solution, { crate: e.crate, noPlay: !runnable })}<button class="btn sm" id="usesol">${T("Pune soluția în editor", "Put the solution in the editor")}</button></details>
      ${!runnable ? `<button class="btn" id="manual">✓ ${T("L-am rulat local și ieșirea e identică", "I ran it locally and the output matches")}</button>` : ""}
      <div class="row" style="justify-content:space-between;margin-top:14px"><a class="btn" href="#/lesson/${l.id}">← ${T("Lecția", "Lesson")} ${l.id}</a>${nx ? `<a class="btn" href="#/lab/${nx.l.id}/${nx.i}">${T("Următorul", "Next")} →</a>` : ""}</div>`;
  }
  function bindLab(lid, i) {
    const l = LESSONS.find((x) => x.id === lid), e = l && (l.exercises || [])[i];
    if (!e) return;
    const key = lid + "-" + i, ed = $("#ed");
    const fit = () => { ed.style.height = "auto"; ed.style.height = Math.min(window.innerHeight * 0.7, Math.max(260, ed.scrollHeight + 4)) + "px"; };
    fit();
    const persist = () => { S.code[key] = ed.value; save(); $("#openp").href = PLAY + encodeURIComponent(ed.value); };
    persist();
    ed.addEventListener("input", () => { persist(); fit(); });
    ed.addEventListener("keydown", (ev) => { if (ev.key === "Tab") { ev.preventDefault(); ins("    "); } if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); const r = $("#run"); if (r) r.click(); } });
    const ins = (txt) => { const a = ed.selectionStart, b = ed.selectionEnd; ed.setRangeText(txt, a, b, "end"); ed.focus(); persist(); };
    $$("[data-key]", app).forEach((b) => b.addEventListener("pointerdown", (ev) => { ev.preventDefault(); ins(b.dataset.key === "⇥" ? "    " : b.dataset.key); }));
    $("#reset").addEventListener("click", () => { if (confirm(T("Revii la codul de pornire?", "Go back to the starter code?"))) { ed.value = e.starter; persist(); fit(); } });
    $("#usesol").addEventListener("click", () => { ed.value = e.solution; persist(); fit(); ed.scrollIntoView({ block: "center" }); });
    const m = $("#manual"); if (m) m.addEventListener("click", () => { passLab(key); render(); });
    const runIt = async (tests) => {
      const res = $("#res");
      res.innerHTML = `<p class="muted">⏳ ${T("Rulez în Rust Playground…", "Running on the Rust Playground…")}</p>`;
      if (!navigator.onLine) { res.innerHTML = `<p class="note">📴 ${T("Ești offline. Ieșirea așteptată e afișată mai sus; rulează când revii online.", "You're offline. The expected output is shown above; run it when you're back online.")}</p>`; return; }
      try {
        const r = await fetch(EXEC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: "stable", mode: "debug", edition: "2021", crateType: "bin", tests: !!tests, code: ed.value, backtrace: false }) });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        const out = (j.stdout || "").replace(/\s+$/, ""), err = (j.stderr || "").trim();
        const pass = tests ? j.success && /test result: ok/.test(j.stdout || "") : j.success && e.expect != null && out === e.expect.trim();
        if (pass) passLab(key);
        res.innerHTML = `<p><b>${pass ? "✅ " + T("Corect! Ieșirea e identică.", "Correct! The output matches.") + (tests ? "" : " +30 XP") : j.success ? "❌ " + (tests ? T("Testele nu trec.", "Tests don't pass.") : T("Rulează, dar ieșirea diferă de cea așteptată.", "It runs, but the output differs from the expected one.")) : "⛔ " + T("Nu compilează sau a dat panic — vezi mesajul compilatorului.", "It doesn't compile or it panicked — see the compiler message.")}</b></p>
          <p class="small muted" style="margin-bottom:0">stdout</p><div class="out ${pass ? "ok" : "no"}">${esc(out || "∅")}</div>
          ${err ? `<details ${j.success ? "" : "open"}><summary>stderr</summary><div class="out">${esc(err)}</div></details>` : ""}`;
        updatePills();
      } catch (x) {
        res.innerHTML = `<p class="note">⚠️ ${T("Nu am putut contacta Rust Playground", "Couldn't reach the Rust Playground")} (${esc(x.message || "network")}). ${T("Folosește butonul Playground sau rulează local cu cargo run.", "Use the Playground button or run locally with cargo run.")}</p>`;
      }
    };
    const r = $("#run"); if (r) r.addEventListener("click", () => runIt(false));
    const rt = $("#runt"); if (rt) rt.addEventListener("click", () => runIt(true));
  }
  function passLab(key) { if (!S.labs[key]) { S.labs[key] = true; S.xp += 30; } touchStreak(); save(); }

  /* ── 24-day plan ── */
  function planDay() {
    if (!S.plan.start) return 0;
    const d = Math.floor((new Date(today()) - new Date(S.plan.start)) / 86400000) + 1;
    return Math.max(1, Math.min(LESSONS.length, d));
  }
  function planPage() {
    const cur = planDay();
    return `<h1>🗓️ ${T("Plan de ", "")}${LESSONS.length} ${T("zile", "-day plan")}</h1>
      <p class="muted">${T("O lecție pe zi: citești lecția, rezolvi laboratorul, treci testul zilei (≥ 70%) și repeți greșelile.", "One lesson a day: read the lesson, solve the lab, pass the daily test (≥ 70%) and review your mistakes.")}</p>
      ${S.plan.start ? `<p class="small muted">${T("Pornit pe ", "Started on ")}${S.plan.start} · ${Object.keys(S.plan.done).length}/${LESSONS.length} ${T("zile bifate", "days done")} <button class="btn sm ghost" id="prestart">↺ ${T("Repornește", "Restart")}</button></p>` : `<button class="btn primary block big" id="pstart">▶ ${T("Pornește planul azi", "Start the plan today")}</button>`}
      ${LESSONS.map((l, k) => { const d = k + 1, done = S.plan.done[d], lab = (l.exercises || []).every((_, i) => S.labs[l.id + "-" + i]), test = (S.quiz[l.id] || 0) >= 70;
        return `<div class="card daycard ${done ? "done" : d === cur ? "today" : ""}"><div class="n">${done ? "✓" : d}</div><div style="flex:1;min-width:0">
          <b>${T("Ziua ", "Day ")}${d}${d === cur && !done ? ' <span class="tag rust">AZI</span>' : ""}</b> · ${l.icon} ${esc(L(l.title))}
          <div class="row small" style="margin-top:6px"><a class="tag ${S.read[l.id] ? "ok" : ""}" href="#/lesson/${l.id}">📖 ${T("lecția", "lesson")}</a><a class="tag ${lab ? "ok" : ""}" href="#/lab/${l.id}/0">🧪 ${T("laborator", "lab")}</a><a class="tag ${test ? "ok" : ""}" href="#/quiz/lesson/l${l.id}">📝 ${T("test", "test")} ${S.quiz[l.id] != null ? S.quiz[l.id] + "%" : "≥70%"}</a><a class="tag" href="#/mistakes">🔁 ${T("greșeli", "review")}</a></div>
          ${S.plan.start && !done ? `<button class="btn sm ${test ? "green" : ""}" data-day="${d}" style="margin-top:8px" ${test ? "" : 'title="' + T("trece întâi testul", "pass the test first") + '"'}>✓ ${T("Marchează ziua", "Mark day done")}</button>` : ""}</div></div>`; }).join("")}`;
  }
  function bindPlan() {
    const s = $("#pstart"); if (s) s.addEventListener("click", () => { S.plan = { start: today(), done: {} }; save(); render(); });
    const r = $("#prestart"); if (r) r.addEventListener("click", () => { if (confirm(T("Repornești planul de azi?", "Restart the plan from today?"))) { S.plan = { start: today(), done: {} }; save(); render(); } });
    $$("[data-day]", app).forEach((b) => b.addEventListener("click", () => { const d = +b.dataset.day, l = LESSONS[d - 1]; if ((S.quiz[l.id] || 0) < 70) { toast(T("Trece întâi testul lecției (≥ 70%).", "Pass the lesson test first (≥ 70%).")); return; } S.plan.done[d] = true; addXp(25); render(); }));
  }

  /* ── me / stats ── */
  function mePage() {
    const R = readiness(), acc = S.answered ? Math.round((100 * S.correct) / S.answered) : 0, mastered = BANK.filter((q) => mastery(q.id) >= 4).length;
    const lv = level(), next = 50 * lv * lv, prev = 50 * (lv - 1) * (lv - 1);
    return `<h1>👤 ${T("Eu", "Me")}</h1>
      <div class="card"><div class="row" style="justify-content:space-between"><b>${T("Nivel", "Level")} ${lv}</b><span class="small muted">${S.xp} / ${next} XP</span></div>${bar((100 * (S.xp - prev)) / (next - prev))}
        <div class="kpi" style="margin-top:12px"><div><b>🔥 ${currentStreak()}</b><span>${t("streak")}</span></div><div><b>${S.bestStreak}</b><span>${T("record zile", "best streak")}</span></div><div><b>${R.all.toFixed(0)}%</b><span>${T("gata", "ready")}</span></div>
        <div><b>${S.answered}</b><span>${T("răspunsuri", "answers")}</span></div><div><b>${acc}%</b><span>${T("acuratețe", "accuracy")}</span></div><div><b>${mastered}</b><span>${T("stăpânite (★4+)", "mastered (★4+)")}</span></div>
        <div><b>${Object.keys(S.done).length}/${LESSONS.length}</b><span>${T("lecții", "lessons")}</span></div><div><b>${Object.keys(S.labs).length}/${LAB_LIST.length}</b><span>${T("laboratoare", "labs")}</span></div><div><b>${S.exams.length ? Math.max(...S.exams.map((e) => e.grade)).toFixed(2) : "—"}</b><span>${T("cea mai bună notă", "best grade")}</span></div></div></div>
      <h2>${T("Jocuri", "Games")}</h2><div class="card tblw"><table><tbody>${GAMES.map((g) => { const s = S.games[g.id]; return `<tr><td>${g.ic} ${T(g.ro, g.en)}</td><td>${s ? s.plays + "×" : "—"}</td><td>🏆 ${s ? s.best : 0}</td></tr>`; }).join("")}<tr><td>🏃 ${T("Maraton", "Marathon")}</td><td></td><td>🏆 ${S.marathon || 0}</td></tr></tbody></table></div>
      <h2>${T("Stăpânire pe lecții", "Mastery by lesson")}</h2><div class="card">${CATS.map((c) => { const s = catStats(c); return `<div class="mbar"><div class="r"><span>${esc(catName(c))}</span><b>${s.pct.toFixed(0)}% · ${s.seen}/${s.n}</b></div>${bar(s.pct, s.pct >= 80 ? "ok" : "")}</div>`; }).join("")}</div>
      <h2>${T("Setări", "Settings")}</h2><div class="card">
        <div class="switch"><span>🌍 ${t("lang")}</span><div class="lang" style="background:var(--card2)"><button type="button" data-lang="ro" aria-pressed="${S.lang === "ro"}" style="color:var(--ink)">RO</button><button type="button" data-lang="en" aria-pressed="${S.lang === "en"}" style="color:var(--ink)">EN</button></div></div>
        <label class="switch"><span>🔊 ${T("Sunete", "Sounds")}</span><input type="checkbox" id="msound" ${S.sound ? "checked" : ""}></label>
        <label class="switch"><span>🌓 ${T("Temă", "Theme")}</span><select id="mtheme" style="width:auto"><option value="auto" ${S.theme === "auto" ? "selected" : ""}>Auto</option><option value="light" ${S.theme === "light" ? "selected" : ""}>${T("Luminoasă", "Light")}</option><option value="dark" ${S.theme === "dark" ? "selected" : ""}>${T("Întunecată", "Dark")}</option></select></label>
        <a class="li" href="#/settings" style="padding-left:0"><span class="ic">💬</span><span class="tx"><b>Discord webhook</b><span>${T("opțional, doar în browserul tău", "optional, stays in your browser")}</span></span><span class="chev">›</span></a></div>
      <h2>${t("progress")}</h2><div class="card"><p class="lp">${T("Progresul e salvat doar local (localStorage). Nu există cont. Poți face o copie de siguranță:", "Progress is stored locally only (localStorage). There is no account. You can make a backup:")}</p>
        <div class="row"><button class="btn" id="mexp">⬇ ${T("Exportă JSON", "Export JSON")}</button><label class="btn" for="mimp">⬆ ${T("Importă JSON", "Import JSON")}</label><input type="file" id="mimp" accept="application/json,.json" style="position:absolute;left:-9999px"><button class="btn ghost" id="mreset">🗑 ${t("resetProgress")}</button></div></div>
      <nav class="list">${li("#/why", "⚡", t("why"), "")}${li("#/net", "🌐", t("net"), "")}${li("#/convert", "🔄", t("conv"), "")}</nav>`;
  }
  function bindMe() {
    $("#msound").addEventListener("change", (e) => { S.sound = e.target.checked; save(); header("me"); });
    $("#mtheme").addEventListener("change", (e) => { S.theme = e.target.value; save(); applyTheme(); });
    $("#mexp").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "rust-ro-progres-" + today() + ".json"; document.body.appendChild(a); a.click(); a.remove();
    });
    $("#mimp").addEventListener("change", (e) => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then((txt) => { const d = JSON.parse(txt); if (!d || typeof d !== "object" || !("xp" in d || "done" in d)) throw new Error("format"); S = Object.assign(blank(), d); save(); applyTheme(); render(); toast("✅ " + T("Progres importat", "Progress imported")); }).catch(() => toast("⚠️ " + T("Fișier invalid", "Invalid file")));
    });
    $("#mreset").addEventListener("click", () => { if (confirm(t("resetConfirm"))) { const lang = S.lang; S = blank(); S.lang = lang; save(); render(); } });
  }

  /* ── kept from v1: networking projects, Why Rust, converter, settings/Discord ── */
  function net() {
    const ro = S.lang === "ro"; // eslint-disable-line no-shadow
    return `<h1>🌐 ${ro ? "Rust pentru rețeliști" : "Rust for network folks"}</h1><p class="lp">${t("netIntro")}</p>
      ${window.RUST_NET.map((n) => `<section class="card"><h2 style="margin-top:0">${n.icon} ${esc(L(n.title))}</h2>
        <h3>${t("whatItDoes")}</h3><p class="lp">${L(n.what)}</p>
        <h3>${t("youLearn")}</h3><ul>${(n.learn[S.lang] || n.learn.ro).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <h3>${t("runLocal")}</h3>${codeBlock(n.run, { shell: true })}
        <p class="note">⚠️ ${L(n.warn)}</p>
        <details><summary>📄 ${t("fullCode")}</summary>${codeBlock(n.code)}</details>
        ${n.sample ? `<details><summary>🧪 ${t("sampleLog")}</summary>${codeBlock(n.sample, { shell: true })}</details>` : ""}</section>`).join("")}`;
  }

  function why() {
    const ro = S.lang === "ro"; // eslint-disable-line no-shadow
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
      <p class="lp">${ro ? "Patru motive concrete, cu cifre măsurate de noi sau cu surse. Fără promisiuni magice: Rust nu face orice program mai rapid, iar învățarea durează." : "Four concrete reasons, with numbers we measured ourselves or with sources. No magic promises: Rust doesn't make every program faster, and learning it takes time."}</p>

      <section class="card"><h2 style="margin-top:0">🧠 1. ${ro ? "Mai puțină memorie RAM" : "Less RAM"}</h2>
        <p class="lp">${ro ? "Rust nu are garbage collector și nici mașină virtuală: memoria se eliberează exact când variabila iese din scope (ownership). Datele stau compact — un <code>Vec&lt;bool&gt;</code> folosește 1 octet pe element, pe când o listă Python ține un pointer de 8 octeți pentru fiecare element. Abstracțiile (iteratori, generice) sunt „zero-cost”: se compilează la același cod ca o buclă scrisă de mână." : "Rust has no garbage collector and no virtual machine: memory is freed exactly when a variable goes out of scope (ownership). Data is stored compactly — a <code>Vec&lt;bool&gt;</code> uses 1 byte per element, while a Python list keeps an 8-byte pointer per element. Abstractions (iterators, generics) are “zero-cost”: they compile to the same code as a hand-written loop."}</p>
        <p class="lp"><b>${ro ? "Măsurat pe acest calculator" : "Measured on this machine"}</b> (${ro ? "ciurul lui Eratostene până la 10 milioane, memorie maximă" : "Sieve of Eratosthenes up to 10 million, peak memory"}):</p>
        ${chart("sieve", "peak_rss_mib", "MiB")}
        <p class="lp">≈ <b>${fx(sp.peak_rss_mib, sr.peak_rss_mib)}×</b> ${ro ? "mai puțină memorie pentru aceeași problemă." : "less memory for the same problem."}</p>
        <p class="note info">💸 ${ro ? "De ce contează acum: memoria s-a scumpit puternic în 2026. TrendForce a estimat pentru T1 2026 o creștere a prețurilor contractuale DRAM convenționale de 90–95% față de trimestrul anterior, iar pentru T4 2026 încă +10–15% (PC DRAM +13–18%), din cauza cererii pentru servere AI. Mai puțină RAM per serviciu = mașini mai mici sau mai multe servicii pe același hardware." : "Why it matters now: memory got much more expensive in 2026. TrendForce estimated a 90–95% quarter-over-quarter rise in conventional DRAM contract prices for 1Q26, and another +10–15% for 4Q26 (PC DRAM +13–18%), driven by AI server demand. Less RAM per service = smaller machines or more services on the same hardware."}
          <br>${ro ? "Surse" : "Sources"}: ${src("https://www.trendforce.com/presscenter/news/20260202-12911.html", "TrendForce, 2 Feb 2026")} · ${src("https://www.trendforce.com/presscenter/news/20260930-13258.html", "TrendForce, 30 Sep 2026")} · ${src("https://www.trendforce.com/presscenter/news/20261111-13303.html", "TrendForce, 11 Nov 2026")}</p></section>

      <section class="card"><h2 style="margin-top:0">🚀 2. ${ro ? "Mult mai rapid în bucle grele de CPU" : "Much faster in CPU-heavy loops"}</h2>
        <p class="lp">${ro ? "Codul Rust e compilat în instrucțiuni native; Python interpretează fiecare operație. Diferența se vede în bucle strânse, calcule și parsare." : "Rust is compiled to native instructions; Python interprets every operation. The difference shows in tight loops, number crunching and parsing."}</p>
        <h3>${ro ? "Ciur până la 10.000.000 (timp)" : "Sieve up to 10,000,000 (time)"}</h3>${chart("sieve", "median_s", "s")}
        <h3>${ro ? "Cel mai lung lanț Collatz sub 1.000.000 (timp)" : "Longest Collatz chain below 1,000,000 (time)"}</h3>${chart("collatz", "median_s", "s")}
        <p class="lp">≈ <b>${fx(sp.median_s, sr.median_s)}×</b> ${ro ? "și" : "and"} ≈ <b>${fx(cp.median_s, cr.median_s)}×</b> ${ro ? "mai rapid, cu exact același algoritm și același rezultat." : "faster, with exactly the same algorithm and the same result."}</p>
        <details><summary>🔬 ${ro ? "Cum am măsurat (reproductibil)" : "How we measured (reproducible)"}</summary>
          <p class="lp">${ro ? "Mediana a 3 rulări; memorie = VmHWM maxim din /proc/&lt;pid&gt;/status. Comanda:" : "Median of 3 runs; memory = max VmHWM from /proc/&lt;pid&gt;/status. Command:"}</p>
          ${codeBlock("python3 bench/run.py\n# " + W.bench.results.map((r) => r.cmd).join("\n# "), { shell: true })}
          <table><thead><tr><th>Benchmark</th><th>${ro ? "Timp (mediană)" : "Time (median)"}</th><th>Peak RSS</th><th>Output</th></tr></thead><tbody>
          ${W.bench.results.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.median_s} s</td><td>${r.peak_rss_mib} MiB</td><td><code>${esc(r.output)}</code></td></tr>`).join("")}</tbody></table>
          <p class="muted">${esc(W.bench.python)} · ${esc(W.bench.rustc)} · ${esc(W.bench.cpu)} · ${esc(W.bench.date)}</p>
          ${W.snippets.map((s) => `<h3>${s.id}.rs</h3>${codeBlock(s.code)}`).join("")}
        </details>
        <p class="note">⚠️ ${ro ? "Limite oneste: e Python pur, fără NumPy. Cu NumPy sau extensii în C diferența scade mult; programele care așteaptă după rețea/disc (I/O) nu câștigă mare lucru. Pentru comparații pe mai multe limbaje vezi" : "Honest limits: this is pure Python, no NumPy. With NumPy or C extensions the gap shrinks a lot; programs that mostly wait on network/disk (I/O) gain little. For broader cross-language comparisons see"} ${src("https://benchmarksgame-team.pages.debian.net/benchmarksgame/index.html", "The Benchmarks Game")}.</p></section>

      <section class="card"><h2 style="margin-top:0">🛡️ 3. ${ro ? "Siguranța memoriei" : "Memory safety"}</h2>
        <p class="lp">${ro ? "Borrow checker-ul refuză la compilare use-after-free, pointerii atârnați și data races între fire de execuție. Asta contează: echipa Chromium raportează că aproximativ 70% din bug-urile lor de securitate grave sunt probleme de siguranță a memoriei (în C/C++) și menționează Rust printre limbajele mai sigure pe care le folosesc." : "The borrow checker rejects use-after-free, dangling pointers and data races between threads at compile time. That matters: the Chromium team reports that around 70% of their serious security bugs are memory safety problems (in C/C++) and lists Rust among the safer languages they adopt."}
        ${src("https://www.chromium.org/Home/chromium-security/memory-safety/", "chromium.org — Memory safety")}</p></section>

      <section class="card"><h2 style="margin-top:0">🤖 4. ${ro ? "Vibe coding face startul mai ușor" : "Vibe coding makes starting easier"}</h2>
        <p class="lp">${ro ? "Cu un asistent AI scrii repede prima versiune, iar compilatorul Rust îți dă mesaje de eroare foarte precise (chiar cu sugestia de reparare), pe care le poți da înapoi asistentului. Bucla „scrie → cargo check → repară” e rapidă." : "With an AI assistant you get a first version quickly, and the Rust compiler gives very precise error messages (often with the fix), which you can feed back to the assistant. The “write → cargo check → fix” loop is fast."}</p>
        <p class="note">⚠️ ${ro ? "Dar: portarea din Python e mai grea decât pare — trebuie gândit cine deține datele, tipurile sunt stricte și nu există excepții. De aceea lecțiile 4 și 6 sunt cele mai importante. Convertorul nostru îți dă doar o ciornă de pornire." : "But: porting from Python is harder than it looks — you have to think about who owns the data, types are strict and there are no exceptions. That's why lessons 4 and 6 matter most. Our converter only gives you a starting draft."}</p>
        <div class="row"><a class="btn primary" href="#/lesson/4">🔐 ${t("lesson")} 4</a><a class="btn" href="#/convert">🔄 ${t("conv")}</a></div></section>`;
  }

  function convert() {
    const ro = S.lang === "ro"; // eslint-disable-line no-shadow
    const EX = window.RUST_CONVERTER_EXAMPLES;
    const cfg = DStore.load();
    return `<h1>🔄 ${ro ? "Convertor Python/Java → Rust" : "Python/Java → Rust converter"}</h1>
      <p class="note">⚠️ ${ro ? "Rulează 100% în browser, pe reguli (fără AI, fără server). Rezultatul este o <b>ciornă de pornire</b>, nu o traducere garantată 1:1 — verifică-l mereu cu <code>cargo check</code>." : "Runs 100% in your browser, rule-based (no AI, no server). The result is a <b>starting draft</b>, not a guaranteed 1:1 translation — always check it with <code>cargo check</code>."}</p>
      <div class="row" style="margin:12px 0" role="group" aria-label="${ro ? "Exemple" : "Examples"}">${EX.map((e) => `<button class="btn sm" data-ex="${e.id}">${esc(L(e.title))}</button>`).join("")}</div>
      <div class="split"><div>
        <label class="f" for="cin">${ro ? "Codul tău (Python sau Java)" : "Your code (Python or Java)"}</label>
        <textarea id="cin" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off">${esc(EX[0].src)}</textarea>
        <div class="row" style="margin-top:10px"><label for="clang" class="muted">${ro ? "Limbaj" : "Language"}</label>
          <select id="clang" style="width:auto"><option value="auto">Auto</option><option value="python">Python</option><option value="java">Java</option></select>
          <button class="btn primary" id="cgo">⚙️ ${ro ? "Convertește" : "Convert"}</button></div></div>
        <div><p class="f" style="font-weight:600;margin:12px 0 6px">Rust (${ro ? "ciornă" : "draft"})</p><div id="cout"></div><div id="cwarn"></div>
          ${cfg.url && cfg.converter ? `<button class="btn sm" id="cdisc">💬 ${ro ? "Trimite pe Discord-ul meu" : "Send to my Discord"}</button>` : ""}</div></div>
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
    const ro = S.lang === "ro"; // eslint-disable-line no-shadow
    const cfg = DStore.load();
    const D = window.RustDiscord;
    return `<h1>⚙️ ${t("settings")}</h1>
      <section class="card"><h2 style="margin-top:0">🌍 ${t("lang")}</h2>
        <div class="lang" role="group" aria-label="${t("lang")}"><button type="button" data-lang="ro" aria-pressed="${S.lang === "ro"}">Română</button><button type="button" data-lang="en" aria-pressed="${S.lang === "en"}">English</button></div></section>

      <section class="card" aria-labelledby="dh"><h2 id="dh" style="margin-top:0">💬 Discord webhook</h2>
        <p class="lp">${ro ? "Opțional. Lipește URL-ul webhook-ului <b>tău</b> și alege ce să fie trimis. URL-ul se salvează <b>doar în acest browser</b> (localStorage) și pleacă doar către discord.com — nu ajunge pe niciun server al nostru (nici nu avem unul) și nu e scris în loguri." : "Optional. Paste <b>your own</b> webhook URL and choose what gets posted. The URL is saved <b>only in this browser</b> (localStorage) and is only ever sent to discord.com — it never reaches any server of ours (we don't have one) and is never logged."}</p>
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

      <section class="card"><h2 style="margin-top:0">📊 ${t("progress")}</h2>
        <p class="lp">${ro ? "Progresul e salvat doar local, în acest browser. Nu există cont." : "Progress is saved locally in this browser only. There is no account."}</p>
        <button class="btn" id="preset">🗑 ${t("resetProgress")}</button></section>`;
  }
  function bindSettings() {
    const D = window.RustDiscord;
    const ro = S.lang === "ro"; // eslint-disable-line no-shadow
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
    const pr = $("#preset"); if (pr) pr.addEventListener("click", () => { if (confirm(t("resetConfirm"))) { const lang = S.lang; S = blank(); S.lang = lang; save(); render(); } });
  }

  function notFound() { return `<h1>404</h1><p><a href="#/">${t("home")}</a></p>`; }

  /* ── router ── */
  function render() {
    gClear(); clearInterval(qTick);
    const [, r = "", a, b] = location.hash.split("/");
    header(r);
    applyTheme();
    app.classList.toggle("wide", r === "convert");
    let title = "";
    if (r === "lessons") { app.innerHTML = lessonsPage(); title = T("Lecții", "Lessons"); }
    else if (r === "lesson") { const id = parseInt(a, 10) || 1; S.read[id] = 1; save(); app.innerHTML = lesson(id); title = T("Lecția ", "Lesson ") + id; }
    else if (r === "quiz" && a && (MODES[a] || a === "lesson" || a === "daily")) { runSession(a, b || (a === "lesson" ? "l1" : "all")); title = T("Grile", "Quiz"); }
    else if (r === "quiz") { app.innerHTML = quizHub(a); $("#qcat").addEventListener("change", (e) => { S.qcat = e.target.value; save(); app.innerHTML = quizHub(e.target.value); render(); }); title = T("Grile", "Quiz"); }
    else if (r === "exam" || r === "final") {
      title = T("Examen", "Exam");
      if (a === "go") runSession("exam", "all");
      else { if (Q && Q.mode === "exam" && !Q.done) Q = null; app.innerHTML = examIntro(); $("#goexam").addEventListener("click", () => { startSession("exam", "all"); location.hash = "#/exam/go"; }); }
    }
    else if (r === "mistakes") { runSession("mistakes", "all"); title = T("Greșelile mele", "My mistakes"); }
    else if (r === "labs") { app.innerHTML = labsPage(); title = T("Laboratoare", "Labs"); }
    else if (r === "lab") { const id = parseInt(a, 10), i = parseInt(b, 10) || 0; app.innerHTML = labPage(id, i); bindLab(id, i); title = T("Laborator", "Lab"); }
    else if (r === "games") { app.innerHTML = gamesPage(); title = T("Jocuri", "Games"); }
    else if (r === "game" && GAMES.some((g) => g.id === a)) { startGame(a); title = T("Joc", "Game"); }
    else if (r === "plan") { app.innerHTML = planPage(); bindPlan(); title = "Plan"; }
    else if (r === "me") { app.innerHTML = mePage(); bindMe(); title = T("Eu", "Me"); }
    else if (r === "all") { app.innerHTML = allSections(); title = T("Toate secțiunile", "All sections"); }
    else if (r === "net") { app.innerHTML = net(); title = t("net"); }
    else if (r === "why") { app.innerHTML = why(); title = t("why"); }
    else if (r === "convert") { app.innerHTML = convert(); bindConvert(); title = t("conv"); }
    else if (r === "settings") { app.innerHTML = settings(); bindSettings(); title = t("settings"); }
    else app.innerHTML = home();
    $("#foot").textContent = t("footer");
    document.title = (title ? title + " · " : "") + "Rust RO";
  }
  window.addEventListener("hashchange", () => {
    const h = location.hash;
    if (!/^#\/(quiz\/|exam\/go|mistakes)/.test(h)) Q = Q && Q.mode === "exam" && /exam\/go/.test(h) ? Q : null;
    if (!/^#\/game\//.test(h)) GS = null;
    render(); window.scrollTo(0, 0);
    const el = $("h1"); if (el) { el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }
  });
  /* exposed for automated UI tests only */
  window.__rustro = { state: () => S, bank: BANK.length, lessons: LESSONS.length, labs: LAB_LIST.length, games: GAMES.length };
  render();
})();
