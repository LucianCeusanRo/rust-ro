/* Merges the v1 per-lesson quizzes (lesson.quiz, HTML text) into the question bank as
 * category "l<id>", marked legacy:true so the UI renders them as HTML. */
(function () {
  for (const l of window.RUST_LESSONS) {
    (l.quiz || []).forEach((q, i) => {
      window.RUST_BANK.push({ id: "l" + l.id + "-v" + (i + 1), c: "l" + l.id, legacy: true, q: q.q, o: q.o, a: q.a, e: q.e || { ro: "", en: "" }, code: q.code || null, k: null });
    });
  }
})();
