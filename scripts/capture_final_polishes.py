import time
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

def run():
    out_dir = Path("outputs/screenshots")
    art_dir = Path(r"C:\Users\Mugi\.gemini\antigravity\brain\0accef43-6a89-4581-ab6c-ea3dcbed65ab")
    art_shots_dir = art_dir / "screenshots"

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    if not Path(chrome_path).exists():
        chrome_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True
        )
        context = browser.new_context(viewport={"width": 1600, "height": 1050}, device_scale_factor=1.25)
        page = context.new_page()

        # 1. Deterministic Replay (Wait for full verification output)
        print("Capturing Deterministic Replay Result...")
        page.goto("http://localhost:3000/replay", wait_until="domcontentloaded", timeout=30000)
        time.sleep(2.5)

        r_sel = page.query_selector("select")
        if r_sel:
            r_options = r_sel.query_selector_all("option")
            for opt in r_options:
                val = opt.get_attribute("value")
                if val and "REALM_RUN" in val:
                    r_sel.select_option(val)
                    time.sleep(1.5)
                    break

        r_btn = page.query_selector("button:has-text('REPLAY & ASSERT DETERMINISM')") or page.query_selector("button:has-text('Execute Deterministic Replay')")
        if r_btn:
            r_btn.click()
            time.sleep(6) # Wait for backend replay execution and frontend card render

        p8 = out_dir / "08_deterministic_replay_studio.png"
        page.screenshot(path=str(p8))
        shutil.copy(p8, art_dir / "08_deterministic_replay_studio.png")
        shutil.copy(p8, art_shots_dir / "08_deterministic_replay_studio.png")
        print("  ✓ Saved 08_deterministic_replay_studio.png")

        # 2. Reconciliation Table View
        print("Capturing Reconciliation Table View...")
        page.goto("http://localhost:3000/reconciliation", wait_until="domcontentloaded", timeout=30000)
        time.sleep(2.5)
        page.evaluate("window.scrollTo(0, 950)")
        time.sleep(1.5)
        p3c = out_dir / "03c_reconciliation_table.png"
        page.screenshot(path=str(p3c))
        shutil.copy(p3c, art_dir / "03c_reconciliation_table.png")
        shutil.copy(p3c, art_shots_dir / "03c_reconciliation_table.png")
        print("  ✓ Saved 03c_reconciliation_table.png")

        browser.close()
        print("\n🎉 Polished Replay & Table Screenshots Captured!")

if __name__ == "__main__":
    run()
