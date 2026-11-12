"""Smoke test + real screenshots with Playwright (Chromium).
Run: python3 -m http.server 8811 --bind 127.0.0.1 &  then  python3 tools/screenshots.py
Discord is never contacted: every request to discord.com is intercepted and answered locally (mock)."""
import json, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8811/index.html"
OUT = "docs/screenshots/"
FAKE = "https://discord.com/api/webhooks/123456789012345678/" + "x" * 68
errors, discord_calls = [], []

def mock_discord(route):
    discord_calls.append(json.loads(route.request.post_data or "{}"))
    route.fulfill(status=204, body="")

with sync_playwright() as p:
    b = p.chromium.launch()
    def page(w, h, lang="ro", mobile=False):
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, locale="ro-RO" if lang == "ro" else "en-US")
        ctx.route("**/*discord.com/**", mock_discord)
        ctx.route("https://play.rust-lang.org/**", lambda r: r.abort())
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        return pg

    d = page(1280, 860)
    d.goto(BASE); d.wait_for_selector(".hero")
    # finish lesson 1 quiz with all correct answers via the UI to get real progress state
    d.goto(BASE + "#/quiz/1"); d.wait_for_selector(".opt")
    import re
    for i in range(6):
        ans = d.evaluate(f"window.RUST_LESSONS[0].quiz[{i}].a")
        d.click(f'[data-opt="{ans}"]'); d.click("#qnext")
    d.wait_for_selector(".score"); assert "6/6" in d.inner_text(".score")
    d.goto(BASE + "#/quiz/2"); d.wait_for_selector(".opt")
    for i in range(7):
        ans = d.evaluate(f"window.RUST_LESSONS[1].quiz[{i}].a")
        d.click(f'[data-opt="{(ans + (1 if i == 3 else 0)) % 4}"]'); d.click("#qnext")
    d.goto(BASE + "#/"); d.wait_for_selector(".hero"); d.screenshot(path=OUT + "home-desktop.png")
    d.goto(BASE + "#/lesson/4"); d.wait_for_selector(".code"); d.screenshot(path=OUT + "lesson-ownership.png")
    d.evaluate("document.querySelectorAll('details')[1].open = true")
    d.locator(".ex").first.scroll_into_view_if_needed(); d.screenshot(path=OUT + "lesson-exercise.png")
    d.goto(BASE + "#/quiz/4"); d.wait_for_selector(".opt"); d.click('[data-opt="0"]'); d.wait_for_selector(".exp"); d.screenshot(path=OUT + "quiz-feedback.png")
    d.goto(BASE + "#/why"); d.wait_for_selector(".hbar"); d.screenshot(path=OUT + "why-rust.png")
    d.add_style_tag(content=".nav{position:static}"); d.screenshot(path=OUT + "why-rust-full.png", full_page=True)
    d.goto(BASE + "#/net"); d.wait_for_selector(".card"); d.screenshot(path=OUT + "network-projects.png")
    d.goto(BASE + "#/convert"); d.wait_for_selector("#cout .code")
    d.click('[data-ex="py-class"]'); d.wait_for_timeout(200); d.screenshot(path=OUT + "converter.png")
    d.click('[data-ex="java-errors"]'); d.wait_for_timeout(200)
    assert "Result<i32, String>" in d.inner_text("#cout")
    # language toggle
    d.click('[data-lang="en"]'); d.goto(BASE + "#/"); d.wait_for_selector(".hero"); assert "Learn Rust" in d.inner_text(".hero"); d.screenshot(path=OUT + "home-en.png")
    d.goto(BASE + "#/final"); d.click("#gofinal"); d.wait_for_selector(".opt")
    for i in range(15):
        d.click('[data-opt="1"]'); d.click("#qnext")
    d.wait_for_selector(".score"); d.screenshot(path=OUT + "final-test-result.png")

    m = page(390, 844, mobile=True)
    m.goto(BASE); m.wait_for_selector(".hero"); m.screenshot(path=OUT + "home-mobile.png")
    m.goto(BASE + "#/lesson/5"); m.wait_for_selector(".code"); m.screenshot(path=OUT + "lesson-mobile.png")
    # Discord settings: validation + mocked test send
    m.goto(BASE + "#/settings"); m.wait_for_selector("#durl")
    m.fill("#durl", "https://example.com/not-a-webhook"); m.click("#dsave"); assert "Discord" in m.inner_text("#dstat")
    m.fill("#durl", FAKE); m.click("#dsave"); m.wait_for_selector("#dtest:not([disabled])")
    m.click("#dtest"); m.wait_for_function("document.querySelector('#dstat').textContent.includes('✅')")
    m.check('[data-dopt="quizzes"]')
    assert FAKE not in m.content(), "webhook URL must not be rendered in the page"
    m.evaluate("document.querySelector('svg.diagram').scrollIntoView({block:'start'})"); m.evaluate("window.scrollBy(0,-70)")
    m.screenshot(path=OUT + "discord-settings-mobile.png")
    m.add_style_tag(content=".nav{position:static}"); m.screenshot(path=OUT + "discord-settings-full.png", full_page=True)
    # opted-in quiz event goes to the (mocked) webhook
    m.goto(BASE + "#/quiz/3"); m.wait_for_selector(".opt")
    for i in range(6):
        m.click('[data-opt="1"]'); m.click("#qnext")
    m.wait_for_selector(".score"); m.wait_for_timeout(1500)
    b.close()

print("discord mock calls:", [c["embeds"][0]["title"] for c in discord_calls])
print("page errors:", errors or "none")
sys.exit(1 if errors or len(discord_calls) < 2 else 0)
