"""End-to-end UI test (Playwright, Chromium). Discord is mocked; nothing is sent to any real webhook.
Run: python3 -m http.server 8811 --bind 127.0.0.1 &  then  python3 tests/ui.test.py [--live-playground]
With --live-playground the lab test really calls play.rust-lang.org/execute (public API)."""
import sys, json, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get("RUSTRO_URL", "http://127.0.0.1:8811/index.html")
LIVE = "--live-playground" in sys.argv
errs, discord = [], []
def ok(c, m):
    print(("PASS " if c else "FAIL ") + m)
    if not c: errs.append(m)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="ro-RO")
    ctx.route("**/*discord.com/**", lambda r: (discord.append(r.request.url), r.fulfill(status=204, body="")))
    if not LIVE: ctx.route("https://play.rust-lang.org/**", lambda r: r.fulfill(status=200, content_type="application/json", headers={"access-control-allow-origin": "*"}, body=json.dumps({"success": True, "exitDetail": "", "stdout": "true false\n", "stderr": ""})))
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.goto(BASE); pg.wait_for_selector(".ring")
    info = pg.evaluate("window.__rustro")
    ok(info["lessons"] >= 20 and info["bank"] >= 500 and info["games"] == 10, f"content counts {info}")
    # lesson quiz, all correct -> lesson done
    pg.goto(BASE + "#/quiz/lesson/l7"); pg.wait_for_selector("#qtext")
    for i in range(12):
        qid = pg.get_attribute("#qtext", "data-qid")
        a = pg.evaluate(f"window.RUST_BANK.find(q => q.id === {json.dumps(qid)}).a")
        pg.click(f'[data-opt="{a}"]'); pg.click("#qnext")
    pg.wait_for_selector(".score")
    ok("12/12" in pg.inner_text(".score"), "lesson 7 quiz 12/12")
    st = pg.evaluate("window.__rustro.state()")
    ok(st["done"].get("7") is True and st["xp"] >= 170, "lesson 7 marked done, XP awarded")
    # a wrong answer goes to mistakes, mistakes mode shows it
    pg.goto(BASE + "#/quiz/exercise/l8"); pg.wait_for_selector("#qtext")
    qid = pg.get_attribute("#qtext", "data-qid")
    a = pg.evaluate(f"window.RUST_BANK.find(q => q.id === {json.dumps(qid)}).a")
    wrong = pg.evaluate(f"[0,1,2,3].find(k => k !== {a} && document.querySelector('[data-opt=\"'+k+'\"]'))")
    pg.click(f'[data-opt="{wrong}"]'); pg.wait_for_selector(".exp.no")
    st = pg.evaluate("window.__rustro.state()")
    ok(qid in st["mist"], "wrong answer recorded in mistakes")
    pg.goto(BASE + "#/mistakes"); pg.wait_for_selector("#qtext")
    ok(pg.get_attribute("#qtext", "data-qid") == qid, "mistakes mode serves the missed question")
    # exam: answer 20 questions -> grade
    pg.goto(BASE + "#/exam"); pg.click("#goexam"); pg.wait_for_selector("#qtext")
    for i in range(20):
        pg.click('.opt >> nth=0')
    pg.wait_for_selector(".score")
    ok("Nota" in pg.inner_text(".score"), "exam shows a 1–10 grade")
    # marathon ends after 3 misses
    pg.goto(BASE + "#/quiz/marathon/l9"); pg.wait_for_selector("#qtext")
    for i in range(3):
        qid = pg.get_attribute("#qtext", "data-qid")
        a = pg.evaluate(f"window.RUST_BANK.find(q => q.id === {json.dumps(qid)}).a")
        w = pg.evaluate(f"[0,1,2,3].find(k => k !== {a} && document.querySelector('[data-opt=\"'+k+'\"]'))")
        pg.click(f'[data-opt="{w}"]'); pg.click("#qnext")
    pg.wait_for_selector(".score"); ok("🏃" in pg.inner_text(".score"), "marathon ends after 3 lives")
    # lab: put the solution in the editor and run
    pg.goto(BASE + "#/lab/14/0"); pg.wait_for_selector("#ed")
    pg.evaluate("document.querySelector('#usesol').closest('details').open = true"); pg.click("#usesol"); pg.click("#run")
    pg.wait_for_selector("#res .out", timeout=60000)
    ok("✅" in pg.inner_text("#res"), "lab 14 solution passes" + (" (live Playground)" if LIVE else " (mocked Playground)"))
    if LIVE:
        pg.click("#runt"); pg.wait_for_selector("#res .out", timeout=60000); pg.wait_for_function("document.querySelector('#res').innerText.includes('✅')", timeout=60000)
        ok(True, "lab 14 tests pass on the live Playground")
    # every game starts and fill/types can be answered
    for g in ["swipe", "light", "fall", "pairs", "order", "fill", "output", "errcode", "types"]:
        pg.goto(BASE + "#/game/" + g); pg.wait_for_timeout(250)
        ok(pg.locator("button").count() > 2, "game " + g + " renders")
    pg.goto(BASE + "#/game/types"); pg.click(".opt >> nth=0"); ok(pg.locator(".opt.right").count() == 1, "types game reveals the right type")
    # language switch + me page export
    pg.click('[data-lang="en"]'); pg.goto(BASE + "#/me"); pg.wait_for_selector("#mexp"); ok("Level" in pg.inner_text("#app"), "EN Me page")
    ok(len(discord) == 0, "no Discord requests without a configured webhook")
    ok(not [e for e in errs if e.startswith("pageerror")], "no JS errors")
    b.close()
print("ALL PASS" if not errs else f"{len(errs)} FAILED")
sys.exit(1 if errs else 0)
