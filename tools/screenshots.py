"""Real screenshots of the v2 UI with Playwright (Chromium). Discord is mocked, the Playground is mocked
(returns the lab's expected output) so no external service is contacted.
Run: python3 -m http.server 8811 --bind 127.0.0.1 &  then  python3 tools/screenshots.py [base_url]"""
import json, sys, os
from playwright.sync_api import sync_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8811/index.html").rstrip("/")
if not BASE.endswith(".html"): BASE += "/"
OUT = os.environ.get("RUSTRO_SHOTS", "docs/screenshots/"); os.makedirs(OUT, exist_ok=True)
def answer_all(pg, n, wrong_at=()):
    for i in range(n):
        qid = pg.get_attribute("#qtext", "data-qid")
        a = pg.evaluate(f"window.RUST_BANK.find(q => q.id === {json.dumps(qid)}).a")
        if i in wrong_at: a = pg.evaluate(f"[0,1,2,3].find(k => k !== {a} && document.querySelector('[data-opt=\"'+k+'\"]'))")
        pg.click(f'[data-opt="{a}"]'); pg.click("#qnext")
with sync_playwright() as p:
    b = p.chromium.launch()
    def mk(w, h, mobile):
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, locale="ro-RO")
        ctx.route("**/*discord.com/**", lambda r: r.fulfill(status=204, body=""))
        ctx.route("https://play.rust-lang.org/**", lambda r: r.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps({"success": True, "stdout": "true false\n", "stderr": "   Compiling playground v0.0.1\n    Finished `dev` profile"})))
        return ctx.new_page()
    for kind, (w, h, mob) in {"desktop": (1280, 860, False), "mobile": (390, 844, True)}.items():
        pg = mk(w, h, mob)
        pg.goto(BASE + "#/"); pg.wait_for_selector(".ring")
        for l in (1, 2, 4, 7):
            pg.goto(BASE + f"#/quiz/lesson/l{l}"); pg.wait_for_selector("#qtext"); answer_all(pg, 12, wrong_at=(3, 7) if l == 4 else ())
        pg.goto(BASE + "#/lab/14/0"); pg.wait_for_selector("#ed")
        pg.evaluate("document.querySelector('#usesol').closest('details').open = true"); pg.click("#usesol"); pg.click("#run"); pg.wait_for_selector("#res .out")
        pg.screenshot(path=OUT + f"lab-{kind}.png")
        pg.goto(BASE + "#/"); pg.wait_for_selector(".ring"); pg.screenshot(path=OUT + f"home-{kind}.png")
        pg.goto(BASE + "#/quiz/quick/l4"); pg.wait_for_selector("#qtext"); pg.click(".opt >> nth=1"); pg.wait_for_selector(".exp"); pg.screenshot(path=OUT + f"quiz-{kind}.png")
        pg.goto(BASE + "#/games"); pg.wait_for_selector(".tile"); pg.screenshot(path=OUT + f"games-{kind}.png")
        pg.goto(BASE + "#/lesson/17"); pg.wait_for_selector(".code"); pg.screenshot(path=OUT + f"lesson-{kind}.png")
        if kind == "mobile":
            pg.goto(BASE + "#/game/pairs"); pg.wait_for_selector(".mc"); pg.click(".mc >> nth=0"); pg.click(".mc >> nth=1"); pg.screenshot(path=OUT + "game-pairs-mobile.png")
            pg.goto(BASE + "#/game/output"); pg.wait_for_selector(".opt"); pg.screenshot(path=OUT + "game-output-mobile.png")
            pg.goto(BASE + "#/exam"); pg.click("#goexam"); pg.wait_for_selector("#qtext"); pg.screenshot(path=OUT + "exam-mobile.png")
            pg.goto(BASE + "#/me"); pg.wait_for_selector(".kpi"); pg.screenshot(path=OUT + "me-mobile.png")
        else:
            pg.goto(BASE + "#/why"); pg.wait_for_selector(".hbar"); pg.screenshot(path=OUT + "why-desktop.png")
            pg.goto(BASE + "#/plan"); pg.wait_for_selector(".daycard"); pg.screenshot(path=OUT + "plan-desktop.png")
    b.close()
print("screenshots written to", OUT)
